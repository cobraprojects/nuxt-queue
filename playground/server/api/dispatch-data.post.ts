export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const result = await dispatch('ProcessDataJob', {
    userId: body.userId || 123,
    action: body.action || 'export',
    data: body.data || {},
  })

  return {
    success: true,
    message: 'Data processing job dispatched',
    jobId: result.jobId,
    queueName: result.queueName,
  }
})
