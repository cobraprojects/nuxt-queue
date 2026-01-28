interface ExternalJobData {
  taskId: number
  description: string
}

export default defineJob<ExternalJobData>({
  async handle(data, job) {
    console.log(`🔧 Processing external job: ${data.taskId}`)
    console.log(`Description: ${data.description}`)

    await job.updateProgress(50)
    await new Promise(resolve => setTimeout(resolve, 500))

    await job.updateProgress(100)

    return {
      success: true,
      taskId: data.taskId,
      processedAt: new Date().toISOString(),
    }
  },

  queue: 'external',

  options: {
    attempts: 2,
  },

  async onCompleted(job, _result) {
    console.log(`✅ External job ${job.data.taskId} completed`)
  },

  async onFailed(_job, error) {
    console.error(`❌ External job failed: ${error.message}`)
  },
})
