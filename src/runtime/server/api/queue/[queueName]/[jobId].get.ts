import { defineEventHandler, getRouterParams, createError } from 'h3'
import { useServerQueue } from '../../../utils/composables'

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

  const queue = useServerQueue(queueName)
  const job = await queue.getJob(jobId)

  if (!job) {
    return null
  }

  return {
    id: job.id,
    name: job.name,
    data: job.data,
    progress: job.progress,
    state: await job.getState(),
    returnvalue: job.returnvalue,
    failedReason: job.failedReason,
    timestamp: job.timestamp,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
  }
})
