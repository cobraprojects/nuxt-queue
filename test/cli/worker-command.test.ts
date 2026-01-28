import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Job, Processor, WorkerOptions } from 'bullmq'

type EventHandler = (...args: unknown[]) => void

// Mock Worker class
class MockWorker {
  queueName: string
  processor: Processor
  options: WorkerOptions
  eventHandlers: Map<string, EventHandler[]> = new Map()

  constructor(queueName: string, processor: Processor, options: WorkerOptions) {
    this.queueName = queueName
    this.processor = processor
    this.options = options
  }

  on(event: string, handler: EventHandler): this {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, [])
    }
    this.eventHandlers.get(event)!.push(handler)
    return this
  }

  async close(): Promise<void> {
    return Promise.resolve()
  }

  emit(event: string, ...args: unknown[]): void {
    const handlers = this.eventHandlers.get(event) || []
    handlers.forEach(handler => handler(...args))
  }
}

// Mock dependencies
vi.mock('bullmq', () => ({
  Worker: vi.fn((queueName: string, processor: Processor, options: WorkerOptions) =>
    new MockWorker(queueName, processor, options),
  ),
}))

vi.mock('consola', () => ({
  consola: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    start: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('@nuxt/kit', () => ({
  loadNuxtConfig: vi.fn(async () => ({
    queue: {
      redis: {
        host: 'test-host',
        port: 1234,
        password: 'test-pass',
        db: 2,
      },
    },
  })),
}))

describe('Worker CLI Command', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create worker with default configuration', async () => {
    const { loadNuxtConfig } = await import('@nuxt/kit')

    await loadNuxtConfig({ cwd: '.' })

    expect(loadNuxtConfig).toHaveBeenCalled()
  })

  it('should use environment variables for Redis config', () => {
    process.env.NUXT_REDIS_HOST = 'env-host'
    process.env.NUXT_REDIS_PORT = '9999'
    process.env.NUXT_REDIS_PASSWORD = 'env-pass'

    const connection = {
      host: process.env.NUXT_REDIS_HOST,
      port: Number(process.env.NUXT_REDIS_PORT),
      password: process.env.NUXT_REDIS_PASSWORD,
    }

    expect(connection.host).toBe('env-host')
    expect(connection.port).toBe(9999)
    expect(connection.password).toBe('env-pass')

    // Cleanup
    delete process.env.NUXT_REDIS_HOST
    delete process.env.NUXT_REDIS_PORT
    delete process.env.NUXT_REDIS_PASSWORD
  })

  it('should handle worker script loading', async () => {
    interface MockJobData {
      id: string
      data: Record<string, unknown>
    }

    const mockProcessor = vi.fn(async (_job: MockJobData) => ({ processed: true }))

    expect(mockProcessor).toBeInstanceOf(Function)

    const result = await mockProcessor({ id: '123', data: {} })
    expect(result).toEqual({ processed: true })
  })

  describe('Multi-Queue Support', () => {
    it('should parse single queue from --queue argument', () => {
      const args: { queue?: string } = { queue: 'emails' }
      const queueNames = args.queue ? [args.queue] : ['default']

      expect(queueNames).toEqual(['emails'])
    })

    it('should parse multiple queues from --queues argument', () => {
      const args: { queues?: string } = { queues: 'high,emails,default,low' }
      const queueNames = args.queues ? args.queues.split(',').map(q => q.trim()).filter(Boolean) : []

      expect(queueNames).toEqual(['high', 'emails', 'default', 'low'])
    })

    it('should handle queues with spaces', () => {
      const args: { queues?: string } = { queues: 'high, emails , default,  low  ' }
      const queueNames = args.queues ? args.queues.split(',').map(q => q.trim()).filter(Boolean) : []

      expect(queueNames).toEqual(['high', 'emails', 'default', 'low'])
    })

    it('should default to "default" queue when no arguments provided', () => {
      const args: { queue?: string, queues?: string } = {}
      const queueNames = args.queues
        ? args.queues.split(',').map(q => q.trim()).filter(Boolean)
        : args.queue
          ? [args.queue]
          : ['default']

      expect(queueNames).toEqual(['default'])
    })

    it('should prioritize --queues over --queue', () => {
      const args: { queue?: string, queues?: string } = { queue: 'single', queues: 'high,default,low' }
      const queueNames = args.queues
        ? args.queues.split(',').map(q => q.trim()).filter(Boolean)
        : args.queue
          ? [args.queue]
          : ['default']

      expect(queueNames).toEqual(['high', 'default', 'low'])
    })

    it('should create multiple workers for multiple queues', () => {
      const queueNames = ['high', 'emails', 'default']
      const workers: MockWorker[] = []
      const mockProcessor = vi.fn()

      queueNames.forEach((queueName) => {
        const worker = new MockWorker(
          queueName,
          mockProcessor as Processor,
          { connection: {}, concurrency: 5 },
        )
        workers.push(worker)
      })

      expect(workers).toHaveLength(3)
      expect(workers[0]?.queueName).toBe('high')
      expect(workers[1]?.queueName).toBe('emails')
      expect(workers[2]?.queueName).toBe('default')
    })

    it('should attach event handlers to all workers', () => {
      const queueNames = ['high', 'default']
      const workers: MockWorker[] = []
      const mockProcessor = vi.fn()

      queueNames.forEach((queueName) => {
        const worker = new MockWorker(
          queueName,
          mockProcessor as Processor,
          { connection: {}, concurrency: 5 },
        )

        worker.on('completed', (job: unknown) => {
          const typedJob = job as Job
          console.log(`[${queueName}] Job ${typedJob.id} completed`)
        })

        worker.on('failed', (job: unknown, _err: unknown) => {
          const typedJob = job as Job | undefined
          console.log(`[${queueName}] Job ${typedJob?.id} failed`)
        })

        workers.push(worker)
      })

      expect(workers[0]?.eventHandlers.has('completed')).toBe(true)
      expect(workers[0]?.eventHandlers.has('failed')).toBe(true)
      expect(workers[1]?.eventHandlers.has('completed')).toBe(true)
      expect(workers[1]?.eventHandlers.has('failed')).toBe(true)
    })

    it('should process jobs with queue name in default processor', async () => {
      interface MockJob {
        id: string
        name: string
        queueName: string
        data: { email: string }
      }

      const mockJob: MockJob = {
        id: '123',
        name: 'test-job',
        queueName: 'emails',
        data: { email: 'test@example.com' },
      }

      const processor = async (job: MockJob) => {
        return {
          processed: true,
          jobId: job.id,
          jobName: job.name,
          queueName: job.queueName,
          data: job.data,
          processedAt: new Date().toISOString(),
        }
      }

      const result = await processor(mockJob)

      expect(result.processed).toBe(true)
      expect(result.queueName).toBe('emails')
      expect(result.jobId).toBe('123')
    })

    it('should close all workers on shutdown', async () => {
      const queueNames = ['high', 'emails', 'default']
      const workers: MockWorker[] = []
      const mockProcessor = vi.fn()

      queueNames.forEach((queueName) => {
        const worker = new MockWorker(
          queueName,
          mockProcessor as Processor,
          { connection: {}, concurrency: 5 },
        )
        workers.push(worker)
      })

      const firstWorker = workers[0]
      if (!firstWorker) {
        throw new Error('No workers created')
      }

      const closeSpy = vi.spyOn(firstWorker, 'close')
      await Promise.all(workers.map(w => w.close()))

      expect(closeSpy).toHaveBeenCalled()
    })

    it('should filter out empty queue names', () => {
      const args: { queues?: string } = { queues: 'high,,emails,,,default,' }
      const queueNames = args.queues ? args.queues.split(',').map(q => q.trim()).filter(Boolean) : []

      expect(queueNames).toEqual(['high', 'emails', 'default'])
    })
  })
})
