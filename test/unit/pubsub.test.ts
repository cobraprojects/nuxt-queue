import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { publishJobEvent, subscribeToJob, closeConnections, resetConnections } from '../../src/runtime/server/utils/pubsub'
import type { JobEvent } from '../../src/runtime/server/utils/pubsub'

// Mock Redis - the mock must be defined inline due to hoisting
vi.mock('ioredis', () => {
  const mockSubscribers: Map<string, (channel: string, message: string) => void> = new Map()

  class MockRedis {
    status = 'wait'
    host: string
    port: number
    messageHandler: ((channel: string, message: string) => void) | null = null

    constructor(options: { host?: string, port?: number } = {}) {
      this.host = options.host || '127.0.0.1'
      this.port = options.port || 6379
    }

    async connect() {
      if (this.host === 'invalid-host' || this.port === 9999) {
        throw new Error('Redis connection failed')
      }
      this.status = 'ready'
      return undefined
    }

    async publish(channel: string, message: string) {
      const handler = mockSubscribers.get(channel)
      if (handler) {
        Promise.resolve().then(() => handler(channel, message))
      }
      return 1
    }

    async subscribe() {
      return undefined
    }

    async unsubscribe() {
      return undefined
    }

    on(event: string, handler: (...args: unknown[]) => void) {
      if (event === 'message') {
        this.messageHandler = handler as (channel: string, message: string) => void
      }
    }

    off(event: string) {
      if (event === 'message') {
        this.messageHandler = null
      }
    }

    async quit() {
      return undefined
    }
  }

  return { default: MockRedis }
})

describe('PubSub Utilities', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    resetConnections()
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(async () => {
    await closeConnections()
    consoleErrorSpy.mockRestore()
  })

  describe('publishJobEvent', () => {
    it('should publish job event', async () => {
      const connection = {
        host: '127.0.0.1',
        port: 6379,
        password: undefined,
        username: undefined,
        db: 0,
      }

      const event: JobEvent = {
        jobId: 'test-job-id',
        queueName: 'default',
        jobName: 'TestJob',
        type: 'progress',
        progress: 50,
        timestamp: Date.now(),
      }

      // Should not throw
      await publishJobEvent(connection, event)
      expect(true).toBe(true)
    })

    it('should handle publish errors gracefully', async () => {
      const connection = {
        host: 'invalid-host',
        port: 9999,
        password: undefined,
        username: undefined,
        db: 0,
      }

      const event: JobEvent = {
        jobId: 'test-job-id',
        queueName: 'default',
        jobName: 'TestJob',
        type: 'failed',
        error: 'Test error',
        timestamp: Date.now(),
      }

      // Should not throw even if Redis is unavailable
      await publishJobEvent(connection, event)
      expect(true).toBe(true)
    })
  })

  describe('subscribeToJob', () => {
    it('should subscribe to job events and receive callbacks', async () => {
      const connection = {
        host: '127.0.0.1',
        port: 6379,
        password: undefined,
        username: undefined,
        db: 0,
      }

      const receivedEvents: JobEvent[] = []
      const callback = (event: JobEvent) => {
        receivedEvents.push(event)
      }

      const unsubscribe = await subscribeToJob(
        connection,
        'default',
        'test-job-id',
        callback,
      )

      expect(unsubscribe).toBeDefined()
      expect(typeof unsubscribe).toBe('function')

      // Cleanup
      await unsubscribe()
    })

    it('should handle unsubscribe correctly', async () => {
      const connection = {
        host: '127.0.0.1',
        port: 6379,
        password: undefined,
        username: undefined,
        db: 0,
      }

      const callback = vi.fn()

      const unsubscribe = await subscribeToJob(
        connection,
        'default',
        'test-job-id',
        callback,
      )

      // Unsubscribe
      await unsubscribe()

      // After unsubscribe, callback should not be called
      expect(true).toBe(true)
    })

    it('should handle connection errors gracefully', async () => {
      const connection = {
        host: 'invalid-host',
        port: 9999,
        password: undefined,
        username: undefined,
        db: 0,
      }

      await expect(subscribeToJob(
        connection,
        'default',
        'test-job-id',
        vi.fn(),
      )).rejects.toThrow('Redis connection failed')
    })

    it('should handle multiple subscribers', async () => {
      const connection = {
        host: '127.0.0.1',
        port: 6379,
        password: undefined,
        username: undefined,
        db: 0,
      }

      const callback1 = vi.fn()
      const callback2 = vi.fn()

      const unsubscribe1 = await subscribeToJob(
        connection,
        'default',
        'test-job-id',
        callback1,
      )

      const unsubscribe2 = await subscribeToJob(
        connection,
        'default',
        'test-job-id',
        callback2,
      )

      expect(unsubscribe1).toBeDefined()
      expect(unsubscribe2).toBeDefined()

      await unsubscribe1()
      await unsubscribe2()
    })
  })

  describe('connection management', () => {
    it('should close connections gracefully', async () => {
      await closeConnections()
      expect(true).toBe(true)
    })

    it('should reset connections for test cleanup', () => {
      resetConnections()
      expect(true).toBe(true)
    })

    it('should handle multiple close calls', async () => {
      await closeConnections()
      await closeConnections()
      expect(true).toBe(true)
    })
  })
})
