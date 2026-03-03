import { defineEventHandler, getRouterParam, createError } from 'h3'
import { Queue } from 'bullmq'
import { useRuntimeConfig } from '#imports'

interface QueueStats {
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
}

export default defineEventHandler(async (event) => {
  const queueName = getRouterParam(event, 'queueName')

  if (!queueName) {
    throw createError({
      statusCode: 400,
      message: 'Queue name is required',
    })
  }

  try {
    const config = useRuntimeConfig()
    const queueConfig = config.queue || {}
    const redisConfig = queueConfig.redis || {}

    const connection = {
      host: redisConfig.host || '127.0.0.1',
      port: redisConfig.port || 6379,
      password: redisConfig.password || undefined,
      username: redisConfig.username || undefined,
      db: redisConfig.db || 0,
    }

    const queue = new Queue(queueName, { connection })

    // Get job counts for each state
    const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed')

    await queue.close()

    const stats: QueueStats = {
      waiting: (counts.waiting as number) || 0,
      active: (counts.active as number) || 0,
      completed: (counts.completed as number) || 0,
      failed: (counts.failed as number) || 0,
      delayed: (counts.delayed as number) || 0,
    }

    return stats
  }
  catch (error) {
    throw createError({
      statusCode: 500,
      message: (error as Error).message || 'Failed to get queue statistics',
    })
  }
})
