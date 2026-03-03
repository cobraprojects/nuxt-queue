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

    // Only retry failed jobs
    const state = await job.getState()
    if (state !== 'failed') {
      throw createError({
        statusCode: 400,
        message: `Cannot retry job in state: ${state}. Only failed jobs can be retried.`,
      })
    }

    // Add the job back to the queue with the same data and options
    const newJob = await queue.add(job.name, job.data, {
      ...job.opts,
      attempts: job.opts.attempts || 1,
    })

    // Remove the old failed job
    await job.remove()

    return {
      success: true,
      jobId: newJob.id,
      queueName,
      message: 'Job retried successfully',
    }
  }
  catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }
    throw createError({
      statusCode: 500,
      message: (error as Error).message || 'Failed to retry job',
    })
  }
})
