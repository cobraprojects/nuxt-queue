export default defineEventHandler(async () => {
  const job = await dispatch('ProcessDataJob', {
    userId: 999,
    action: 'realtime-demo',
    data: { items: 50 },
  })

  return {
    success: true,
    jobId: job.jobId,
    queueName: job.queueName,
    message: 'Job dispatched! Use the returned jobId to monitor progress in real-time.',
  }
})
