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

- 🚀 &nbsp;**Separate Worker Process** - Workers run independently from your web server
- 📦 &nbsp;**BullMQ Powered** - Robust Redis-backed queue system
- 🔄 &nbsp;**Simple API** - Easy job creation from client and server
- � &nbsp;**Job Status** - Built-in endpoints to check job progress
- ⚡ &nbsp;**Scalable** - Run multiple worker processes for high throughput
- 🎯 &nbsp;**Type Safe** - Full TypeScript support

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

### Defining Custom Workers

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
