import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'
import { useQueueConnection, useServerQueue } from '../../src/runtime/server/utils/composables'
import { closeAll } from '../../src/runtime/server/utils/queue'

// Mock useRuntimeConfig with localhost for unit tests
vi.mock('#imports', () => ({
  useRuntimeConfig: vi.fn(() => ({
    queue: {
      redis: {
        host: '127.0.0.1',
        port: 6379,
        password: undefined,
        username: undefined,
        db: 0,
      },
    },
  })),
}))

describe('Server Composables', () => {
  beforeEach(() => {
    // Reset connection cache before each test
    vi.clearAllMocks()
  })

  afterEach(async () => {
    await closeAll()
  })

  describe('useQueueConnection', () => {
    it('should return connection config from runtime config', () => {
      const connection = useQueueConnection()

      expect(connection).toMatchObject({
        host: '127.0.0.1',
        port: 6379,
        db: 0,
      })
      // Connection timeout settings should be present
      expect(connection).toHaveProperty('connectTimeout')
      expect(connection).toHaveProperty('maxRetriesPerRequest')
      expect(connection).toHaveProperty('lazyConnect')
    })

    it('should cache connection config', () => {
      const connection1 = useQueueConnection()
      const connection2 = useQueueConnection()

      expect(connection1).toBe(connection2)
    })
  })

  describe('useServerQueue', () => {
    it('should create a queue with default name', async () => {
      const queue = useServerQueue()

      expect(queue).toBeDefined()
      expect(queue.name).toBe('default')

      // Suppress connection errors in tests
      const client = await queue.client
      client.on('error', () => {})
    })

    it('should create a queue with custom name', async () => {
      const queue = useServerQueue('custom-queue')

      expect(queue).toBeDefined()
      expect(queue.name).toBe('custom-queue')

      // Suppress connection errors in tests
      const client = await queue.client
      client.on('error', () => {})
    })

    it('should return existing queue if already created', async () => {
      const queue1 = useServerQueue('test-queue')
      const queue2 = useServerQueue('test-queue')

      expect(queue1).toBe(queue2)

      // Suppress connection errors in tests
      const client = await queue1.client
      client.on('error', () => {})
    })

    it('should create different queues for different names', async () => {
      const queue1 = useServerQueue('queue-1')
      const queue2 = useServerQueue('queue-2')

      expect(queue1).not.toBe(queue2)
      expect(queue1.name).toBe('queue-1')
      expect(queue2.name).toBe('queue-2')

      // Suppress connection errors in tests
      const client1 = await queue1.client
      const client2 = await queue2.client
      client1.on('error', () => {})
      client2.on('error', () => {})
    })
  })
})
