import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useQueueConnection, useQueue } from '../../src/runtime/server/utils/composables'
import { closeAll } from '../../src/runtime/server/utils/queue'

// Mock useRuntimeConfig
vi.mock('#imports', () => ({
  useRuntimeConfig: vi.fn(() => ({
    queue: {
      redis: {
        host: 'test-host',
        port: 1234,
        password: 'test-password',
        username: 'test-user',
        db: 5,
      },
    },
  })),
}))

describe('Server Composables', () => {
  afterEach(async () => {
    await closeAll()
  })

  describe('useQueueConnection', () => {
    it('should return connection config from runtime config', () => {
      const connection = useQueueConnection()

      expect(connection).toEqual({
        host: 'test-host',
        port: 1234,
        password: 'test-password',
        username: 'test-user',
        db: 5,
      })
    })

    it('should cache connection config', () => {
      const connection1 = useQueueConnection()
      const connection2 = useQueueConnection()

      expect(connection1).toBe(connection2)
    })
  })

  describe('useQueue', () => {
    it('should create a queue with default name', () => {
      const queue = useQueue()

      expect(queue).toBeDefined()
      expect(queue.name).toBe('default')
    })

    it('should create a queue with custom name', () => {
      const queue = useQueue('custom-queue')

      expect(queue).toBeDefined()
      expect(queue.name).toBe('custom-queue')
    })

    it('should return existing queue if already created', () => {
      const queue1 = useQueue('test-queue')
      const queue2 = useQueue('test-queue')

      expect(queue1).toBe(queue2)
    })

    it('should create different queues for different names', () => {
      const queue1 = useQueue('queue-1')
      const queue2 = useQueue('queue-2')

      expect(queue1).not.toBe(queue2)
      expect(queue1.name).toBe('queue-1')
      expect(queue2.name).toBe('queue-2')
    })
  })
})
