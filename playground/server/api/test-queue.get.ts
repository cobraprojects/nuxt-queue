import { defineEventHandler } from 'h3'
import type { Job } from 'bullmq'

export default defineEventHandler(async () => {
  const queue = useQueue('default')

  // Add a test job
  const job = await queue.add('test-job', {
    message: 'Hello from test!',
    timestamp: new Date().toISOString(),
  }) as Job

  return {
    success: true,
    jobId: job.id,
    message: 'Job added to queue successfully',
  }
})
