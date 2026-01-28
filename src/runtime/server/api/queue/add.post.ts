import { defineEventHandler, readBody, createError } from 'h3'
import { useServerQueue } from '../../utils/composables'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { queueName = 'default', jobName, data, options } = body

  try {
    const queue = useServerQueue(queueName)
    const job = await queue.add(jobName, data, options)

    return {
      success: true,
      jobId: job.id,
      queueName,
    }
  }
  catch (error) {
    throw createError({
      statusCode: 500,
      message: (error as Error).message || 'Failed to add job to queue',
    })
  }
})
