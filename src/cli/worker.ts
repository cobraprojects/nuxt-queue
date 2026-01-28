import { defineCommand } from 'citty'
import { consola } from 'consola'
import { resolve } from 'pathe'
import { loadNuxtConfig } from '@nuxt/kit'
import { Worker, type Processor, type ConnectionOptions } from 'bullmq'
import { pathToFileURL } from 'node:url'

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

      let processor: Processor

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
        // Default processor
        processor = async (job) => {
          consola.info(`Processing job ${job.id}: ${job.name} from queue: ${job.queueName}`)
          consola.debug('Job data:', job.data)

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

        worker.on('completed', (job) => {
          consola.success(`[${queueName}] Job ${job.id} completed`)
        })

        worker.on('failed', (job, err) => {
          consola.error(`[${queueName}] Job ${job?.id} failed:`, err.message)
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
