import { defineEventHandler } from 'h3'

export default defineEventHandler(async () => {
  const queue = useQueue('default')

  // Add a test job
  const job = await queue.add('test-job', {
    message: 'Hello from test!',
    timestamp: new Date().toISOString(),
  })

  return {
    success: true,
    jobId: job.id,
    message: 'Job added to queue successfully',
  }
})
