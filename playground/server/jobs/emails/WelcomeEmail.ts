interface WelcomeEmailData {
  to: string
  name: string
}

export default defineJob<WelcomeEmailData>({
  async handle(data, job) {
    console.log(`📧 Sending welcome email to: ${data.to}`)
    console.log(`Welcome, ${data.name}!`)

    await job.updateProgress(50)
    await new Promise(resolve => setTimeout(resolve, 500))

    await job.updateProgress(100)

    return {
      success: true,
      sentTo: data.to,
      type: 'welcome',
      sentAt: new Date().toISOString(),
    }
  },

  options: {
    attempts: 3,
  },

  async onCompleted(job, _result) {
    console.log(`✅ Welcome email sent to ${job.data.to}`)
  },

  async onFailed(_job, error) {
    console.error(`❌ Failed to send welcome email: ${error.message}`)
  },
})
