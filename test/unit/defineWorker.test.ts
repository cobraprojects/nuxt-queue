import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { defineWorker } from '../../src/runtime/server/utils/defineWorker'
import type { Job } from 'bullmq'

// Mock the composables
vi.mock('../../src/runtime/server/utils/composables', () => ({
  useQueueConnection: vi.fn(() => ({
    host: '127.0.0.1',
    port: 6379,
  })),
}))

// Mock the queue utilities
vi.mock('../../src/runtime/server/utils/queue', () => ({
  createWorker: vi.fn(() => {
    const eventHandlers = new Map<string, ((...args: unknown[]) => void | Promise<void>)>()

    return {
      on: vi.fn((event: string, handler: (...args: unknown[]) => void | Promise<void>) => {
        eventHandlers.set(event, handler)
      }),
      _trigger: (event: string, ...args: unknown[]) => {
        const handler = eventHandlers.get(event)
        if (handler) handler(...args)
      },
      close: vi.fn(),
    }
  }),
  closeAll: vi.fn(async () => {}),
}))

describe('defineWorker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(async () => {
    const { closeAll } = await import('../../src/runtime/server/utils/queue')
    await closeAll()
  })

  it('should create a worker with default queue name', () => {
    const processor = vi.fn(async (_job: Job) => ({ success: true }))

    const workerFactory = defineWorker({
      processor,
    })

    const worker = workerFactory()
    expect(worker).toBeDefined()
  })

  it('should create a worker with custom queue name', () => {
    const processor = vi.fn(async (_job: Job) => ({ success: true }))

    const workerFactory = defineWorker({
      queueName: 'emails',
      processor,
    })

    const worker = workerFactory()
    expect(worker).toBeDefined()
  })

  it('should register onCompleted handler', async () => {
    const processor = vi.fn(async (_job: Job) => ({ success: true }))
    const onCompleted = vi.fn()

    const workerFactory = defineWorker({
      processor,
      onCompleted,
    })

    const worker = workerFactory() as unknown as { _trigger: (event: string, ...args: unknown[]) => void }

    // Simulate job completion
    const mockJob = { id: '1', data: { test: 'data' } } as Job
    const result = { success: true }
    worker._trigger('completed', mockJob, result)

    expect(onCompleted).toHaveBeenCalledWith(mockJob, result)
  })

  it('should register onFailed handler', async () => {
    const processor = vi.fn(async (_job: Job) => {
      throw new Error('Processing failed')
    })
    const onFailed = vi.fn()

    const workerFactory = defineWorker({
      processor,
      onFailed,
    })

    const worker = workerFactory() as unknown as { _trigger: (event: string, ...args: unknown[]) => void }

    // Simulate job failure
    const mockJob = { id: '1', data: { test: 'data' } } as Job
    const error = new Error('Processing failed')
    worker._trigger('failed', mockJob, error)

    expect(onFailed).toHaveBeenCalledWith(mockJob, error)
  })

  it('should register onProgress handler', async () => {
    const processor = vi.fn(async (job: Job) => {
      await job.updateProgress(50)
      return { success: true }
    })
    const onProgress = vi.fn()

    const workerFactory = defineWorker({
      processor,
      onProgress,
    })

    const worker = workerFactory() as unknown as { _trigger: (event: string, ...args: unknown[]) => void }

    // Simulate progress update
    const mockJob = { id: '1', data: { test: 'data' } } as Job
    const progress = 50
    worker._trigger('progress', mockJob, progress)

    expect(onProgress).toHaveBeenCalledWith(mockJob, progress)
  })

  it('should register all event handlers', async () => {
    const processor = vi.fn(async (_job: Job) => ({ success: true }))
    const onCompleted = vi.fn()
    const onFailed = vi.fn()
    const onProgress = vi.fn()

    const workerFactory = defineWorker({
      queueName: 'test-queue',
      processor,
      onCompleted,
      onFailed,
      onProgress,
    })

    const worker = workerFactory() as unknown as { on: ReturnType<typeof vi.fn> }

    // Verify all handlers are registered
    expect(worker.on).toHaveBeenCalledWith('completed', onCompleted)
    expect(worker.on).toHaveBeenCalledWith('failed', onFailed)
    expect(worker.on).toHaveBeenCalledWith('progress', onProgress)
  })

  it('should pass worker options', () => {
    const processor = vi.fn(async (_job: Job) => ({ success: true }))

    const workerFactory = defineWorker({
      processor,
      options: {
        concurrency: 10,
      },
    })

    const worker = workerFactory()
    expect(worker).toBeDefined()
  })

  it('should handle async event handlers', async () => {
    const processor = vi.fn(async (_job: Job) => ({ success: true }))
    const onCompleted = vi.fn(async (_job: Job, _result: { success: boolean }) => {
      await new Promise(resolve => setTimeout(resolve, 10))
    })

    const workerFactory = defineWorker({
      processor,
      onCompleted,
    })

    const worker = workerFactory() as unknown as { _trigger: (event: string, ...args: unknown[]) => void }

    const mockJob = { id: '1', data: { test: 'data' } } as Job
    const result = { success: true }

    await worker._trigger('completed', mockJob, result)
    expect(onCompleted).toHaveBeenCalledWith(mockJob, result)
  })
})
