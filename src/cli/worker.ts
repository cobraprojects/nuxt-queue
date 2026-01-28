import { defineCommand } from 'citty'
import { consola } from 'consola'
import { resolve } from 'pathe'
import { loadNuxtConfig } from '@nuxt/kit'
import { Worker, type Processor, type ConnectionOptions, type Job } from 'bullmq'
import { pathToFileURL } from 'node:url'
import Redis from 'ioredis'

interface JobEvent {
  jobId: string
  queueName: string
  jobName: string
  type: 'progress' | 'completed' | 'failed' | 'active' | 'waiting'
  data?: unknown
  progress?: number
  result?: unknown
  error?: string
  timestamp: number
}

async function publishJobEvent(redis: Redis, event: JobEvent): Promise<void> {
  try {
    const channel = `queue:${event.queueName}:job:${event.jobId}`
    await redis.publish(channel, JSON.stringify(event))
  }
  catch (error) {
    consola.debug('Failed to publish job event:', error)
  }
}

export default defineCommand({
  meta: {
    name: 'worker',
    description: 'Start queue workers',
  },
  args: {
    cwd: {
      type: 'string',
      description: 'Current working directory',
      default: '.',
    },
    queue: {
      type: 'string',
      description: 'Queue name to process (deprecated: use --queues for multiple)',
    },
    queues: {
      type: 'string',
      description: 'Comma-separated queue names to process in priority order (e.g., high,default,low)',
    },
    concurrency: {
      type: 'string',
      description: 'Number of concurrent jobs per worker',
      default: '5',
    },
    worker: {
      type: 'string',
      description: 'Path to custom worker script (optional)',
    },
  },
  async run({ args }) {
    const cwd = resolve(args.cwd)

    // Determine queue names - support both --queue and --queues
    let queueNames: string[]
    if (args.queues) {
      queueNames = args.queues.split(',').map(q => q.trim()).filter(Boolean)
    }
    else if (args.queue) {
      queueNames = [args.queue]
    }
    else {
      queueNames = ['default']
    }

    if (queueNames.length === 0) {
      consola.error('No queue names provided')
      process.exit(1)
    }

    consola.info('Loading Nuxt configuration...')

    try {
      // Load Nuxt config to get queue settings
      const nuxtConfig = await loadNuxtConfig({ cwd })
      const queueConfig = nuxtConfig.queue || {}
      const redisConfig = queueConfig.redis || {}

      const connection: ConnectionOptions = {
        host: redisConfig.host || process.env.NUXT_REDIS_HOST || '127.0.0.1',
        port: redisConfig.port || Number(process.env.NUXT_REDIS_PORT) || 6379,
        password: redisConfig.password || process.env.NUXT_REDIS_PASSWORD || undefined,
        username: redisConfig.username || process.env.NUXT_REDIS_USERNAME || undefined,
        db: redisConfig.db || Number(process.env.NUXT_REDIS_DB) || 0,
      }

      consola.info('Redis connection:', {
        host: connection.host,
        port: connection.port,
        db: connection.db,
      })

      // Create Redis publisher for events
      const publisher = new Redis({
        host: connection.host,
        port: connection.port,
        password: connection.password,
        username: connection.username,
        db: connection.db,
      })

      let processor: Processor
      const jobRegistry = new Map<string, {
        handle: (data: unknown, job: Job) => Promise<unknown>
        onCompleted?: (job: Job, result: unknown) => void | Promise<void>
        onFailed?: (job: Job | undefined, error: Error) => void | Promise<void>
      }>()

      // Load custom worker if provided
      if (args.worker) {
        const workerPath = resolve(cwd, args.worker)
        consola.info(`Loading custom worker from: ${workerPath}`)

        try {
          const workerModule = await import(pathToFileURL(workerPath).href)
          processor = workerModule.default || workerModule.processor

          if (!processor || typeof processor !== 'function') {
            throw new Error('Worker script must export a default function or a processor function')
          }
        }
        catch (error: unknown) {
          const err = error as Error
          consola.error(`Failed to load worker script: ${err.message}`)
          process.exit(1)
        }
      }
      else {
        // Try to load jobs from server/jobs directory
        const jobsDir = resolve(cwd, 'server/jobs')

        // Define a simple defineJob function for job files to use
        const defineJobFn = <T = unknown, R = unknown>(definition: {
          handle: (data: T, job: Job<T>) => Promise<R> | R
          queue?: string
          options?: Record<string, unknown>
          onCompleted?: (job: Job<T>, result: R) => void | Promise<void>
          onFailed?: (job: Job<T> | undefined, error: Error) => void | Promise<void>
        }) => definition

        // Make defineJob available globally for job files
        ;(globalThis as Record<string, unknown>).defineJob = defineJobFn

        /**
         * Recursively scan directory for job files
         */
        async function scanJobFiles(dir: string, baseDir: string): Promise<Array<{ path: string, name: string }>> {
          const results: Array<{ path: string, name: string }> = []

          try {
            const { readdirSync, statSync } = await import('node:fs')
            const { relative } = await import('pathe')
            const entries = readdirSync(dir)

            for (const entry of entries) {
              const fullPath = resolve(dir, entry)
              const stat = statSync(fullPath)

              if (stat.isDirectory()) {
                // Recursively scan subdirectories
                const subResults = await scanJobFiles(fullPath, baseDir)
                results.push(...subResults)
              }
              else if (stat.isFile()) {
                // Check if it's a valid job file
                if ((entry.endsWith('.ts') || entry.endsWith('.js') || entry.endsWith('.mjs'))
                  && !entry.endsWith('.d.ts')) {
                  // Get relative path from base directory and use it as job name
                  const relativePath = relative(baseDir, fullPath)
                  const jobName = relativePath.replace(/\.(ts|js|mjs)$/, '').replace(/\//g, '.')

                  results.push({
                    path: fullPath,
                    name: jobName,
                  })
                }
              }
            }
          }
          catch (error: unknown) {
            const err = error as Error
            consola.error(`Failed to scan directory ${dir}:`, err.message)
          }

          return results
        }

        try {
          const { existsSync } = await import('node:fs')

          if (existsSync(jobsDir)) {
            consola.info('Loading jobs from server/jobs/')
            const jobFiles = await scanJobFiles(jobsDir, jobsDir)

            consola.info(`📂 Found ${jobFiles.length} job file(s)`)

            for (const { path: filePath, name: jobName } of jobFiles) {
              try {
                const jobModule = await import(pathToFileURL(filePath).href)
                const jobDefinition = jobModule.default

                if (jobDefinition && typeof jobDefinition.handle === 'function') {
                  jobRegistry.set(jobName, jobDefinition)
                  consola.success(`✅ Loaded job: ${jobName}`)
                }
              }
              catch (error: unknown) {
                const err = error as Error
                consola.warn(`Failed to load job ${jobName}: ${err.message}`)
              }
            }
          }
        }
        catch (error: unknown) {
          const err = error as Error
          consola.debug(`Could not load jobs directory: ${err.message}`)
        }

        // Create processor that uses job registry
        processor = async (job) => {
          const jobDefinition = jobRegistry.get(job.name)

          if (jobDefinition) {
            consola.info(`Processing job ${job.id}: ${job.name} from queue: ${job.queueName}`)

            // Publish active event
            await publishJobEvent(publisher, {
              jobId: job.id!,
              queueName: job.queueName,
              jobName: job.name,
              type: 'active',
              timestamp: Date.now(),
            })

            // Wrap job.updateProgress to publish progress events
            const originalUpdateProgress = job.updateProgress.bind(job)
            job.updateProgress = async (progress: number | object) => {
              await originalUpdateProgress(progress)

              const progressValue = typeof progress === 'number' ? progress : 0
              await publishJobEvent(publisher, {
                jobId: job.id!,
                queueName: job.queueName,
                jobName: job.name,
                type: 'progress',
                progress: progressValue,
                timestamp: Date.now(),
              })
            }

            try {
              const result = await jobDefinition.handle(job.data, job)
              return result
            }
            catch (error: unknown) {
              const err = error as Error
              consola.error(`Job ${job.name} failed (attempt ${job.attemptsMade}/${job.opts.attempts || 1}):`, err.message)
              throw error
            }
          }
          else {
            // Fallback to default processor
            consola.info(`Processing job ${job.id}: ${job.name} from queue: ${job.queueName}`)
            consola.debug('Job data:', job.data)

            // Publish active event
            await publishJobEvent(publisher, {
              jobId: job.id!,
              queueName: job.queueName,
              jobName: job.name,
              type: 'active',
              timestamp: Date.now(),
            })

            return {
              processed: true,
              jobId: job.id,
              jobName: job.name,
              queueName: job.queueName,
              data: job.data,
              processedAt: new Date().toISOString(),
            }
          }
        }
      }

      // Start workers for each queue
      const workers: Worker[] = []

      if (queueNames.length === 1) {
        consola.start(`Starting worker for queue: ${queueNames[0]}`)
      }
      else {
        consola.start(`Starting worker for queues: ${queueNames.join(', ')} (priority order)`)
      }

      for (const queueName of queueNames) {
        const worker = new Worker(
          queueName,
          processor,
          {
            connection,
            concurrency: Number(args.concurrency),
          },
        )

        worker.on('completed', async (job) => {
          consola.success(`[${queueName}] Job ${job.id} completed`)

          // Publish completed event
          await publishJobEvent(publisher, {
            jobId: job.id!,
            queueName: job.queueName,
            jobName: job.name,
            type: 'completed',
            result: job.returnvalue,
            timestamp: Date.now(),
          })

          // Call job's onCompleted hook if defined
          const jobDefinition = jobRegistry.get(job.name)
          if (jobDefinition?.onCompleted) {
            try {
              await jobDefinition.onCompleted(job, job.returnvalue)
            }
            catch (error: unknown) {
              const err = error as Error
              consola.warn(`onCompleted hook failed for job ${job.name}:`, err.message)
            }
          }
        })

        worker.on('failed', async (job, err) => {
          consola.error(`[${queueName}] Job ${job?.id} failed:`, err.message)

          // Publish failed event
          if (job) {
            await publishJobEvent(publisher, {
              jobId: job.id!,
              queueName: job.queueName,
              jobName: job.name,
              type: 'failed',
              error: err.message,
              timestamp: Date.now(),
            })
          }

          // Call job's onFailed hook only after all retries are exhausted
          if (job) {
            const maxAttempts = job.opts.attempts || 1
            const isLastAttempt = job.attemptsMade >= maxAttempts

            if (isLastAttempt) {
              const jobDefinition = jobRegistry.get(job.name)
              if (jobDefinition?.onFailed) {
                try {
                  await jobDefinition.onFailed(job, err)
                }
                catch (error: unknown) {
                  const hookErr = error as Error
                  consola.warn(`onFailed hook failed for job ${job.name}:`, hookErr.message)
                }
              }
            }
          }
        })

        worker.on('error', (err) => {
          consola.error(`[${queueName}] Worker error:`, err)
        })

        workers.push(worker)
      }

      if (queueNames.length === 1) {
        consola.success(`Worker started for queue: ${queueNames[0]}`)
      }
      else {
        consola.success(`Workers started for ${queueNames.length} queues`)
        consola.info('Queue priority order:', queueNames.join(' > '))
      }
      consola.info('Waiting for jobs...')

      // Keep process alive and handle graceful shutdown
      const shutdown = async () => {
        consola.info('Shutting down workers...')
        await Promise.all(workers.map(w => w.close()))
        await publisher.quit()
        consola.success('All workers closed')
        process.exit(0)
      }

      process.on('SIGINT', shutdown)
      process.on('SIGTERM', shutdown)
    }
    catch (error) {
      consola.error('Failed to start worker:', error)
      process.exit(1)
    }
  },
})
