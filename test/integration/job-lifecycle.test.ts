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

describe('Job Lifecycle', () => {
  afterAll(async () => {
    await closeAll()
  })

  it('should create queue for lifecycle management', () => {
    const queue = createQueue({
      name: 'lifecycle-test',
      connection: { host: '127.0.0.1', port: 6379 },
    })

    expect(queue).toBeDefined()
    expect(queue.name).toBe('lifecycle-test')
  })

  it('should create worker for job processing', () => {
    const processor = vi.fn(async (job) => {
      return { processed: true }
    })

    const worker = createWorker({
      queueName: 'lifecycle-test',
      connection: { host: '127.0.0.1', port: 6379 },
      processor,
    })

    expect(worker).toBeDefined()
    expect(processor).toBeInstanceOf(Function)
  })
})
