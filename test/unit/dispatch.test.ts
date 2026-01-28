import { describe, it, expect, vi, beforeEach } from 'vitest'
import { dispatch } from '../../src/runtime/server/utils/dispatch'
import { registerJob } from '../../src/runtime/server/utils/jobRegistry'
import { defineJob } from '../../src/runtime/server/utils/defineJob'
import * as composables from '../../src/runtime/server/utils/composables'

// Mock useQueue
vi.mock('../../src/runtime/server/utils/composables', () => ({
  useQueue: vi.fn(),
  useQueueConnection: vi.fn(),
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

    const mockAdd = vi.fn().mockResolvedValue({ id: '123' })
    vi.mocked(composables.useQueue).mockReturnValue({
      add: mockAdd,

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const result = await dispatch('TestJob', { foo: 'bar' })

    expect(result).toEqual({
      jobId: '123',
      queueName: 'default',
    })

    expect(mockAdd).toHaveBeenCalledWith(
      'TestJob',
      { foo: 'bar' },
      undefined,
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

    const mockAdd = vi.fn().mockResolvedValue({ id: '456' })
    vi.mocked(composables.useQueue).mockReturnValue({

      add: mockAdd,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const result = await dispatch('EmailJob', { to: 'test@example.com' })

    expect(result.queueName).toBe('emails')
    expect(composables.useQueue).toHaveBeenCalledWith('emails')
  })

  it('should use queue from dispatch options', async () => {
    const job = defineJob({
      async handle(data) {
        return data
      },
    })

    registerJob('TestJob', job)

    const mockAdd = vi.fn().mockResolvedValue({ id: '789' })

    vi.mocked(composables.useQueue).mockReturnValue({
      add: mockAdd,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const result = await dispatch('TestJob', { data: 'test' }, { queue: 'priority' })

    expect(result.queueName).toBe('priority')
    expect(composables.useQueue).toHaveBeenCalledWith('priority')
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

    const mockAdd = vi.fn().mockResolvedValue({ id: '999' })
    vi.mocked(composables.useQueue).mockReturnValue({
      add: mockAdd,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    await dispatch('TestJob', { data: 'test' }, {
      delay: 5000,
      priority: 2, // Should override job definition
    })

    expect(mockAdd).toHaveBeenCalledWith(
      'TestJob',
      { data: 'test' },
      {
        attempts: 3,
        priority: 2, // Dispatch options take precedence
        delay: 5000,
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

    const mockAdd = vi.fn().mockResolvedValue({ id: '111' })
    vi.mocked(composables.useQueue).mockReturnValue({
      add: mockAdd,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    await dispatch('SimpleJob', { test: true })

    expect(mockAdd).toHaveBeenCalledWith(
      'SimpleJob',
      { test: true },
      undefined,
    )
  })
})
