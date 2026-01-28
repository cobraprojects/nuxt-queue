import type { Job } from 'bullmq'

// Example email worker
export default async function (job: Job) {
  console.log(`[Email Worker] Processing job ${job.id}`)
  console.log(`[Email Worker] Sending email to: ${job.data.to}`)
  console.log(`[Email Worker] Subject: ${job.data.subject}`)

  // Simulate email sending
  await new Promise(resolve => setTimeout(resolve, 1000))

  return {
    sent: true,
    recipient: job.data.to,
    timestamp: new Date().toISOString(),
  }
}
