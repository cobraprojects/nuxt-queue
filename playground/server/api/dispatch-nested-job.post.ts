export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  // Dispatch a job from nested directory
  // Job name uses dot notation: emails.WelcomeEmail or notifications.PushNotification
  const job = await dispatch(body.jobName, body.data)

  return {
    success: true,
    jobId: job.jobId,
    queueName: job.queueName,
    jobName: body.jobName,
  }
})
