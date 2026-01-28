interface PushNotificationData {
  userId: number
  title: string
  message: string
}

export default defineJob<PushNotificationData>({
  async handle(data, job) {
    console.log(`🔔 Sending push notification to user ${data.userId}`)
    console.log(`Title: ${data.title}`)
    console.log(`Message: ${data.message}`)

    await job.updateProgress(100)

    return {
      success: true,
      userId: data.userId,
      sentAt: new Date().toISOString(),
    }
  },

  options: {
    attempts: 2,
  },
})
