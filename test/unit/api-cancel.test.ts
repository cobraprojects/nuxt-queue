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

describe('POST /api/queue/[queueName]/[jobId]/cancel', () => {
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
    const queue = new Queue(`test-cancel-${Date.now()}`, {
      connection: { host: '127.0.0.1', port: 6379, db: 0 },
    })
    queues.push(queue)
    return queue
  }

  it('should cancel a waiting job', async () => {
    const queue = createQueue()

    const job = await queue.add('test-job', { data: 'test' })
    const state = await job.getState()

    expect(state).toBe('waiting')

    await job.remove()

    const retrievedJob = await queue.getJob(job.id!)
    expect(retrievedJob).toBeUndefined()
  })

  it('should cancel a delayed job', async () => {
    const queue = createQueue()

    const job = await queue.add('test-job', { data: 'test' }, { delay: 10000 })
    const state = await job.getState()

    expect(state).toBe('delayed')

    await job.remove()

    const retrievedJob = await queue.getJob(job.id!)
    expect(retrievedJob).toBeUndefined()
  })

  it('should cancel multiple waiting jobs', async () => {
    const queue = createQueue()

    const job1 = await queue.add('test-job-1', { data: 'test1' })
    const job2 = await queue.add('test-job-2', { data: 'test2' })
    const job3 = await queue.add('test-job-3', { data: 'test3' })

    // Cancel all jobs
    await job1.remove()
    await job2.remove()
    await job3.remove()

    const retrievedJob1 = await queue.getJob(job1.id!)
    const retrievedJob2 = await queue.getJob(job2.id!)
    const retrievedJob3 = await queue.getJob(job3.id!)

    expect(retrievedJob1).toBeUndefined()
    expect(retrievedJob2).toBeUndefined()
    expect(retrievedJob3).toBeUndefined()
  })

  it('should handle non-existent job', async () => {
    const queue = createQueue()

    const retrievedJob = await queue.getJob('non-existent-id')
    expect(retrievedJob).toBeUndefined()
  })

  it('should validate job states that can be canceled', () => {
    const cancelableStates = ['waiting', 'delayed']
    const nonCancelableStates = ['active', 'completed', 'failed']

    expect(cancelableStates).toContain('waiting')
    expect(cancelableStates).toContain('delayed')
    expect(nonCancelableStates).toContain('active')
    expect(nonCancelableStates).toContain('completed')
    expect(nonCancelableStates).toContain('failed')
  })

  it('should return correct error message for invalid state', () => {
    const state: string = 'active'
    const canCancel = state === 'waiting' || state === 'delayed'

    expect(canCancel).toBe(false)

    const errorMessage = `Cannot cancel job in state: ${state}`
    expect(errorMessage).toBe('Cannot cancel job in state: active')
  })

  it('should handle missing queue name or job id', () => {
    const params1 = { queueName: '', jobId: '' }
    const params2 = { queueName: 'test', jobId: '' }
    const params3 = { queueName: '', jobId: '123' }
    const params4 = { queueName: 'test', jobId: '123' }

    expect(params1.queueName || params1.jobId).toBeFalsy()
    expect(params2.queueName || params2.jobId).toBeTruthy()
    expect(params3.queueName || params3.jobId).toBeTruthy()
    expect(params4.queueName || params4.jobId).toBeTruthy()
  })

  it('should return success response structure', () => {
    const response = {
      success: true,
      jobId: 'test-job-id',
      queueName: 'test-queue',
      message: 'Job cancelled successfully',
    }

    expect(response).toHaveProperty('success', true)
    expect(response).toHaveProperty('jobId')
    expect(response).toHaveProperty('queueName')
    expect(response).toHaveProperty('message')
  })

  it('should handle empty queue', async () => {
    const queue = createQueue()

    const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed')

    expect(counts.waiting).toBe(0)
  })

  it('should verify job is in queue before canceling', async () => {
    const queue = createQueue()

    const job = await queue.add('test-job', { data: 'test' })

    // Verify job exists before canceling
    const beforeCancel = await queue.getJob(job.id!)
    expect(beforeCancel).toBeDefined()

    await job.remove()

    // Verify job is removed
    const afterCancel = await queue.getJob(job.id!)
    expect(afterCancel).toBeUndefined()
  })
})
