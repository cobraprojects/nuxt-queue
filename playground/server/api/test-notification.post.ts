export default defineEventHandler(async (_event) => {
  const queue = useServerQueue('notifications')

  const job = await queue.add('send-notification', {
    userId: 123,
    message: 'You have a new message!',
    type: 'push',
  })

  return {
    success: true,
    jobId: job.id,
    queueName: 'notifications',
    message: 'Notification job added to queue',
  }
})
