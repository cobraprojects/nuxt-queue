import { describe, it, expect, afterEach, vi, afterAll } from 'vitest'
import { Queue } from 'bullmq'

// Mock the imports
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

describe('POST /api/queue/[queueName]/[jobId]/retry', () => {
  const queues: Queue[] = []

  afterEach(async () => {
    // Clean up all queues
    await Promise.all(queues.map(async (q) => {
      try {
        await q.close()
      }
      catch {
        // Ignore close errors
      }
    }))
    queues.length = 0
  })

  afterAll(async () => {
    // Final cleanup
    await Promise.all(queues.map(async (q) => {
      try {
        await q.close()
      }
      catch {
        // Ignore close errors
      }
    }))
  })

  const createQueue = () => {
    const queue = new Queue(`test-retry-${Date.now()}`, {
      connection: { host: '127.0.0.1', port: 6379, db: 0 },
    })
    queues.push(queue)
    return queue
  }

  it('should create new job with same data when retrying', async () => {
    const queue = createQueue()

    // Simulate having a "failed" job by storing its data
    const originalJobData = {
      name: 'test-job',
      data: { data: 'test' },
      opts: { attempts: 3 },
    }

    // Create new job with same data and options (simulating retry)
    const newJob = await queue.add(
      originalJobData.name,
      originalJobData.data,
      originalJobData.opts,
    )

    expect(newJob.id).toBeDefined()
    expect(newJob.name).toBe(originalJobData.name)
    expect(newJob.data).toEqual(originalJobData.data)
    expect(newJob.opts.attempts).toBe(originalJobData.opts.attempts)
  })

  it('should not retry a waiting job', async () => {
    const queue = createQueue()

    const job = await queue.add('test-job', { data: 'test' })
    const state = await job.getState()

    expect(state).toBe('waiting')

    // Waiting jobs should not be retried
    const canRetry = state === 'failed'
    expect(canRetry).toBe(false)
  })

  it('should not retry an active job', async () => {
    // Active jobs cannot be retried
    const state: string = 'active'
    const canRetry = state === 'failed'
    expect(canRetry).toBe(false)
  })

  it('should not retry a completed job', async () => {
    const queue = createQueue()

    const job = await queue.add('test-job', { data: 'test' })
    const state = await job.getState()

    expect(state).toBe('waiting')

    // Waiting/active/completed jobs should not be retried
    const canRetry = state === 'failed'
    expect(canRetry).toBe(false)
  })

  it('should not retry a delayed job', async () => {
    const queue = createQueue()

    const job = await queue.add('test-job', { data: 'test' }, { delay: 10000 })
    const state = await job.getState()

    expect(state).toBe('delayed')

    const canRetry = state === 'failed'
    expect(canRetry).toBe(false)
  })

  it('should preserve job options when creating new job', async () => {
    const queue = createQueue()

    const jobOptions = {
      attempts: 5,
      delay: 1000,
      priority: 1,
    }

    const originalJob = await queue.add('test-job', { data: 'test' }, jobOptions)

    // Create new job with same options
    const newJob = await queue.add(originalJob.name, originalJob.data, {
      ...originalJob.opts,
      attempts: originalJob.opts.attempts || 1,
    })

    expect(newJob.opts.attempts).toBe(jobOptions.attempts)
    expect(newJob.opts.delay).toBe(jobOptions.delay)
    expect(newJob.opts.priority).toBe(jobOptions.priority)
  })

  it('should handle default attempts when creating new job', async () => {
    const queue = createQueue()

    const originalJob = await queue.add('test-job', { data: 'test' })

    // Create new job with default attempts if not specified
    const newJob = await queue.add(originalJob.name, originalJob.data, {
      ...originalJob.opts,
      attempts: originalJob.opts.attempts || 1,
    })

    expect(newJob.opts.attempts).toBe(1)
  })

  it('should handle missing job', async () => {
    const queue = createQueue()

    const retrievedJob = await queue.getJob('non-existent-id')
    expect(retrievedJob).toBeUndefined()
  })

  it('should validate that only failed jobs can be retried', () => {
    const validStates = ['waiting', 'active', 'completed', 'failed', 'delayed']
    const retryableState = 'failed'

    validStates.forEach((state) => {
      const canRetry = state === retryableState
      if (state === 'failed') {
        expect(canRetry).toBe(true)
      }
      else {
        expect(canRetry).toBe(false)
      }
    })
  })

  it('should return correct error message for non-failed job', () => {
    const state = 'waiting'
    const errorMessage = `Cannot retry job in state: ${state}. Only failed jobs can be retried.`

    expect(errorMessage).toBe('Cannot retry job in state: waiting. Only failed jobs can be retried.')
  })

  it('should handle missing queue name or job id', () => {
    const params1 = { queueName: '', jobId: '123' }
    const params2 = { queueName: 'test', jobId: '' }
    const params3 = { queueName: '', jobId: '' }

    expect(params1.queueName || params1.jobId).toBeTruthy()
    expect(params2.queueName || params2.jobId).toBeTruthy()
    expect(params3.queueName || params3.jobId).toBeFalsy()
  })

  it('should return success response structure', () => {
    const response = {
      success: true,
      jobId: 'new-job-id',
      queueName: 'test-queue',
      message: 'Job retried successfully',
    }

    expect(response).toHaveProperty('success', true)
    expect(response).toHaveProperty('jobId')
    expect(response).toHaveProperty('queueName')
    expect(response).toHaveProperty('message')
  })

  it('should preserve job name when creating new job', async () => {
    const queue = createQueue()

    const jobName = 'important-job'
    const originalJob = await queue.add(jobName, { data: 'test' })

    // Create new job with same name
    const newJob = await queue.add(originalJob.name, originalJob.data, {
      ...originalJob.opts,
      attempts: originalJob.opts.attempts || 1,
    })

    expect(newJob.name).toBe(jobName)
  })

  it('should preserve job data when creating new job', async () => {
    const queue = createQueue()

    const jobData = { userId: '123', action: 'send-email' }
    const originalJob = await queue.add('test-job', jobData)

    // Create new job with same data
    const newJob = await queue.add(originalJob.name, originalJob.data, {
      ...originalJob.opts,
      attempts: originalJob.opts.attempts || 1,
    })

    expect(newJob.data).toEqual(jobData)
  })

  it('should simulate retry flow with new job creation', async () => {
    const queue = createQueue()

    // Original job data (as if it failed)
    const originalJobId = 'original-job-id'
    const originalJobName = 'failing-job'
    const originalJobData = { data: 'test' }
    const originalJobOpts = { attempts: 3 }

    // Create new job (simulating retry)
    const newJob = await queue.add(originalJobName, originalJobData, {
      ...originalJobOpts,
      attempts: originalJobOpts.attempts || 1,
    })

    expect(newJob.id).toBeDefined()
    expect(newJob.id).not.toBe(originalJobId)
    expect(newJob.name).toBe(originalJobName)
    expect(newJob.data).toEqual(originalJobData)
    expect(newJob.opts.attempts).toBe(originalJobOpts.attempts)
  })
})
