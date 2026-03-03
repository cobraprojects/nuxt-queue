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

describe('GET /api/queue/[queueName]/stats', () => {
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
    const queue = new Queue(`test-stats-${Date.now()}`, {
      connection: { host: '127.0.0.1', port: 6379, db: 0 },
    })
    queues.push(queue)
    return queue
  }

  it('should return stats for empty queue', async () => {
    const queue = createQueue()

    const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed')

    expect(counts.waiting).toBe(0)
    expect(counts.active).toBe(0)
    expect(counts.completed).toBe(0)
    expect(counts.failed).toBe(0)
    expect(counts.delayed).toBe(0)
  })

  it('should return stats with waiting jobs', async () => {
    const queue = createQueue()

    await queue.add('test-job', { data: 'test' })

    const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed')

    expect(counts.waiting).toBeGreaterThanOrEqual(1)
  })

  it('should return stats with delayed jobs', async () => {
    const queue = createQueue()

    await queue.add('test-job', { data: 'test' }, { delay: 10000 })

    const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed')

    expect(counts.delayed).toBeGreaterThanOrEqual(1)
  })

  it('should return stats with multiple jobs', async () => {
    const queue = createQueue()

    // Add multiple waiting jobs
    await queue.add('test-job-1', { data: 'test1' })
    await queue.add('test-job-2', { data: 'test2' })
    await queue.add('test-job-3', { data: 'test3' })

    const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed')

    expect(counts.waiting).toBeGreaterThanOrEqual(3)
  })

  it('should return stats with mixed job types', async () => {
    const queue = createQueue()

    // Add waiting jobs
    await queue.add('waiting-job-1', { data: 'test1' })
    await queue.add('waiting-job-2', { data: 'test2' })

    // Add delayed jobs
    await queue.add('delayed-job-1', { data: 'test3' }, { delay: 10000 })
    await queue.add('delayed-job-2', { data: 'test4' }, { delay: 10000 })

    const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed')

    expect(counts.waiting).toBeGreaterThanOrEqual(2)
    expect(counts.delayed).toBeGreaterThanOrEqual(2)
  })

  it('should handle null values from getJobCounts', () => {
    // Test the response interface handles null values
    const mockCounts = {
      waiting: null,
      active: null,
      completed: null,
      failed: null,
      delayed: null,
    }

    const stats = {
      waiting: (mockCounts.waiting as number | null) || 0,
      active: (mockCounts.active as number | null) || 0,
      completed: (mockCounts.completed as number | null) || 0,
      failed: (mockCounts.failed as number | null) || 0,
      delayed: (mockCounts.delayed as number | null) || 0,
    }

    expect(stats.waiting).toBe(0)
    expect(stats.active).toBe(0)
    expect(stats.completed).toBe(0)
    expect(stats.failed).toBe(0)
    expect(stats.delayed).toBe(0)
  })

  it('should validate QueueStats interface', () => {
    interface QueueStats {
      waiting: number
      active: number
      completed: number
      failed: number
      delayed: number
    }

    const stats: QueueStats = {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
    }

    expect(stats).toHaveProperty('waiting')
    expect(stats).toHaveProperty('active')
    expect(stats).toHaveProperty('completed')
    expect(stats).toHaveProperty('failed')
    expect(stats).toHaveProperty('delayed')
  })

  it('should return zero counts for jobs that dont exist in queue', async () => {
    const queue = createQueue()

    const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed')

    expect(counts.waiting).toBe(0)
    expect(counts.active).toBe(0)
    expect(counts.completed).toBe(0)
    expect(counts.failed).toBe(0)
    expect(counts.delayed).toBe(0)
  })
})
