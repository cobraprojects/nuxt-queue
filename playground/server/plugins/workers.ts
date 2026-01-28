import type { Job, JobProgress } from 'bullmq'

export default defineNitroPlugin(() => {
  // Example 1: Simple worker with event handlers
  const emailWorker = defineWorker({
    queueName: 'emails',
    processor: async (job: Job<{ to: string, subject: string, body: string }>) => {
      console.log(`[Email Worker] Processing job ${job.id}`)
      const { to } = job.data

      // Simulate email sending with progress updates
      await job.updateProgress(25)
      await new Promise(resolve => setTimeout(resolve, 500))

      await job.updateProgress(50)
      await new Promise(resolve => setTimeout(resolve, 500))

      await job.updateProgress(75)
      await new Promise(resolve => setTimeout(resolve, 500))

      await job.updateProgress(100)

      return {
        sent: true,
        timestamp: new Date().toISOString(),
        recipient: to,
      }
    },
    onCompleted: async (job: Job, result: { sent: boolean, timestamp: string, recipient: string }) => {
      console.log(`✅ [Email Worker] Job ${job.id} completed successfully`)
      console.log(`   Sent to: ${result.recipient}`)
    },
    onFailed: async (job: Job | undefined, error: Error) => {
      console.error(`❌ [Email Worker] Job ${job?.id} failed:`, error.message)
      // Here you could:
      // - Send alerts to monitoring service
      // - Log to error tracking system
      // - Notify administrators
    },
    onProgress: async (job: Job, progress: JobProgress) => {
      console.log(`📊 [Email Worker] Job ${job.id} progress: ${progress}`)
    },
  })

  // Example 2: Worker with rate limiting
  const notificationWorker = defineWorker({
    queueName: 'notifications',
    processor: async (job: Job<{ userId: number, message: string, type: string }>) => {
      console.log(`[Notification Worker] Processing job ${job.id}`)
      const { userId, type } = job.data

      // Simulate notification sending
      await new Promise(resolve => setTimeout(resolve, 1000))

      return {
        delivered: true,
        type,
        userId,
        timestamp: new Date().toISOString(),
      }
    },
    options: {
      concurrency: 5,
      limiter: {
        max: 10,
        duration: 1000, // Max 10 jobs per second
      },
    },
    onCompleted: async (job: Job, result: { delivered: boolean, type: string, userId: number, timestamp: string }) => {
      console.log(`✅ [Notification Worker] ${result.type} notification sent to user ${result.userId}`)
    },
    onFailed: async (job: Job | undefined, error: Error) => {
      console.error(`❌ [Notification Worker] Failed:`, error.message)
    },
  })

  // Example 3: Data processing worker with detailed progress
  const dataProcessorWorker = defineWorker({
    queueName: 'data-processing',
    processor: async (job: Job<{ items: Array<{ id: number, name: string, value: number }> }>) => {
      console.log(`[Data Processor] Processing job ${job.id}`)
      const { items } = job.data
      const total = items.length
      const processed = []

      for (let i = 0; i < total; i++) {
        const item = items[i]
        if (!item) continue

        // Process each item
        const result = await processItem(item)
        processed.push(result)

        // Update progress
        const progress = Math.round(((i + 1) / total) * 100)
        await job.updateProgress(progress)

        // Small delay to simulate work
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      return {
        processed: processed.length,
        total,
        results: processed,
      }
    },
    onCompleted: async (job: Job, result: { processed: number, total: number }) => {
      console.log(`✅ [Data Processor] Processed ${result.processed}/${result.total} items`)
    },
    onFailed: async (job: Job | undefined, error: Error) => {
      console.error(`❌ [Data Processor] Failed:`, error.message)
    },
    onProgress: async (job: Job, progress: JobProgress) => {
      console.log(`📊 [Data Processor] Job ${job.id} progress: ${progress}`)
    },
    options: {
      concurrency: 3,
    },
  })

  // Start all workers
  emailWorker()
  notificationWorker()
  dataProcessorWorker()

  console.log('🚀 All workers initialized')
})

// Helper function for data processing example
async function processItem(item: { id: number, name: string, value: number }) {
  // Simulate processing
  return {
    id: item.id,
    processed: true,
    timestamp: new Date().toISOString(),
  }
}
