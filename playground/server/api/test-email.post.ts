import type { Job } from 'bullmq'

export default defineEventHandler(async (_event) => {
  const queue = useQueue('emails')

  const job = await queue.add('send-email', {
    to: 'user@example.com',
    subject: 'Test Email',
    body: 'This is a test email from the playground',
  }) as Job

  return {
    success: true,
    jobId: job.id,
    queueName: 'emails',
    message: 'Email job added to queue',
  }
})
