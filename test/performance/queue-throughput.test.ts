import { describe, it, expect, afterAll, vi } from 'vitest'
import { createQueue, createWorker, closeAll } from '../../src/runtime/server/utils/queue'

vi.mock('#imports', () => ({
  useRuntimeConfig: vi.fn(() => ({
    queue: {
      redis: {
        host: '127.0.0.1',
        port: 6379,
        db: 0,
      },
    },
  })),
}))

describe('Queue Performance', () => {
  afterAll(async () => {
    await closeAll()
  })

  it('should create queue with concurrency options', () => {
    const queue = createQueue({
      name: 'performance-test',
      connection: { host: '127.0.0.1', port: 6379 },
    })

    const processor = vi.fn(async (job) => ({ processed: true }))
    
    const worker = createWorker({
      queueName: 'performance-test',
      connection: { host: '127.0.0.1', port: 6379 },
      processor,
      options: { concurrency: 10 },
    })

    expect(queue).toBeDefined()
    expect(worker).toBeDefined()
  })

  it('should handle batch job creation', () => {
    const queue = createQueue({
      name: 'batch-test',
      connection: { host: '127.0.0.1', port: 6379 },
    })

    expect(queue).toBeDefined()
    expect(queue.name).toBe('batch-test')
  })
})
