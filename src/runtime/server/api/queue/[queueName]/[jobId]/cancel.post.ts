import { defineEventHandler, getRouterParams, createError } from 'h3'
import { useServerQueue } from '../../../../utils/composables'

export default defineEventHandler(async (event) => {
  const params = getRouterParams(event)
  const queueName = params.queueName
  const jobId = params.jobId

  if (!queueName || !jobId) {
    throw createError({
      statusCode: 400,
      message: 'Queue name and job ID are required',
    })
  }

  try {
    const queue = useServerQueue(queueName)
    const job = await queue.getJob(jobId)

    if (!job) {
      throw createError({
        statusCode: 404,
        message: 'Job not found',
      })
    }

    // Only cancel jobs that are waiting or delayed
    const state = await job.getState()
    if (state !== 'waiting' && state !== 'delayed') {
      throw createError({
        statusCode: 400,
        message: `Cannot cancel job in state: ${state}`,
      })
    }

    await job.remove()

    return {
      success: true,
      jobId,
      queueName,
      message: 'Job cancelled successfully',
    }
  }
  catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }
    throw createError({
      statusCode: 500,
      message: (error as Error).message || 'Failed to cancel job',
    })
  }
})
