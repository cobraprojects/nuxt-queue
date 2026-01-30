export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const job = await dispatch('SendEmailJob', {
    to: body.to || 'user@example.com',
    subject: body.subject || 'Test Email',
    body: body.body || 'This is a test email from nuxt-queuekit',
  })

  return {
    success: true,
    message: 'Email job dispatched',
    jobId: job.jobId,
    queueName: job.queueName,
  }
})
