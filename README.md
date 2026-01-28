# Nuxt Queue

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

Background job queue for Nuxt applications powered by BullMQ and Redis.

<!-- - [🏀 Online playground](https://stackblitz.com/github/your-org/nuxt-queuekit?file=playground%2Fapp.vue) -->
<!-- - [📖 &nbsp;Documentation](https://example.com) -->

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Basic Usage](#basic-usage)
- [Advanced Usage](#advanced-usage)
- [Configuration](#configuration)
- [Production Deployment](#production-deployment)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)
- [Architecture](#architecture)

## Features

- 🎯 &nbsp;**File-Based Jobs** - Define job classes with auto-discovery
- 🚀 &nbsp;**Separate Worker Process** - Workers run independently from your web server
- 📦 &nbsp;**BullMQ Powered** - Robust Redis-backed queue system
- 🔄 &nbsp;**Simple API** - Easy job creation from client and server
- 📊 &nbsp;**Job Status** - Built-in endpoints to check job progress
- ⚡ &nbsp;**Scalable** - Run multiple worker processes for high throughput
- 🎨 &nbsp;**Type Safe** - Full TypeScript support

## Quick Start

### Prerequisites

You need Redis running. Choose one:

```bash
# Option 1: Docker (easiest)
docker run -d -p 6379:6379 redis

# Option 2: Install locally
# macOS
brew install redis && brew services start redis

# Ubuntu/Debian
sudo apt-get install redis-server && sudo systemctl start redis
```

### Installation

Install the module:

```bash
npm install nuxt-queuekit
```

Add it to your `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  modules: ['nuxt-queuekit']
})
```

That's it! The module uses Redis at `127.0.0.1:6379` by default. You can [customize this configuration](#configuration) if needed.

### Start Development

```bash
# Terminal 1: Start your Nuxt app
npm run dev

# Terminal 2: Start the worker process
npx nuxt-queuekit worker
```

You're ready to create jobs! ✨

## Basic Usage

Nuxt Queue uses a **file-based approach** where you define job classes and dispatch them by name. The module handles auto-discovery and worker registration automatically.

### Step 1: Create a Job

Create job files in the `server/jobs/` directory:

```typescript
// server/jobs/SendWelcomeEmail.ts
interface WelcomeEmailData {
  userId: string
  email: string
  name: string
}

export default defineJob<WelcomeEmailData>({
  async handle(data, job) {
    // Your job logic here
    console.log(`Sending welcome email to ${data.name}`)
    
    await sendEmail({
      to: data.email,
      subject: 'Welcome!',
      template: 'welcome',
      data: { name: data.name }
    })
    
    return { success: true, sentAt: new Date() }
  }
})
```

> **Note:** `defineJob` is automatically available - no import needed!

### Step 2: Dispatch the Job

From any server-side code (API routes, plugins, etc.):

```typescript
// server/api/register.post.ts
export default defineEventHandler(async (event) => {
  const { email, name } = await readBody(event)
  
  // Create user in database
  const user = await createUser({ email, name })
  
  // Dispatch welcome email job
  await dispatch('SendWelcomeEmail', {
    userId: user.id,
    email: user.email,
    name: user.name
  })
  
  return { success: true }
})
```

### Step 3: Worker Processes It

The worker automatically discovers and processes all jobs in `server/jobs/`. No manual registration needed!

```bash
npx nuxt-queuekit worker
```

That's the basic flow! Define → Dispatch → Process.

### Organizing Jobs in Subdirectories

For larger apps, organize jobs into subdirectories:

```
server/jobs/
├── SendWelcomeEmail.ts
├── emails/
│   ├── NewsletterEmail.ts
│   └── PasswordResetEmail.ts
└── media/
    ├── ProcessImage.ts
    └── GenerateThumbnail.ts
```

Use dot notation to dispatch nested jobs:

```typescript
await dispatch('emails.NewsletterEmail', { ... })
await dispatch('media.ProcessImage', { ... })
```

### Job Options & Retry Logic

By default, jobs run once with no retries. Configure retry behavior and other options:

```typescript
// server/jobs/ProcessPayment.ts
export default defineJob({
  async handle(data) {
    const result = await processPayment(data.orderId, data.amount)
    return result
  },
  
  // Retry up to 3 times with exponential backoff
  options: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000 // Start with 2s, then 4s, then 8s
    }
  },
  
  // Optional: Use a dedicated queue
  queue: 'payments'
})
```

### Lifecycle Hooks

React to job events:

```typescript
// server/jobs/GenerateReport.ts
export default defineJob({
  async handle(data, job) {
    // Update progress for long-running jobs
    await job.updateProgress(25)
    const data = await fetchData()
    
    await job.updateProgress(50)
    const processed = await processData(data)
    
    await job.updateProgress(75)
    const report = await generatePDF(processed)
    
    await job.updateProgress(100)
    return { reportUrl: report.url }
  },
  
  async onCompleted(job, result) {
    console.log(`✅ Report generated: ${result.reportUrl}`)
    await notifyUser(job.data.userId, result.reportUrl)
  },
  
  async onFailed(job, error) {
    console.error(`❌ Report generation failed:`, error)
    await alertAdmin(job.data.userId, error.message)
  }
})
```

### Checking Job Status

Get job status using the built-in API:

```typescript
// Dispatch and get job ID
const result = await dispatch('GenerateReport', { userId: '123' })

// Check status
const status = await $fetch(`/api/queue/default/${result.jobId}`)
console.log(status.state)      // 'waiting' | 'active' | 'completed' | 'failed'
console.log(status.progress)   // 0-100
console.log(status.returnvalue) // Job result
```

## Advanced Usage

### When to Use Direct Queue API

The file-based approach covers most use cases, but use the Direct Queue API when you need:

- **Dynamic job names** - Job names determined at runtime
- **Direct BullMQ features** - Advanced BullMQ options not exposed by `defineJob`
- **Client-side job dispatch** - Adding jobs from Vue components
- **Custom worker logic** - Full control over job processing

### Client-Side Job Dispatch

Use the `useQueue` composable in Vue components:

```vue
<script setup>
const queue = useQueue()

async function exportData() {
  await queue.add('export-user-data', {
    userId: user.value.id,
    email: user.value.email,
    format: 'csv'
  })
  
  // Show confirmation
  toast.success('Export started! You\'ll receive an email when it\'s ready.')
}
</script>
```

The job handles completion notification:

```typescript
// server/jobs/ExportUserData.ts
export default defineJob({
  async handle(data) {
    // Generate export file
    const fileUrl = await generateExport(data.userId, data.format)
    return { fileUrl }
  },
  
  async onCompleted(job, result) {
    // Send email notification when complete
    await sendEmail(job.data.email, {
      subject: 'Your export is ready',
      body: `Download your ${job.data.format} file: ${result.fileUrl}`
    })
    
    // Or trigger a webhook
    await fetch('https://your-app.com/api/webhooks/export-complete', {
      method: 'POST',
      body: JSON.stringify({
        userId: job.data.userId,
        fileUrl: result.fileUrl
      })
    })
    
    // Or send push notification
    await sendPushNotification(job.data.userId, {
      title: 'Export Ready',
      body: 'Your data export is ready to download'
    })
  },
  
  async onFailed(job, error) {
    // Notify user of failure
    await sendEmail(job.data.email, {
      subject: 'Export failed',
      body: `Sorry, your export failed: ${error.message}`
    })
  }
})
```

For real-time UI updates, use WebSockets or Server-Sent Events in the `onCompleted` hook:

```typescript
// server/jobs/ProcessVideo.ts
export default defineJob({
  async handle(data, job) {
    const result = await processVideo(data.videoUrl)
    return result
  },
  
  async onCompleted(job, result) {
    // Emit real-time event via WebSocket/SSE
    const io = useSocketIO() // Your WebSocket implementation
    io.to(job.data.userId).emit('video-processed', {
      videoId: job.data.videoId,
      url: result.url
    })
  }
})
```

### Direct Queue API (Server-Side)

For advanced control, use `useQueue` directly:

```typescript
// server/api/batch-process.post.ts
export default defineEventHandler(async (event) => {
  const queue = useQueue('processing')
  
  const items = await readBody(event)
  
  // Add multiple jobs with different priorities
  for (const item of items) {
    await queue.add('process-item', item, {
      priority: item.urgent ? 1 : 10,
      delay: item.scheduledFor ? item.scheduledFor - Date.now() : 0
    })
  }
  
  return { queued: items.length }
})
```

### Custom Worker Scripts

For the Direct Queue API approach, create custom worker scripts:

```typescript
// workers/custom-processor.ts
export default async function (job) {
  console.log('Processing:', job.name, job.data)
  
  // Your custom logic
  const result = await processJob(job.data)
  
  return result
}
```

Run with:

```bash
npx nuxt-queuekit worker --queue processing --worker workers/custom-processor.ts
```

### Multiple Queues Strategy

Separate jobs by priority or resource requirements:

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-queuekit']
})
```

```typescript
// server/jobs/CriticalAlert.ts
export default defineJob({
  queue: 'critical', // High-priority queue
  async handle(data) {
    await sendAlert(data)
  }
})

// server/jobs/MonthlyReport.ts
export default defineJob({
  queue: 'reports', // Low-priority, resource-intensive
  async handle(data) {
    await generateReport(data)
  }
})
```

Run dedicated workers:

```bash
# High concurrency for critical jobs
npx nuxt-queuekit worker --queue critical --concurrency 20

# Lower concurrency for resource-intensive jobs
npx nuxt-queuekit worker --queue reports --concurrency 2

# Default queue
npx nuxt-queuekit worker
```

### Error Handling Patterns

Handle failures gracefully:

```typescript
// server/jobs/SendNotification.ts
export default defineJob({
  async handle(data) {
    try {
      await sendPushNotification(data.userId, data.message)
      return { delivered: true }
    } catch (error) {
      // Log but don't throw - mark as handled
      if (error.code === 'DEVICE_NOT_FOUND') {
        console.log('Device not found, skipping')
        return { delivered: false, reason: 'device_not_found' }
      }
      
      // Throw to trigger retry
      throw error
    }
  },
  
  options: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 }
  },
  
  async onFailed(job, error) {
    // After all retries exhausted
    await logToMonitoring('notification_failed', {
      userId: job.data.userId,
      error: error.message
    })
  }
})
```

### Progress Tracking for Long Jobs

Report progress for better UX:

```typescript
// server/jobs/ProcessVideo.ts
export default defineJob({
  async handle(data, job) {
    const video = await downloadVideo(data.url)
    await job.updateProgress(20)
    
    const transcoded = await transcodeVideo(video)
    await job.updateProgress(60)
    
    const thumbnail = await generateThumbnail(transcoded)
    await job.updateProgress(80)
    
    const uploaded = await uploadToStorage(transcoded, thumbnail)
    await job.updateProgress(100)
    
    return { videoUrl: uploaded.url, thumbnailUrl: thumbnail.url }
  }
})
```

Monitor from client:

```vue
<script setup>
const progress = ref(0)
const status = ref('waiting')

async function processVideo(url: string) {
  const result = await queue.add('ProcessVideo', { url })
  
  // Poll for progress
  const interval = setInterval(async () => {
    const job = await $fetch(`/api/queue/default/${result.jobId}`)
    progress.value = job.progress || 0
    status.value = job.state
    
    if (job.state === 'completed' || job.state === 'failed') {
      clearInterval(interval)
    }
  }, 1000)
}
</script>

<template>
  <div>
    <progress :value="progress" max="100" />
    <p>Status: {{ status }}</p>
  </div>
</template>
```

## Configuration

### Environment Variables

Configure Redis connection via environment variables:

```bash
NUXT_REDIS_HOST=127.0.0.1
NUXT_REDIS_PORT=6379
NUXT_REDIS_PASSWORD=your-password
NUXT_REDIS_USERNAME=your-username
NUXT_REDIS_DB=0
```

### Module Options

Configure in `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  modules: ['nuxt-queuekit'],
  queue: {
    // Redis connection (optional if using env vars)
    redis: {
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD,
      username: process.env.REDIS_USERNAME,
      db: Number(process.env.REDIS_DB) || 0,
    },
    
    // Custom jobs directory (default: 'server/jobs')
    jobsDir: 'server/jobs',
    
    // Manually register jobs (optional)
    jobs: {
      // See "Registering Jobs from Config" below
    },
  }
})
```

### Registering Jobs from Config

Manually register jobs through configuration. Useful for:
- Jobs from npm packages
- Reusing jobs from different directories
- Programmatic job registration

**Note:** Config jobs are **appended** to auto-discovered jobs from `jobsDir`.

```typescript
export default defineNuxtConfig({
  modules: ['nuxt-queuekit'],
  queue: {
    jobs: {
      // Recommended: Use file paths
      SendNotification: './server/custom-jobs/SendNotification.ts',
      ProcessPayment: './server/payments/ProcessPayment.ts',
      
      // From npm package
      ThirdPartyJob: './node_modules/some-package/jobs/MyJob.js',
      
      // Inline definition (may trigger serialization warnings)
      SimpleJob: {
        async handle(data: { message: string }) {
          console.log('Processing:', data.message)
          return { success: true }
        },
        queue: 'default',
      },
    },
  }
})
```

Dispatch config jobs the same way:

```typescript
await dispatch('SendNotification', { userId: 123, message: 'Hello!' })
await dispatch('SimpleJob', { message: 'Test' })
```

## Production Deployment

### Running Workers in Production

Workers should run as separate processes from your web server:

```bash
# Build your app
npm run build

# Start web server (Process 1)
npm run start

# Start workers (Process 2+)
npx nuxt-queuekit worker --concurrency 10
```

### Using Process Managers

#### PM2

```bash
# Install PM2
npm install -g pm2

# Start web server
pm2 start npm --name "nuxt-app" -- start

# Start workers
pm2 start "npx nuxt-queuekit worker --concurrency 10" --name "worker-default"
pm2 start "npx nuxt-queuekit worker --queue emails --concurrency 5" --name "worker-emails"

# Scale workers
pm2 scale worker-default 3  # Run 3 instances

# Monitor
pm2 monit

# Save configuration
pm2 save
pm2 startup
```

#### Docker

```dockerfile
# Dockerfile.worker
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .
RUN npm run build

CMD ["npx", "nuxt-queuekit", "worker", "--concurrency", "10"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NUXT_REDIS_HOST=redis
    depends_on:
      - redis

  worker:
    build:
      context: .
      dockerfile: Dockerfile.worker
    environment:
      - NUXT_REDIS_HOST=redis
    depends_on:
      - redis
    deploy:
      replicas: 3  # Run 3 worker instances

volumes:
  redis-data:
```

### Kubernetes

```yaml
# worker-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: queue-worker
spec:
  replicas: 5
  selector:
    matchLabels:
      app: queue-worker
  template:
    metadata:
      labels:
        app: queue-worker
    spec:
      containers:
      - name: worker
        image: your-app:latest
        command: ["npx", "nuxt-queuekit", "worker"]
        args: ["--concurrency", "10"]
        env:
        - name: NUXT_REDIS_HOST
          value: "redis-service"
        - name: NUXT_REDIS_PORT
          value: "6379"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

### Worker CLI Options

```bash
npx nuxt-queuekit worker [options]

Options:
  --cwd <path>              Working directory (default: current directory)
  --queue <name>            Queue name (default: 'default')
  --worker <path>           Path to custom worker script
  --concurrency <number>    Concurrent jobs (default: 5)

Examples:
  npx nuxt-queuekit worker
  npx nuxt-queuekit worker --queue emails --concurrency 10
  npx nuxt-queuekit worker --queue processing --worker ./workers/custom.ts
```

### Scaling Strategy

Different queues for different workloads:

```bash
# High-priority, low-resource jobs (many workers)
npx nuxt-queuekit worker --queue critical --concurrency 20

# CPU-intensive jobs (fewer workers)
npx nuxt-queuekit worker --queue processing --concurrency 2

# I/O-bound jobs (moderate workers)
npx nuxt-queuekit worker --queue emails --concurrency 10

# Default queue
npx nuxt-queuekit worker --concurrency 5
```

## API Reference

### File-Based Jobs API

#### `defineJob<T>(definition)`

Define a job class with handler and lifecycle hooks.

**Type Parameters:**
- `T` - Type of job data

**Definition Object:**
- `handle(data: T, job: Job): Promise<any>` - Job processor function (required)
- `queue?: string` - Queue name (default: 'default')
- `options?: JobOptions` - BullMQ job options
- `onCompleted?(job: Job, result: any): Promise<void>` - Success callback
- `onFailed?(job: Job, error: Error): Promise<void>` - Failure callback

**Example:**
```typescript
export default defineJob<{ userId: string }>({
  async handle(data, job) {
    await processUser(data.userId)
    return { success: true }
  },
  queue: 'users',
  options: { attempts: 3 },
  async onCompleted(job, result) {
    console.log('Done!', result)
  }
})
```

#### `dispatch(jobName, data, options?)`

Dispatch a job by name (server-side only).

**Parameters:**
- `jobName: string` - Job name (use dot notation for nested jobs)
- `data: any` - Job data
- `options?: JobOptions` - Optional BullMQ job options

**Returns:** `Promise<{ jobId: string }>`

**Example:**
```typescript
const result = await dispatch('SendEmail', { to: 'user@example.com' })
console.log(result.jobId)

// Nested job
await dispatch('emails.Welcome', { userId: '123' })
```

### Client-Side API

#### `useQueue(queueName?)`

Get a queue instance for adding jobs from Vue components.

**Parameters:**
- `queueName?: string` - Queue name (default: 'default')

**Returns:** Queue instance with `add()` method

**Example:**
```typescript
const queue = useQueue()
const result = await queue.add('job-name', { data: 'value' })
```

### Server-Side API

#### `useQueue(queueName?)`

Get or create a queue instance (server-side).

**Parameters:**
- `queueName?: string` - Queue name (default: 'default')

**Returns:** BullMQ Queue instance

**Example:**
```typescript
const queue = useQueue('emails')
await queue.add('send-email', { to: 'user@example.com' })
```

#### `useQueueConnection()`

Get the Redis connection configuration.

**Returns:** Redis connection options object

**Example:**
```typescript
const connection = useQueueConnection()
console.log(connection.host, connection.port)
```

### Job Options

Common BullMQ job options (all optional, with defaults shown):

```typescript
interface JobOptions {
  delay?: number              // Delay in ms before processing (default: 0)
  priority?: number           // Priority (lower = higher priority, default: none)
  attempts?: number           // Max retry attempts (default: 1, no retries)
  backoff?: {                 // Retry backoff strategy (default: none, retries immediately)
    type: 'exponential' | 'fixed'
    delay: number
  }
  removeOnComplete?: boolean  // Auto-remove on success (default: false)
  removeOnFail?: boolean      // Auto-remove on failure (default: false)
  timeout?: number            // Job timeout in ms (default: none)
}
```

### Job Status Response

When checking job status via `/api/queue/[queueName]/[jobId]`:

```typescript
interface JobStatus {
  id: string
  name: string
  data: any
  state: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed'
  progress: number            // 0-100
  returnvalue?: any           // Job result
  failedReason?: string       // Error message if failed
  timestamp: number
  processedOn?: number
  finishedOn?: number
}
```

## Examples

### User Registration Flow

Complete user onboarding with multiple jobs:

```typescript
// server/jobs/SendWelcomeEmail.ts
export default defineJob({
  async handle(data: { userId: string, email: string, name: string }) {
    await sendEmail({
      to: data.email,
      subject: `Welcome ${data.name}!`,
      template: 'welcome',
      data: { name: data.name }
    })
  },
  options: { attempts: 3 }
})

// server/jobs/CreateUserProfile.ts
export default defineJob({
  async handle(data: { userId: string }) {
    await db.profiles.create({
      userId: data.userId,
      createdAt: new Date()
    })
  }
})

// server/jobs/SendSlackNotification.ts
export default defineJob({
  queue: 'notifications',
  async handle(data: { message: string }) {
    await fetch(process.env.SLACK_WEBHOOK, {
      method: 'POST',
      body: JSON.stringify({ text: data.message })
    })
  }
})

// server/api/register.post.ts
export default defineEventHandler(async (event) => {
  const { email, name, password } = await readBody(event)
  
  // Create user
  const user = await db.users.create({ email, name, password })
  
  // Dispatch jobs
  await Promise.all([
    dispatch('SendWelcomeEmail', { userId: user.id, email, name }),
    dispatch('CreateUserProfile', { userId: user.id }),
    dispatch('SendSlackNotification', { message: `New user: ${email}` })
  ])
  
  return { success: true, userId: user.id }
})
```

### Image Processing Pipeline

Process uploaded images with progress tracking:

```typescript
// server/jobs/ProcessImage.ts
export default defineJob({
  queue: 'media',
  async handle(data: { imageUrl: string, userId: string }, job) {
    // Download
    await job.updateProgress(10)
    const image = await downloadImage(data.imageUrl)
    
    // Resize variants
    await job.updateProgress(30)
    const thumbnail = await sharp(image).resize(200, 200).toBuffer()
    
    await job.updateProgress(50)
    const medium = await sharp(image).resize(800, 800).toBuffer()
    
    await job.updateProgress(70)
    const large = await sharp(image).resize(1920, 1920).toBuffer()
    
    // Upload to storage
    await job.updateProgress(85)
    const urls = await uploadImages({ thumbnail, medium, large })
    
    // Save to database
    await job.updateProgress(95)
    await db.images.create({
      userId: data.userId,
      original: data.imageUrl,
      ...urls
    })
    
    await job.updateProgress(100)
    return urls
  },
  options: {
    attempts: 2,
    timeout: 60000 // 1 minute
  }
})
```

### Scheduled Reports

Generate and email reports:

```typescript
// server/jobs/GenerateMonthlyReport.ts
export default defineJob({
  queue: 'reports',
  async handle(data: { userId: string, month: string }) {
    // Fetch data
    const userData = await db.analytics.findByMonth(data.userId, data.month)
    
    // Generate PDF
    const pdf = await generatePDF({
      template: 'monthly-report',
      data: userData
    })
    
    // Upload
    const url = await uploadToS3(pdf, `reports/${data.userId}/${data.month}.pdf`)
    
    // Email user
    await dispatch('SendEmail', {
      to: userData.email,
      subject: `Your ${data.month} Report`,
      body: `Your report is ready: ${url}`
    })
    
    return { reportUrl: url }
  },
  options: {
    attempts: 1,
    timeout: 300000 // 5 minutes
  }
})

// Schedule with cron or manually
// server/api/schedule-reports.post.ts
export default defineEventHandler(async () => {
  const users = await db.users.findAll()
  const month = new Date().toISOString().slice(0, 7) // YYYY-MM
  
  for (const user of users) {
    await dispatch('GenerateMonthlyReport', {
      userId: user.id,
      month
    })
  }
  
  return { scheduled: users.length }
})
```

### Webhook Processing

Handle incoming webhooks asynchronously:

```typescript
// server/jobs/ProcessStripeWebhook.ts
export default defineJob({
  queue: 'webhooks',
  async handle(data: { event: string, payload: any }) {
    switch (data.event) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(data.payload)
        break
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(data.payload)
        break
      case 'invoice.payment_failed':
        await handlePaymentFailure(data.payload)
        break
    }
  },
  options: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 5000 }
  },
  async onFailed(job, error) {
    // Alert on webhook processing failure
    await sendAlert({
      type: 'webhook_failed',
      event: job.data.event,
      error: error.message
    })
  }
})

// server/api/webhooks/stripe.post.ts
export default defineEventHandler(async (event) => {
  const payload = await readBody(event)
  
  // Verify webhook signature
  const signature = getHeader(event, 'stripe-signature')
  const verified = verifyStripeSignature(payload, signature)
  
  if (!verified) {
    throw createError({ statusCode: 401, message: 'Invalid signature' })
  }
  
  // Queue for processing
  await dispatch('ProcessStripeWebhook', {
    event: payload.type,
    payload: payload.data
  })
  
  return { received: true }
})
```

### Batch Data Export

Export large datasets with progress:

```typescript
// server/jobs/ExportUserData.ts
export default defineJob({
  queue: 'exports',
  async handle(data: { userId: string, format: 'csv' | 'json' }, job) {
    const BATCH_SIZE = 1000
    
    // Count total records
    const total = await db.userRecords.count({ userId: data.userId })
    let processed = 0
    
    const records = []
    
    // Process in batches
    for (let offset = 0; offset < total; offset += BATCH_SIZE) {
      const batch = await db.userRecords.findMany({
        where: { userId: data.userId },
        skip: offset,
        take: BATCH_SIZE
      })
      
      records.push(...batch)
      processed += batch.length
      
      await job.updateProgress(Math.round((processed / total) * 100))
    }
    
    // Generate file
    const file = data.format === 'csv' 
      ? generateCSV(records)
      : JSON.stringify(records, null, 2)
    
    // Upload
    const url = await uploadToS3(file, `exports/${data.userId}.${data.format}`)
    
    // Notify user
    await dispatch('SendEmail', {
      to: data.userId,
      subject: 'Your data export is ready',
      body: `Download: ${url}`
    })
    
    return { url, recordCount: total }
  },
  options: {
    timeout: 600000 // 10 minutes
  }
})
```

## Troubleshooting

### Redis Connection Issues

**Problem:** Worker can't connect to Redis

```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**Solutions:**
1. Ensure Redis is running: `redis-cli ping` (should return `PONG`)
2. Check Redis host/port in config or env vars
3. Verify firewall rules allow connection
4. For Docker: use service name instead of `localhost`

### Jobs Not Processing

**Problem:** Jobs added but never processed

**Solutions:**
1. Ensure worker is running: `npx nuxt-queuekit worker`
2. Check worker is listening to correct queue
3. Verify job is added to correct queue name
4. Check worker logs for errors

### Job Failures

**Problem:** Jobs failing repeatedly

**Solutions:**
1. Check job logs: `console.log` in job handler
2. Add error handling in job:
```typescript
export default defineJob({
  async handle(data) {
    try {
      await riskyOperation(data)
    } catch (error) {
      console.error('Job failed:', error)
      throw error // Re-throw to trigger retry
    }
  }
})
```
3. Increase retry attempts in job options
4. Add `onFailed` hook to debug

### Memory Issues

**Problem:** Worker consuming too much memory

**Solutions:**
1. Reduce concurrency: `--concurrency 2`
2. Process large data in chunks
3. Clear references after processing
4. Run multiple workers with lower concurrency each

### Stale Jobs

**Problem:** Old jobs stuck in queue

**Solutions:**
1. Add job timeout:
```typescript
options: {
  timeout: 30000 // 30 seconds
}
```
2. Enable auto-cleanup:
```typescript
options: {
  removeOnComplete: true,
  removeOnFail: { age: 86400 } // Remove after 24h
}
```
3. Manually clean with BullMQ utilities

### TypeScript Errors

**Problem:** `defineJob` not recognized

**Solution:** Ensure job-loader plugin is running. It's automatically loaded by the module.

**Problem:** Type errors in job data

**Solution:** Add type parameter:
```typescript
interface MyJobData {
  userId: string
  action: string
}

export default defineJob<MyJobData>({
  async handle(data) {
    // data is typed as MyJobData
  }
})
```

### Development vs Production

**Problem:** Works in dev but not production

**Solutions:**
1. Ensure Redis is accessible in production
2. Check environment variables are set
3. Verify worker is deployed and running
4. Check build includes job files
5. Review production logs for errors

## Architecture

Nuxt Queue uses a **two-process architecture** for reliability and performance:

### Process Separation

```
┌─────────────────────┐         ┌─────────┐         ┌──────────────────┐
│   Nuxt Web App      │────────▶│  Redis  │◀────────│  Worker Process  │
│   (Add Jobs)        │         │  Queue  │         │  (Process Jobs)  │
│                     │         │         │         │                  │
│ - API Routes        │         │ - Job   │         │ - Job Handlers   │
│ - Server Handlers   │         │   Queue │         │ - Auto-discovery │
│ - Client Code       │         │ - State │         │ - Concurrency    │
└─────────────────────┘         └─────────┘         └──────────────────┘
```

### Why Two Processes?

1. **Reliability** - Workers keep running even if web server restarts
2. **Performance** - Heavy job processing doesn't block HTTP requests
3. **Scalability** - Run multiple worker instances independently
4. **Resource Management** - Allocate different resources to web vs workers

### How It Works

1. **Web App** adds jobs to Redis queue via `dispatch()` or `useQueue()`
2. **Redis** stores jobs and manages queue state
3. **Worker** polls Redis, processes jobs, updates status
4. **Web App** can check job status via API endpoints

### Scaling Pattern

```bash
# Single web server
Web Server (1 instance)

# Multiple workers for different workloads
Worker - Critical Queue (5 instances, high concurrency)
Worker - Default Queue (3 instances, medium concurrency)
Worker - Reports Queue (1 instance, low concurrency)
```

## Requirements

- **Node.js** 18 or higher
- **Redis** 6 or higher
- **Nuxt** 3 or higher

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
  npx nuxt-queuekit worker --cwd playground
  
  # Build the playground
  npm run dev:build
  
  # Run ESLint
  npm run lint
  
  # Run Vitest
  npm run test
  npm run test:watch
  
  # Type check
  npm run test:types
  
  # Release new version
  npm run release
  ```

</details>

## License

MIT

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/nuxt-queuekit/latest.svg?style=flat&colorA=020420&colorB=00DC82
[npm-version-href]: https://npmjs.com/package/nuxt-queuekit

[npm-downloads-src]: https://img.shields.io/npm/dm/nuxt-queuekit.svg?style=flat&colorA=020420&colorB=00DC82
[npm-downloads-href]: https://npm.chart.dev/nuxt-queuekit

[license-src]: https://img.shields.io/npm/l/nuxt-queuekit.svg?style=flat&colorA=020420&colorB=00DC82
[license-href]: https://npmjs.com/package/nuxt-queuekit

[nuxt-src]: https://img.shields.io/badge/Nuxt-020420?logo=nuxt
[nuxt-href]: https://nuxt.com
