import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Job } from 'bullmq'
import { defineJob } from '../../src/runtime/server/utils/defineJob'
import { registerJob, getAllJobs } from '../../src/runtime/server/utils/jobRegistry'
import { dispatch } from '../../src/runtime/server/utils/dispatch'
import * as composables from '../../src/runtime/server/utils/composables'

vi.mock('../../src/runtime/server/utils/composables', () => ({
  useQueue: vi.fn(),
  useQueueConnection: vi.fn(),
}))

describe('Laravel-style Jobs Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAllJobs().clear()
  })

  it('should complete full job lifecycle', async () => {
    // 1. Define a job
    const job = defineJob({
      queue: 'emails',
      async handle(data: { to: string }) {
        return {
          sent: true,
          recipient: data.to,
          timestamp: new Date().toISOString(),
        }
      },
      options: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
      async onCompleted(job, result) {
        console.log(`Email sent to ${result.recipient}`)
      },
      async onFailed(job, error) {
        console.error(`Failed to send email: ${error.message}`)
      },
    })

    // 2. Register the job
    registerJob('SendEmailJob', job)

    // 3. Mock queue
    const mockAdd = vi.fn().mockResolvedValue({ id: 'job-123' })
    vi.mocked(composables.useQueue).mockReturnValue({
      add: mockAdd,

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    // 4. Dispatch the job
    const result = await dispatch('SendEmailJob', {
      to: 'user@example.com',
    })

    // 5. Verify
    expect(result).toEqual({
      jobId: 'job-123',
      queueName: 'emails',
    })

    expect(composables.useQueue).toHaveBeenCalledWith('emails')
    expect(mockAdd).toHaveBeenCalledWith(
      'SendEmailJob',
      { to: 'user@example.com' },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    )
  })

  it('should handle multiple job types', async () => {
    // Define multiple jobs
    const emailJob = defineJob({
      queue: 'emails',
      async handle(_data: { to: string }) {
        return { sent: true }
      },
    })

    const imageJob = defineJob({
      queue: 'media',
      async handle(_data: { url: string }) {
        return { processed: true }
      },
    })

    const notificationJob = defineJob({
      async handle(_data: { userId: string }) {
        return { notified: true }
      },
    })

    // Register all jobs
    registerJob('SendEmailJob', emailJob)
    registerJob('ProcessImageJob', imageJob)
    registerJob('SendNotificationJob', notificationJob)

    // Verify all registered
    expect(getAllJobs().size).toBe(3)
    expect(getAllJobs().has('SendEmailJob')).toBe(true)
    expect(getAllJobs().has('ProcessImageJob')).toBe(true)
    expect(getAllJobs().has('SendNotificationJob')).toBe(true)
  })

  it('should handle job with progress updates', async () => {
    const progressUpdates: number[] = []

    const job = defineJob({
      async handle(data, job) {
        await job.updateProgress(25)
        progressUpdates.push(25)

        await job.updateProgress(50)
        progressUpdates.push(50)

        await job.updateProgress(100)
        progressUpdates.push(100)

        return { completed: true }
      },
    })

    registerJob('ProgressJob', job)

    const mockAdd = vi.fn().mockResolvedValue({ id: 'progress-job' })
    vi.mocked(composables.useQueue).mockReturnValue({

      add: mockAdd,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    // Simulate job execution
    const mockJob = {
      updateProgress: vi.fn().mockResolvedValue(undefined),
    }

    await job.handle({}, mockJob as unknown as Job)

    expect(mockJob.updateProgress).toHaveBeenCalledTimes(3)
    expect(mockJob.updateProgress).toHaveBeenNthCalledWith(1, 25)
    expect(mockJob.updateProgress).toHaveBeenNthCalledWith(2, 50)
    expect(mockJob.updateProgress).toHaveBeenNthCalledWith(3, 100)
  })

  it('should handle job failures with retry logic', async () => {
    const onFailedSpy = vi.fn()

    const job = defineJob({
      async handle(_data) {
        throw new Error('Processing failed')
      },
      options: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
      onFailed: onFailedSpy,
    })

    registerJob('FailingJob', job)

    const mockAdd = vi.fn().mockResolvedValue({ id: 'failing-job' })
    vi.mocked(composables.useQueue).mockReturnValue({
      add: mockAdd,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    await dispatch('FailingJob', { test: true })

    expect(mockAdd).toHaveBeenCalledWith(
      'FailingJob',
      { test: true },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    )
  })

  it('should support TypeScript type safety', async () => {
    interface EmailData {
      to: string
      subject: string
      body: string
    }

    interface EmailResult {
      messageId: string
      sent: boolean
    }

    const job = defineJob<EmailData, EmailResult>({
      async handle(_data) {
        // TypeScript ensures data has correct shape
        return {
          messageId: 'msg-123',
          sent: true,
        }
      },
    })

    registerJob('TypedEmailJob', job)

    const mockAdd = vi.fn().mockResolvedValue({ id: 'typed-job' })
    vi.mocked(composables.useQueue).mockReturnValue({
      add: mockAdd,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    await dispatch('TypedEmailJob', {
      to: 'user@example.com',
      subject: 'Test',
      body: 'Hello',
    })

    expect(mockAdd).toHaveBeenCalled()
  })
})
