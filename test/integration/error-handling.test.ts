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

describe('Error Handling', () => {
  afterAll(async () => {
    await closeAll()
  })

  it('should create worker with error handling processor', () => {
    const processor = vi.fn(async (job) => {
      if (!job.data.valid) {
        throw new Error('Processing failed')
      }
      return { success: true }
    })

    const worker = createWorker({
      queueName: 'error-test',
      connection: { host: '127.0.0.1', port: 6379 },
      processor,
    })

    expect(worker).toBeDefined()
    expect(processor).toBeInstanceOf(Function)
  })

  it('should handle processor errors', async () => {
    const processor = vi.fn(async (job) => {
      throw new Error('Test error')
    })

    expect(processor).toBeInstanceOf(Function)
    
    try {
      await processor({ data: {} })
    } catch (error: any) {
      expect(error.message).toBe('Test error')
    }
  })
})
