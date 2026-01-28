import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useQueue } from '../../src/runtime/composables/useQueue'

// Mock $fetch
const mockFetch = vi.fn()
global.$fetch = mockFetch as any

describe('Client useQueue Composable', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  describe('useQueue', () => {
    it('should create queue instance with default name', () => {
      const queue = useQueue()
      expect(queue).toBeDefined()
      expect(queue.add).toBeInstanceOf(Function)
    })

    it('should create queue instance with custom name', () => {
      const queue = useQueue('custom-queue')
      expect(queue).toBeDefined()
    })

    it('should call API endpoint when adding job', async () => {
      mockFetch.mockResolvedValue({ jobId: '123' })

      const queue = useQueue('test-queue')
      await queue.add('test-job', { foo: 'bar' })

      expect(mockFetch).toHaveBeenCalledWith('/api/queue/add', {
        method: 'POST',
        body: {
          queueName: 'test-queue',
          jobName: 'test-job',
          data: { foo: 'bar' },
          options: undefined,
        },
      })
    })

    it('should pass options when adding job', async () => {
      mockFetch.mockResolvedValue({ jobId: '123' })

      const queue = useQueue('test-queue')
      const options = { delay: 5000, priority: 1 }
      await queue.add('test-job', { foo: 'bar' }, options)

      expect(mockFetch).toHaveBeenCalledWith('/api/queue/add', {
        method: 'POST',
        body: {
          queueName: 'test-queue',
          jobName: 'test-job',
          data: { foo: 'bar' },
          options,
        },
      })
    })

    it('should use default queue name when not specified', async () => {
      mockFetch.mockResolvedValue({ jobId: '123' })

      const queue = useQueue()
      await queue.add('test-job', { data: 'value' })

      expect(mockFetch).toHaveBeenCalledWith('/api/queue/add', {
        method: 'POST',
        body: {
          queueName: 'default',
          jobName: 'test-job',
          data: { data: 'value' },
          options: undefined,
        },
      })
    })
  })
})
