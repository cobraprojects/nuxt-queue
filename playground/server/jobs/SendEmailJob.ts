interface EmailData {
  to: string
  subject: string
  body: string
}

export default defineJob<EmailData>({
  async handle(data, job) {
    console.log(`📧 Sending email to: ${data.to}`)
    console.log(`Subject: ${data.subject}`)

    // Simulate email sending
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Update progress
    await job.updateProgress(50)

    // Simulate more work
    await new Promise(resolve => setTimeout(resolve, 1000))
    await job.updateProgress(100)

    return {
      success: true,
      sentTo: data.to,
      sentAt: new Date().toISOString(),
    }
  },

  options: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },

  async onCompleted(job, _result) {
    console.log(`✅ Email sent successfully to ${job.data.to}`)
  },

  async onFailed(_job, error) {
    console.error(`❌ Failed to send email: ${error.message}`)
  },
})
