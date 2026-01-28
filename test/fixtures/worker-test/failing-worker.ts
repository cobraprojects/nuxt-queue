import type { Job } from 'bullmq'

export default async function (job: Job) {
  console.log('Processing job that will fail:', job.id)

  // Simulate some work
  await new Promise(resolve => setTimeout(resolve, 50))

  // Intentionally fail
  throw new Error('Worker intentionally failed for testing')
}
