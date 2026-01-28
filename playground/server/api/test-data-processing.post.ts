export default defineEventHandler(async (_event) => {
  const queue = useServerQueue('data-processing')

  // Create sample data to process
  const items = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    name: `Item ${i + 1}`,
    value: Math.random() * 100,
  }))

  const job = await queue.add('batch-process', {
    items,
  })

  return {
    success: true,
    jobId: job.id,
    queueName: 'data-processing',
    itemCount: items.length,
    message: 'Data processing job added to queue',
  }
})
