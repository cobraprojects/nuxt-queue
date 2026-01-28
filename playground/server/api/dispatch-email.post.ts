import { dispatch } from '../../../src/runtime/server/utils/dispatch'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const result = await dispatch('SendEmailJob', {
    to: body.to || 'user@example.com',
    subject: body.subject || 'Test Email',
    body: body.body || 'This is a test email from nuxt-queue',
  })

  return {
    success: true,
    message: 'Email job dispatched',
    jobId: result.jobId,
    queueName: result.queueName,
  }
})
