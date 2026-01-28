export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const result = await dispatch('SendEmailJob', {
    to: body.to || 'user@example.com',
    subject: body.subject || 'Test Email',
    body: body.body || 'This is a test email from nuxt-queuekit',
  })

  return {
    success: true,
    message: 'Email job dispatched',
    jobId: result.jobId,
    queueName: result.queueName,
  }
})
