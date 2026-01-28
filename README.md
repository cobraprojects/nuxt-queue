# Nuxt Queue

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

Background job queue for Nuxt applications powered by BullMQ and Redis.

- [✨ &nbsp;Release Notes](/CHANGELOG.md)
<!-- - [🏀 Online playground](https://stackblitz.com/github/your-org/nuxt-queue?file=playground%2Fapp.vue) -->
<!-- - [📖 &nbsp;Documentation](https://example.com) -->

## Features

- 🎯 &nbsp;**Laravel-Style Jobs** - Define job classes with auto-discovery (just like Laravel!)
- 🚀 &nbsp;**Separate Worker Process** - Workers run independently from your web server
- 📦 &nbsp;**BullMQ Powered** - Robust Redis-backed queue system
- 🔄 &nbsp;**Simple API** - Easy job creation from client and server
- 📊 &nbsp;**Job Status** - Built-in endpoints to check job progress
- ⚡ &nbsp;**Scalable** - Run multiple worker processes for high throughput
- 🎨 &nbsp;**Type Safe** - Full TypeScript support

## Quick Setup

1. Install the module:

```bash
npm install nuxt-queue
```

2. Add it to your `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  modules: ['nuxt-queue'],
  queue: {
    redis: {
      host: '127.0.0.1',
      port: 6379,
      // password: 'your-password', // optional
    }
  }
})
```

3. Start your Nuxt app:

```bash
npm run dev
```

4. In a separate terminal, start the worker process:

```bash
npx nuxt-queue worker
```

That's it! You can now use Nuxt Queue in your app ✨

## Usage

### Two Approaches

Nuxt Queue offers two ways to work with jobs:

1. **Laravel-Style Jobs** (Recommended) - Define job classes, auto-discovery, simple dispatch
2. **Direct Queue API** - Lower-level BullMQ queue access for advanced use cases

---

## Approach 1: Laravel-Style Jobs (Recommended)

This approach provides a Laravel-like experience where you define job classes and the module handles everything else.

### 1. Define a Job

Create job files in `server/jobs/` directory:

```typescript
// server/jobs/SendEmailJob.ts
import { defineJob } from '#imports'

interface EmailData {
  to: string
  subject: string
  body: string
}

export default defineJob<EmailData>({
  async handle(data, job) {
    // Your job logic here
    console.log(`Sending email to: ${data.to}`)
    
    // Simulate email sending
    await sendEmail(data.to, data.subject, data.body)
    
    // Update progress (optional)
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
    console.error(`❌ Failed to send email:`, error.message)
  },
})
```

### 2. Dispatch Jobs

Use the `dispatch()` function from anywhere in your server code:

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
  }
})
```

### 3. Run the Worker

The worker automatically discovers and processes all jobs in `server/jobs/`:

```bash
# Terminal 1: Start Nuxt dev server
npm run dev

# Terminal 2: Start worker (auto-discovers jobs)
npx nuxt-queue worker
```

That's it! No need to manually register workers or specify job handlers.

### Multiple Jobs Example

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

---

## Approach 2: Direct Queue API

For advanced use cases or when you need more control over the queue.

### Adding Jobs from Client-Side

Use the `useQueue` composable:

```vue
<script setup>
const queue = useQueue() // default queue
// or
const emailQueue = useQueue('emails') // specific queue

async function sendEmail() {
  await emailQueue.add('send-email', {
    to: 'user@example.com',
    subject: 'Hello!',
    body: 'Welcome to our app'
  })
}
</script>
```

### Adding Jobs from Server-Side

```typescript
// server/api/process.post.ts
export default defineEventHandler(async (event) => {
  const queue = useQueue('default')
  
  await queue.add('process-data', {
    userId: 123,
    action: 'export'
  })
  
  return { success: true }
})
```

### Creating Custom Queues

You can create multiple queues for different job types:

```typescript
// server/api/emails.post.ts
export default defineEventHandler(async (event) => {
  const emailQueue = useQueue('emails')
  
  await emailQueue.add('send-welcome-email', {
    to: 'user@example.com'
  })
  
  return { queued: true }
})
```

```vue
<!-- From client-side -->
<script setup>
const emailQueue = useQueue('emails')

await emailQueue.add('send-newsletter', {
  to: 'subscribers@example.com'
})
</script>
```

### Checking Job Status

After adding a job, you can check its status using the job ID:

```typescript
// Add a job and get its ID
const result = await queue.add('process-data', { userId: 123 })
console.log('Job ID:', result.jobId)

// Check job status via API
const status = await $fetch(`/api/queue/default/${result.jobId}`)
console.log(status)
// {
//   id: '1',
//   name: 'process-data',
//   data: { userId: 123 },
//   state: 'completed',
//   progress: 100,
//   returnvalue: { ... },
//   ...
// }
```

### Job Options

Control job behavior with options:

```typescript
await queue.add('send-email', 
  { to: 'user@example.com' },
  {
    delay: 5000,           // Delay 5 seconds
    priority: 1,           // Higher priority (lower number = higher priority)
    attempts: 3,           // Retry up to 3 times
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: true, // Clean up after completion
    removeOnFail: false     // Keep failed jobs for debugging
  }
)
```

### Defining Custom Workers

**Note:** If you're using Laravel-style jobs (Approach 1), you don't need custom worker scripts. This section is for the Direct Queue API approach.

Create worker scripts to process specific job types. Workers are simple JavaScript/TypeScript files that export a processor function.

#### Create a Worker Script

```typescript
// workers/email-worker.ts
export default async function (job) {
  console.log('Processing email job:', job.id)
  console.log('Email data:', job.data)
  
  // Your email sending logic here
  const { to, subject, body } = job.data
  await sendEmail(to, subject, body)
  
  return {
    sent: true,
    timestamp: new Date().toISOString(),
    recipient: to
  }
}
```

#### Run the Worker

```bash
# Run worker for 'emails' queue with custom script
npx nuxt-queue worker --queue emails --worker workers/email-worker.ts

# Or use .js files
npx nuxt-queue worker --queue emails --worker workers/email-worker.js
```

#### Multiple Workers Example

```typescript
// workers/notification-worker.ts
export default async function (job) {
  const { userId, message, type } = job.data
  
  switch (type) {
    case 'push':
      await sendPushNotification(userId, message)
      break
    case 'sms':
      await sendSMS(userId, message)
      break
    case 'email':
      await sendEmail(userId, message)
      break
  }
  
  return { delivered: true, type }
}
```

```bash
# Terminal 1: Email worker
npx nuxt-queue worker --queue emails --worker workers/email-worker.ts

# Terminal 2: Notification worker
npx nuxt-queue worker --queue notifications --worker workers/notification-worker.ts

# Terminal 3: Default worker (no custom script)
npx nuxt-queue worker --queue default
```

### Advanced Worker Definition

Use `defineWorker()` for more control over worker behavior with event handlers:

```typescript
// server/plugins/workers.ts
import { defineWorker } from '#imports'

export default defineNitroPlugin(() => {
  // Define worker with event handlers
  const emailWorker = defineWorker({
    queueName: 'emails',
    processor: async (job) => {
      const { to, subject, body } = job.data
      
      // Update progress
      await job.updateProgress(50)
      
      const result = await sendEmail(to, subject, body)
      
      await job.updateProgress(100)
      return result
    },
    onCompleted: async (job, result) => {
      console.log(`✅ Email sent to ${job.data.to}`)
    },
    onFailed: async (job, error) => {
      console.error(`❌ Failed to send email:`, error.message)
      // Send alert, log to monitoring service, etc.
    },
    onProgress: async (job, progress) => {
      console.log(`📊 Job ${job.id} progress: ${progress}%`)
    },
    options: {
      concurrency: 5,
      limiter: {
        max: 10,
        duration: 1000 // Max 10 jobs per second
      }
    }
  })
  
  // Start the worker
  emailWorker()
})
```

### Error Handling

Handle job failures gracefully in your worker scripts:

```typescript
// workers/resilient-worker.ts
export default async function (job) {
  try {
    const result = await riskyOperation(job.data)
    return result
  } catch (error) {
    // Log error details
    console.error('Job failed:', error)
    
    // Throw to trigger retry (if attempts configured)
    throw error
  }
}
```

### Progress Tracking

Report progress for long-running jobs:

```typescript
// workers/batch-processor.ts
export default async function (job) {
  const items = job.data.items
  const total = items.length
  
  for (let i = 0; i < total; i++) {
    await processItem(items[i])
    
    // Update progress (0-100)
    const progress = Math.round(((i + 1) / total) * 100)
    await job.updateProgress(progress)
  }
  
  return { processed: total }
}
```

Then monitor progress from your app:

```typescript
const result = await queue.add('batch-process', { items: [...] })

// Poll for progress
const checkProgress = setInterval(async () => {
  const status = await $fetch(`/api/queue/default/${result.jobId}`)
  console.log(`Progress: ${status.progress}%`)
  
  if (status.state === 'completed') {
    clearInterval(checkProgress)
    console.log('Done!', status.returnvalue)
  }
}, 1000)
```

## Running Workers

### Development

```bash
# Terminal 1: Start Nuxt dev server
npm run dev

# Terminal 2: Start default worker
npx nuxt-queue worker

# Terminal 3 (optional): Start custom queue workers
npx nuxt-queue worker --queue emails --worker workers/email-worker.ts
npx nuxt-queue worker --queue notifications --worker workers/notification-worker.ts
```

### Production

```bash
# Start web server
npm run build
npm run start

# Start workers (in separate processes/containers)
npx nuxt-queue worker --concurrency 10
npx nuxt-queue worker --queue emails --worker workers/email-worker.js --concurrency 5

# Or use a process manager like PM2
pm2 start "npx nuxt-queue worker" --name default-worker
pm2 start "npx nuxt-queue worker --queue emails --worker workers/email-worker.js" --name email-worker
pm2 scale default-worker 3  # Run 3 instances
```

### Worker CLI Options

```bash
npx nuxt-queue worker --cwd <path>              # Set working directory
npx nuxt-queue worker --queue <name>            # Queue name (default: 'default')
npx nuxt-queue worker --worker <path>           # Path to worker script
npx nuxt-queue worker --concurrency <num>       # Concurrent jobs (default: 5)

# Examples
npx nuxt-queue worker --queue emails --worker ./workers/email.ts --concurrency 10
npx nuxt-queue worker --queue default --concurrency 20
```

## Configuration

### Environment Variables

```bash
NUXT_REDIS_HOST=127.0.0.1
NUXT_REDIS_PORT=6379
NUXT_REDIS_PASSWORD=your-password
NUXT_REDIS_USERNAME=your-username
NUXT_REDIS_DB=0
```

### Module Options

```typescript
export default defineNuxtConfig({
  modules: ['nuxt-queue'],
  queue: {
    redis: {
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD,
      username: process.env.REDIS_USERNAME,
      db: Number(process.env.REDIS_DB) || 0,
    }
  }
})
```

## API Reference

### Laravel-Style Jobs API

#### `defineJob(definition)`

Define a job class with handler and lifecycle hooks.

```typescript
// server/jobs/SendEmailJob.ts
export default defineJob<EmailData>({
  async handle(data, job) {
    // Your job logic
    await sendEmail(data.to, data.subject, data.body)
    return { success: true }
  },
  queue: 'emails', // Optional, defaults to 'default'
  options: { attempts: 3 }, // Optional BullMQ job options
  async onCompleted(job, result) { }, // Optional
  async onFailed(job, error) { }, // Optional
})
```

#### `dispatch(jobName, data, options?)`

Dispatch a job by name (server-side only).

```typescript
await dispatch('SendEmailJob', {
  to: 'user@example.com',
  subject: 'Hello',
  body: 'Welcome!'
})
```

### Client-Side

#### `useQueue(queueName?)`

Get a queue instance to add jobs from client-side code.

```typescript
const queue = useQueue() // default queue
const emailQueue = useQueue('emails') // specific queue

await queue.add('job-name', { foo: 'bar' })
```

### Server-Side

#### `useQueue(queueName?)`

Get or create a queue instance (server-side).

```typescript
const queue = useQueue('emails')
await queue.add('send-email', { to: 'user@example.com' })
```

#### `useQueueConnection()`

Get the Redis connection configuration.

```typescript
const connection = useQueueConnection()
```

## Architecture

Nuxt Queue uses a **two-process architecture**:

1. **Web Server (Nitro)** - Handles HTTP requests and adds jobs to Redis queue
2. **Worker Process (CLI)** - Separate long-running process that consumes and processes jobs

This separation ensures:
- Workers keep running even if the web server restarts
- Heavy job processing doesn't affect web request performance
- Easy horizontal scaling by running multiple worker processes

```
┌─────────────────┐         ┌─────────┐         ┌──────────────────┐
│  Nuxt Web App   │────────▶│  Redis  │◀────────│  Worker Process  │
│  (Add Jobs)     │         │  Queue  │         │  (Process Jobs)  │
└─────────────────┘         └─────────┘         └──────────────────┘
```

## Requirements

- Node.js 18+
- Redis 6+
- Nuxt 3+

## Contribution

<details>
  <summary>Local development</summary>
  
  ```bash
  # Install dependencies
  npm install
  
  # Generate type stubs
  npm run dev:prepare
  
  # Develop with the playground
  npm run dev
  
  # In another terminal, start workers
  node dist/cli.mjs worker --cwd playground
  
  # Build the playground
  npm run dev:build
  
  # Run ESLint
  npm run lint
  
  # Run Vitest
  npm run test
  npm run test:watch
  
  # Release new version
  npm run release
  ```

</details>

## License

MIT

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/nuxt-queue/latest.svg?style=flat&colorA=020420&colorB=00DC82
[npm-version-href]: https://npmjs.com/package/nuxt-queue

[npm-downloads-src]: https://img.shields.io/npm/dm/nuxt-queue.svg?style=flat&colorA=020420&colorB=00DC82
[npm-downloads-href]: https://npm.chart.dev/nuxt-queue

[license-src]: https://img.shields.io/npm/l/nuxt-queue.svg?style=flat&colorA=020420&colorB=00DC82
[license-href]: https://npmjs.com/package/nuxt-queue

[nuxt-src]: https://img.shields.io/badge/Nuxt-020420?logo=nuxt
[nuxt-href]: https://nuxt.com
