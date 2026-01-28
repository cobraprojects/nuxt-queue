export default async function (job: any) {
  console.log('Processing email job:', job.id)
  
  const { to, subject, body } = job.data
  
  // Simulate email sending
  await new Promise(resolve => setTimeout(resolve, 100))
  
  return {
    sent: true,
    to,
    subject,
    sentAt: new Date().toISOString(),
  }
}
