# Laravel-Style Jobs Example

This example shows how to use the Laravel-style job system in nuxt-queue.

## 1. Define a Job

Create a job file in `server/jobs/`:

```typescript
// server/jobs/SendEmailJob.ts
import { defineJob } from 'nuxt-queue/runtime/server/utils/defineJob'

interface EmailData {
  to: string
  subject: string
  body: string
}

export default defineJob<EmailData>({
  async handle(data, job) {
    console.log(`Sending email to: ${data.to}`)

    // Your email sending logic here
    await sendEmail(data.to, data.subject, data.body)

    // Optional: Update progress
    await job.updateProgress(100)

    return {
      success: true,
      sentTo: data.to,
      sentAt: new Date().toISOString(),
    }
  },

  // Optional: Specify queue name (defaults to 'default')
  queue: 'emails',

  // Optional: Job options
  options: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },

  // Optional: Lifecycle hooks
  async onCompleted(job, result) {
    console.log(`✅ Email sent to ${job.data.to}`)
  },

  async onFailed(job, error) {
    console.error(`❌ Failed to send email: ${error.message}`)
  },
})
```

## 2. Dispatch the Job

From any server-side code (API routes, plugins, etc.):

```typescript
// server/api/send-welcome-email.post.ts
import { dispatch } from 'nuxt-queue/runtime/server/utils/dispatch'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  // Dispatch the job
  const result = await dispatch('SendEmailJob', {
    to: body.email,
    subject: 'Welcome!',
    body: 'Thanks for signing up',
  })

  return {
    success: true,
    jobId: result.jobId,
    queueName: result.queueName,
  }
})
```

## 3. Run the Worker

The worker automatically discovers and processes all jobs in `server/jobs/`:

```bash
# Terminal 1: Start Nuxt dev server
npm run dev

# Terminal 2: Start worker (auto-discovers jobs)
npx nuxt-queue worker
```

## Multiple Jobs Example

```typescript
// server/jobs/SendNewsletterJob.ts
export default defineJob({
  async handle(data) {
    const subscribers = await getSubscribers()

    for (const subscriber of subscribers) {
      await sendEmail(subscriber.email, data.subject, data.content)
    }

    return { sent: subscribers.length }
  },
})

// server/jobs/ProcessImageJob.ts
export default defineJob({
  queue: 'media', // Use a different queue

  async handle(data, job) {
    await job.updateProgress(25)
    const resized = await resizeImage(data.imageUrl)

    await job.updateProgress(75)
    const optimized = await optimizeImage(resized)

    await job.updateProgress(100)
    return { url: optimized }
  },
})
```

Dispatch them:

```typescript
// Dispatch newsletter
await dispatch('SendNewsletterJob', {
  subject: 'Monthly Update',
  content: '...',
})

// Dispatch image processing
await dispatch('ProcessImageJob', {
  imageUrl: 'https://example.com/image.jpg',
})
```

## Benefits

- ✅ **Auto-discovery**: No manual worker registration needed
- ✅ **Type-safe**: Full TypeScript support with generics
- ✅ **Simple API**: Just `defineJob()` and `dispatch()`
- ✅ **Laravel-like**: Familiar pattern for Laravel developers
- ✅ **Flexible**: Still have access to full BullMQ features
