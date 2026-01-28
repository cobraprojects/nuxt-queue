export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  // Dispatch a job from nested directory
  // Job name uses dot notation: emails.WelcomeEmail or notifications.PushNotification
  const result = await dispatch(body.jobName, body.data)

  return {
    success: true,
    jobId: result.jobId,
    queueName: result.queueName,
    jobName: body.jobName,
  }
})
