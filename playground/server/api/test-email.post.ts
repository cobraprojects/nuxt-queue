export default defineEventHandler(async (_event) => {
  const queue = useServerQueue('emails')

  const job = await queue.add('send-email', {
    to: 'user@example.com',
    subject: 'Test Email',
    body: 'This is a test email from the playground',
  })

  return {
    success: true,
    jobId: job.id,
    queueName: 'emails',
    message: 'Email job added to queue',
  }
})
