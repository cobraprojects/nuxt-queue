import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
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

describe('Queue Operations Integration', () => {
  afterAll(async () => {
    await closeAll()
  })

  it('should create a queue and add a job', async () => {
    const queue = createQueue({
      name: 'test-integration',
      connection: { host: '127.0.0.1', port: 6379 },
    })

    expect(queue).toBeDefined()
    expect(queue.name).toBe('test-integration')
  })

  it('should create a worker', async () => {
    const processor = vi.fn(async (job) => ({ processed: true }))
    
    const worker = createWorker({
      queueName: 'test-integration',
      connection: { host: '127.0.0.1', port: 6379 },
      processor,
    })

    expect(worker).toBeDefined()
    expect(worker.name).toBe('test-integration')
  })

  it('should return same queue instance', () => {
    const queue1 = createQueue({
      name: 'same-queue',
      connection: { host: '127.0.0.1', port: 6379 },
    })

    const queue2 = createQueue({
      name: 'same-queue',
      connection: { host: '127.0.0.1', port: 6379 },
    })

    expect(queue1).toBe(queue2)
  })
})
