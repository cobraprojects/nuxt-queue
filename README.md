# Nuxt Queue

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

Background job queue for Nuxt applications, powered by BullMQ and Redis.

## Table of Contents

- [What You Get](#what-you-get)
- [Quick Start](#quick-start)
- [Core Workflow](#core-workflow)
- [Monitor and Control Jobs](#monitor-and-control-jobs)
- [Configuration](#configuration)
- [Production](#production)
- [API Reference](#api-reference)
- [Troubleshooting](#troubleshooting)

## What You Get

- File-based jobs (`server/jobs/**`) with auto-discovery
- Separate worker process for background execution
- Redis-backed queues via BullMQ
- Real-time progress/status updates
- Job lifecycle hooks (`onCompleted`, `onFailed`)
- Queue stats + cancel/retry endpoints
- Full TypeScript support

## Quick Start

### 1. Prerequisite

Run Redis:

```bash
docker run -d -p 6379:6379 redis
```

### 2. Install

```bash
npx nuxi@latest module add nuxt-queuekit
```

Or manually:

```bash
npm install nuxt-queuekit
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-queuekit'],
})
```

### 3. Start app + worker

```bash
# terminal 1
npm run dev

# terminal 2
npx nuxt-queuekit worker
```

That is enough to run jobs using default Redis (`127.0.0.1:6379`).

## Core Workflow

### Step 1: Define a job

Create a file in `server/jobs`:

```ts
// server/jobs/SendWelcomeEmail.ts
interface WelcomeEmailData {
  userId: string
  email: string
  name: string
}

export default defineJob<WelcomeEmailData>({
  async handle(data) {
    await sendEmail({
      to: data.email,
      subject: 'Welcome!',
      template: 'welcome',
      data: { name: data.name },
    })

    return { success: true }
  },
})
```

`defineJob` is auto-imported in job files.

### Step 2: Dispatch from server runtime

Use `dispatch()` in server runtime code (API routes, server plugins, server utilities):

```ts
// server/api/register.post.ts
export default defineEventHandler(async (event) => {
  const { email, name } = await readBody(event)
  const user = await createUser({ email, name })

  const { jobId } = await dispatch('SendWelcomeEmail', {
    userId: user.id,
    email: user.email,
    name: user.name,
  })

  return { success: true, jobId }
})
```

### Step 3: Dispatch from client components

Use `useQueue()` on the client:

```vue
<script setup lang="ts">
const queue = useQueue('default')

async function start() {
  const { jobId, progress, status, result, error } = await queue.add('SendWelcomeEmail', {
    userId: '1',
    email: 'user@example.com',
    name: 'User',
  })
}
</script>
```

### Organize jobs in folders

Nested files map to dot notation:

```text
server/jobs/
  emails/NewsletterEmail.ts
  media/ProcessImage.ts
```

```ts
await dispatch('emails.NewsletterEmail', { ... })
await dispatch('media.ProcessImage', { ... })
```

### Job options and retries

```ts
export default defineJob({
  queue: 'payments',
  options: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  },
  async handle(data) {
    return processPayment(data)
  },
})
```

### Lifecycle hooks

```ts
export default defineJob({
  async handle(data, job) {
    await job.updateProgress(50)
    const output = await generateReport(data)
    await job.updateProgress(100)
    return output
  },

  async onCompleted(job, result) {
    await notifyUser(job.data.userId, result)
  },

  async onFailed(job, error) {
    await alertAdmin(job?.data?.userId, error.message)
  },
})
```

## Monitor and Control Jobs

### Check one job

```ts
const status = await $fetch(`/api/queue/${queueName}/${jobId}`)
// status.state -> waiting | active | completed | failed | delayed
```

### Stream live events (SSE)

```ts
const es = new EventSource(`/api/queue/${queueName}/${jobId}/events`)
```

### Cancel waiting/delayed job

```ts
await $fetch(`/api/queue/${queueName}/${jobId}/cancel`, { method: 'POST' })
```

### Retry failed job

```ts
await $fetch(`/api/queue/${queueName}/${jobId}/retry`, { method: 'POST' })
```

### Queue statistics

```ts
const { stats, loading, error, refresh } = useQueueStats('default')
await refresh()
```

## Configuration

### Environment variables

```bash
NUXT_REDIS_HOST=127.0.0.1
NUXT_REDIS_PORT=6379
NUXT_REDIS_PASSWORD=
NUXT_REDIS_USERNAME=
NUXT_REDIS_DB=0
```

### Module options

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-queuekit'],
  queue: {
    redis: {
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD,
      username: process.env.REDIS_USERNAME,
      db: Number(process.env.REDIS_DB) || 0,
    },

    // default: server/jobs
    jobsDir: 'server/jobs',

    // optional extra jobs
    jobs: {
      SendNotification: './server/custom-jobs/SendNotification.ts',
    },
  },
})
```

`jobs` entries are appended to auto-discovered jobs from `jobsDir`.

## Production

Run web server and workers as separate processes:

```bash
npm run build
npm run start
npx nuxt-queuekit worker --concurrency 10
```

### Worker CLI

```bash
npx nuxt-queuekit worker [options]

Options:
  --cwd <path>              Working directory (default: current directory)
  --queue <name>            Single queue name (legacy flag)
  --queues <names>          Comma-separated queues in priority order
  --worker <path>           Path to custom worker script
  --concurrency <number>    Concurrent jobs per worker (default: 5)
```

Examples:

```bash
npx nuxt-queuekit worker
npx nuxt-queuekit worker --queue emails --concurrency 10
npx nuxt-queuekit worker --queues critical,default,low --concurrency 5
npx nuxt-queuekit worker --queue processing --worker ./workers/custom.ts
```

## API Reference

### `defineJob<T, R>(definition)`

```ts
export default defineJob<{ userId: string }, { ok: true }>({
  queue: 'default',
  options: { attempts: 3 },
  async handle(data, job) {
    await job.updateProgress(100)
    return { ok: true }
  },
  async onCompleted(job, result) {},
  async onFailed(job, error) {},
})
```

### `dispatch(jobName, data, options?)`

Server runtime helper that creates a job and returns reactive refs:

```ts
const { jobId, queueName, progress, status, result, error, refresh, cancel, retry } =
  await dispatch('SendEmail', { to: 'user@example.com' })
```

### `useQueue(queueName?)`

```ts
const queue = useQueue('default')
const job = await queue.add('SendEmail', { to: 'user@example.com' })
```

### `useServerQueue(queueName?)`

Returns BullMQ `Queue` directly (advanced/non-reactive):

```ts
const queue = useServerQueue('emails')
await queue.add('send-email', { to: 'user@example.com' })
```

### `useQueueStats(queueName = 'default')`

```ts
const { stats, loading, error, refresh } = useQueueStats()
await refresh()
```

### REST endpoints

- `POST /api/queue/add`
- `GET /api/queue/:queueName/:jobId`
- `GET /api/queue/:queueName/:jobId/events`
- `POST /api/queue/:queueName/:jobId/cancel`
- `POST /api/queue/:queueName/:jobId/retry`
- `GET /api/queue/:queueName/stats`

## Troubleshooting

### Job not registered

- Ensure file is under configured `jobsDir`
- Ensure default export is `defineJob({ ... })`
- Restart dev server and worker after adding new files

### Worker is running but jobs do not process

- Confirm Redis is reachable from worker process
- Confirm queue names match (`job.queue` vs worker `--queue/--queues`)

### No real-time updates

- Ensure worker is running (worker publishes events)
- Check network/proxy supports SSE

---

## License

[MIT License](./LICENSE)

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/nuxt-queuekit/latest.svg?style=flat&colorA=020420&colorB=00DC82
[npm-version-href]: https://npmjs.com/package/nuxt-queuekit
[npm-downloads-src]: https://img.shields.io/npm/dm/nuxt-queuekit.svg?style=flat&colorA=020420&colorB=00DC82
[npm-downloads-href]: https://npm.chart.dev/nuxt-queuekit
[license-src]: https://img.shields.io/npm/l/nuxt-queuekit.svg?style=flat&colorA=020420&colorB=00DC82
[license-href]: https://npmjs.com/package/nuxt-queuekit
[nuxt-src]: https://img.shields.io/badge/Nuxt-020420?logo=nuxt.js
[nuxt-href]: https://nuxt.com
