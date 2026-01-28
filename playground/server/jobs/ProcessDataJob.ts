interface DataProcessingPayload {
  userId: number
  action: string
  data?: Record<string, unknown>
}

export default defineJob<DataProcessingPayload>({
  async handle(data, job) {
    console.log(`🔄 Processing data for user ${data.userId}`)
    console.log(`Action: ${data.action}`)

    await job.updateProgress(25)
    await new Promise(resolve => setTimeout(resolve, 500))

    await job.updateProgress(50)
    await new Promise(resolve => setTimeout(resolve, 500))

    await job.updateProgress(75)
    await new Promise(resolve => setTimeout(resolve, 500))

    await job.updateProgress(100)

    return {
      processed: true,
      userId: data.userId,
      action: data.action,
      completedAt: new Date().toISOString(),
    }
  },

  options: {
    attempts: 2,
  },

  async onCompleted(_job, result) {
    console.log(`✅ Data processing completed for user ${(result as { userId: number }).userId}`)
  },

  async onFailed(_job, error) {
    console.error(`❌ Data processing failed: ${error.message}`)
  },
})
