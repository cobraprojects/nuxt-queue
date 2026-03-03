import { describe, it, expect, vi, afterEach } from 'vitest'
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

describe('Job Management Integration', () => {
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

  const createQueue = () => {
    const queue = new Queue(`test-job-mgmt-${Date.now()}`, {
      connection: { host: '127.0.0.1', port: 6379, db: 0 },
    })
    queues.push(queue)
    return queue
  }

  describe('Cancel Job Flow', () => {
    it('should cancel a waiting job', async () => {
      const queue = createQueue()

      const job = await queue.add('test-job', { data: 'test-data' })

      // Verify job exists
      const beforeCancel = await queue.getJob(job.id!)
      expect(beforeCancel).toBeDefined()

      // Cancel the job
      await job.remove()

      // Verify job is removed
      const afterCancel = await queue.getJob(job.id!)
      expect(afterCancel).toBeUndefined()
    })

    it('should cancel a delayed job', async () => {
      const queue = createQueue()

      const job = await queue.add('test-job', { data: 'test-data' }, { delay: 60000 })

      // Verify job is in delayed state
      const state = await job.getState()
      expect(state).toBe('delayed')

      // Cancel the job
      await job.remove()

      // Verify job is removed
      const retrievedJob = await queue.getJob(job.id!)
      expect(retrievedJob).toBeUndefined()
    })

    it('should handle non-existent job', async () => {
      const queue = createQueue()

      const nonExistentJob = await queue.getJob('non-existent-id')
      expect(nonExistentJob).toBeUndefined()
    })
  })

  describe('Retry Failed Job Flow (Simulated)', () => {
    it('should create new job when retrying (simulated)', async () => {
      const queue = createQueue()

      // Simulate having a "failed" job's data
      const originalJobData = {
        name: 'failing-job',
        data: { data: 'test-data' },
        opts: { attempts: 3 },
        id: 'original-job-id',
      }

      // Simulate retry: create new job with same data
      const newJob = await queue.add(
        originalJobData.name,
        originalJobData.data,
        originalJobData.opts,
      )

      expect(newJob.id).toBeDefined()
      expect(newJob.id).not.toBe(originalJobData.id)
      expect(newJob.name).toBe(originalJobData.name)
      expect(newJob.data).toEqual(originalJobData.data)
      expect(newJob.opts.attempts).toBe(originalJobData.opts.attempts)
    })

    it('should preserve job options when retrying', async () => {
      const queue = createQueue()

      const jobOptions = {
        attempts: 5,
        delay: 1000,
        priority: 1,
      }

      const originalJob = await queue.add('test-job', { data: 'test' }, jobOptions)

      // Create new job with same options (simulating retry)
      const newJob = await queue.add(originalJob.name, originalJob.data, {
        ...originalJob.opts,
        attempts: originalJob.opts.attempts || 1,
      })

      expect(newJob.opts.attempts).toBe(jobOptions.attempts)
      expect(newJob.opts.delay).toBe(jobOptions.delay)
      expect(newJob.opts.priority).toBe(jobOptions.priority)
    })
  })

  describe('Queue Statistics', () => {
    it('should return stats for empty queue', async () => {
      const queue = createQueue()

      const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed')

      expect(counts.waiting).toBe(0)
      expect(counts.active).toBe(0)
      expect(counts.completed).toBe(0)
      expect(counts.failed).toBe(0)
      expect(counts.delayed).toBe(0)
    })

    it('should reflect job states in queue stats', async () => {
      const queue = createQueue()

      // Get initial counts
      const initialCounts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed')

      // Add jobs in different states
      await queue.add('test-job-1', { data: 'test1' })
      await queue.add('test-job-2', { data: 'test2' })
      await queue.add('test-job-3', { data: 'test3' }, { delay: 60000 })

      // Get updated counts
      const updatedCounts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed')

      expect(updatedCounts.waiting).toBe((initialCounts.waiting as number) + 2)
      expect(updatedCounts.delayed).toBe((initialCounts.delayed as number) + 1)
    })

    it('should update stats after job removal', async () => {
      const queue = createQueue()

      // Add jobs
      const job1 = await queue.add('test-job-1', { data: 'test1' })
      await queue.add('test-job-2', { data: 'test2' })

      const countsWithJobs = await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed')
      expect(countsWithJobs.waiting).toBe(2)

      // Remove one job
      await job1.remove()

      const countsAfterRemove = await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed')
      expect(countsAfterRemove.waiting).toBe(1)
    })
  })

  describe('Job Lifecycle', () => {
    it('should handle job creation and removal', async () => {
      const queue = createQueue()

      // Create job
      const job = await queue.add('test-job', { data: 'test' })

      expect(job.id).toBeDefined()
      expect(job.name).toBe('test-job')
      expect(job.data).toEqual({ data: 'test' })

      // Get job state
      const state = await job.getState()
      expect(state).toBe('waiting')

      // Remove job
      await job.remove()

      const retrievedJob = await queue.getJob(job.id!)
      expect(retrievedJob).toBeUndefined()
    })
  })
})
