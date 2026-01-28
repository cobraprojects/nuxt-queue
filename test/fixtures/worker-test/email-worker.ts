export default async function (job: { id: string, data: { to: string, subject: string, body: string } }) {
  console.log('Processing email job:', job.id)

  const { to, subject } = job.data

  // Simulate email sending
  await new Promise(resolve => setTimeout(resolve, 100))

  return {
    sent: true,
    to,
    subject,
    sentAt: new Date().toISOString(),
  }
}
