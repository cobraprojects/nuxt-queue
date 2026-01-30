import { describe, it, expect, vi, beforeEach } from 'vitest'
import { dispatch } from '../../src/runtime/server/utils/dispatch'
import { registerJob } from '../../src/runtime/server/utils/jobRegistry'
import { defineJob } from '../../src/runtime/server/utils/defineJob'

// Mock $fetch
global.$fetch = vi.fn() as unknown as typeof $fetch

// Mock subscribeToJob
vi.mock('../../src/runtime/server/utils/pubsub', () => ({
  subscribeToJob: vi.fn().mockResolvedValue(async () => {}),
}))

// Mock useQueueConnection
vi.mock('../../src/runtime/server/utils/composables', () => ({
  useQueueConnection: vi.fn().mockReturnValue({
    host: '127.0.0.1',
    port: 6379,
  }),
}))

describe('dispatch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should dispatch a registered job', async () => {
    const job = defineJob({
      async handle(_data) {
        return { success: true }
      },
    })

    registerJob('TestJob', job)

    const mockFetch = $fetch as unknown as ReturnType<typeof vi.fn>
    mockFetch.mockResolvedValue({ jobId: '123' })

    const result = await dispatch('TestJob', { foo: 'bar' })

    expect(result.jobId).toBe('123')
    expect(result.queueName).toBe('default')
    expect(result.progress.value).toBe(0)
    expect(result.status.value).toBe('waiting')

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/queue/add',
      {
        method: 'POST',
        body: {
          queueName: 'default',
          jobName: 'TestJob',
          data: { foo: 'bar' },
          options: undefined,
        },
      },
    )
  })

  it('should throw error for unregistered job', async () => {
    await expect(
      dispatch('NonExistentJob', {}),
    ).rejects.toThrow('Job "NonExistentJob" is not registered')
  })

  it('should use custom queue from job definition', async () => {
    const job = defineJob({
      queue: 'emails',
      async handle(data) {
        return data
      },
    })

    registerJob('EmailJob', job)

    const mockFetch = $fetch as unknown as ReturnType<typeof vi.fn>
    mockFetch.mockResolvedValue({ jobId: '456' })

    const result = await dispatch('EmailJob', { to: 'test@example.com' })

    expect(result.jobId).toBe('456')
    expect(result.queueName).toBe('emails')
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/queue/add',
      expect.objectContaining({
        body: expect.objectContaining({
          queueName: 'emails',
        }),
      }),
    )
  })

  it('should use queue from dispatch options', async () => {
    const job = defineJob({
      async handle(data) {
        return data
      },
    })

    registerJob('TestJob', job)

    const mockFetch = $fetch as unknown as ReturnType<typeof vi.fn>
    mockFetch.mockResolvedValue({ jobId: '789' })

    const result = await dispatch('TestJob', { data: 'test' }, { queue: 'priority' })

    expect(result.jobId).toBe('789')
    expect(result.queueName).toBe('priority')
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/queue/add',
      expect.objectContaining({
        body: expect.objectContaining({
          queueName: 'priority',
        }),
      }),
    )
  })

  it('should merge job options with dispatch options', async () => {
    const job = defineJob({
      async handle(data) {
        return data
      },
      options: {
        attempts: 3,
        priority: 1,
      },
    })

    registerJob('TestJob', job)

    const mockFetch = $fetch as unknown as ReturnType<typeof vi.fn>
    mockFetch.mockResolvedValue({ jobId: '999' })

    const result = await dispatch('TestJob', { data: 'test' }, {
      delay: 5000,
      priority: 2, // Should override job definition
    })

    expect(result.jobId).toBe('999')
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/queue/add',
      {
        method: 'POST',
        body: {
          queueName: 'default',
          jobName: 'TestJob',
          data: { data: 'test' },
          options: {
            attempts: 3,
            priority: 2, // Dispatch options take precedence
            delay: 5000,
          },
        },
      },
    )
  })

  it('should handle job with no options', async () => {
    const job = defineJob({
      async handle(data) {
        return data
      },
    })

    registerJob('SimpleJob', job)

    const mockFetch = $fetch as unknown as ReturnType<typeof vi.fn>
    mockFetch.mockResolvedValue({ jobId: '111' })

    const result = await dispatch('SimpleJob', { test: true })

    expect(result.jobId).toBe('111')
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/queue/add',
      {
        method: 'POST',
        body: {
          queueName: 'default',
          jobName: 'SimpleJob',
          data: { test: true },
          options: undefined,
        },
      },
    )
  })
})
