import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Job } from 'bullmq'
import { defineJob } from '../../src/runtime/server/utils/defineJob'
import { registerJob, getAllJobs } from '../../src/runtime/server/utils/jobRegistry'
import { dispatch } from '../../src/runtime/server/utils/dispatch'

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

describe('File-Based Jobs Integration', () => {
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

    // 3. Mock $fetch
    const mockFetch = $fetch as unknown as ReturnType<typeof vi.fn>
    mockFetch.mockResolvedValue({ jobId: 'job-123' })

    // 4. Dispatch the job
    const result = await dispatch('SendEmailJob', {
      to: 'user@example.com',
    })

    // 5. Verify - dispatch now returns JobResponse with reactive refs
    expect(result.jobId).toBe('job-123')
    expect(result.queueName).toBe('emails')
    expect(result.progress.value).toBe(0)
    expect(result.status.value).toBe('waiting')

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/queue/add',
      {
        method: 'POST',
        body: {
          queueName: 'emails',
          jobName: 'SendEmailJob',
          data: { to: 'user@example.com' },
          options: {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
          },
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

    const mockFetch = $fetch as unknown as ReturnType<typeof vi.fn>
    mockFetch.mockResolvedValue({ jobId: 'progress-job' })

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

    const mockFetch = $fetch as unknown as ReturnType<typeof vi.fn>
    mockFetch.mockResolvedValue({ jobId: 'failing-job' })

    await dispatch('FailingJob', { test: true })

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/queue/add',
      {
        method: 'POST',
        body: {
          queueName: 'default',
          jobName: 'FailingJob',
          data: { test: true },
          options: {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 1000,
            },
          },
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

    const mockFetch = $fetch as unknown as ReturnType<typeof vi.fn>
    mockFetch.mockResolvedValue({ jobId: 'typed-job' })

    await dispatch('TypedEmailJob', {
      to: 'user@example.com',
      subject: 'Test',
      body: 'Hello',
    })

    expect(mockFetch).toHaveBeenCalled()
  })
})
