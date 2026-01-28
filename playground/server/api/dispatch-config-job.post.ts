export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  // Dispatch the ExternalJob which is registered via file path in config
  // This job is NOT in server/jobs/, it's in server/custom-jobs/
  const result = await dispatch('ExternalJob', {
    taskId: body.taskId || Math.floor(Math.random() * 1000),
    description: body.description || 'Test external job from config file path',
  })

  return {
    success: true,
    jobId: result.jobId,
    queueName: result.queueName,
  }
})
