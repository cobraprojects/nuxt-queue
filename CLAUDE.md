# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nuxt QueueKit is a Nuxt 3 module providing background job queue functionality using BullMQ and Redis. It uses a **two-process architecture** where the web app adds jobs to a Redis queue and separate worker processes handle the actual job execution.

## Common Commands

### Development
```bash
# Prepare development environment (build stubs, prepare playground)
npm run dev:prepare

# Start development server with playground
npm run dev

# In another terminal, start the worker process
npx nuxt-queuekit worker --cwd playground
```

### Testing
```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run specific test suites
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests only
npm run test:e2e         # E2E tests only

# Type checking
npm run test:types
```

### Build and Release
```bash
# Build playground
npm run dev:build

# Lint code
npm run lint

# Full release (lint, test, build, changelog, publish)
npm run release
```

### Worker CLI
```bash
# Start worker for default queue (concurrency: 5)
npx nuxt-queuekit worker

# Start worker for specific queue
npx nuxt-queuekit worker --queue emails

# Start worker for multiple queues (priority order)
npx nuxt-queuekit worker --queues high,default,low

# Set custom concurrency
npx nuxt-queuekit worker --concurrency 10

# Use custom worker script
npx nuxt-queuekit worker --worker ./workers/custom.ts

# Run from different working directory
npx nuxt-queuekit worker --cwd /path/to/project
```

## Architecture

### Two-Process Design

The module separates job creation from job execution:

1. **Web App Process** - Adds jobs to Redis queue via `dispatch()` or `useQueue()`
2. **Worker Process** - Polls Redis, processes jobs, publishes status updates

This ensures reliability (workers survive web server restarts), performance (heavy processing doesn't block HTTP requests), and scalability (multiple workers can be run independently).

### Key Components

#### Module Entry (`src/module.ts`)
- Main Nuxt module configuration
- Sets up runtime config for Redis connection
- Registers API routes: `/api/queue/add`, `/api/queue/:queueName/:jobId`, `/api/queue/:queueName/:jobId/events`
- Adds server utilities and composables
- Registers job-loader plugin for auto-discovery

#### Worker CLI (`src/cli/worker.ts`)
- Standalone worker process
- Auto-discovers jobs from `server/jobs/` (recursively scans subdirectories)
- Creates BullMQ workers for specified queues
- Wraps `job.updateProgress()` to publish Redis pub/sub events
- Executes lifecycle hooks (`onCompleted`, `onFailed`) after job completion/failure

#### Client-Side Composable (`src/runtime/composables/useQueue.ts`)
- `useQueue(queueName)` - Returns queue instance with `add()` method
- Returns reactive `JobResponse` with auto-updating refs via SSE (Server-Sent Events)
- Auto-closes SSE connections on component unmount

#### Server-Side Dispatch (`src/runtime/server/utils/dispatch.ts`)
- `dispatch(jobName, data, options)` - File-based job dispatch
- Returns reactive `JobResponse` with auto-updating refs via Redis pub/sub
- Validates job exists in registry before dispatching

#### Job Registry (`src/runtime/server/utils/jobRegistry.ts`)
- Global registry storing job definitions
- Jobs registered via `defineJob()` in `server/jobs/` files
- Supports nested job names (e.g., `emails.WelcomeEmail` for `server/jobs/emails/WelcomeEmail.ts`)

### Real-Time Updates Flow

**Server-side (`dispatch()`)**: Redis Pub/Sub → Worker publishes events → Server subscriber updates refs

**Client-side (`useQueue()`)**: SSE endpoint → Worker publishes events → Client receives via EventSource

Both paths provide the same reactive `JobResponse` interface.

## Job Definition Pattern

Jobs are defined in `server/jobs/` using the `defineJob()` helper:

```typescript
// server/jobs/SendEmail.ts
export default defineJob<{ to: string }>({
  // Required: Job handler
  async handle(data, job) {
    await job.updateProgress(50)
    await sendEmail(data.to)
    return { sent: true }
  },

  // Optional: Queue name (default: 'default')
  queue: 'emails',

  // Optional: BullMQ job options (attempts, backoff, timeout, etc.)
  options: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 }
  },

  // Optional: Lifecycle hooks
  async onCompleted(job, result) {
    console.log('Email sent:', result)
  },

  async onFailed(job, error) {
    console.error('Failed to send email:', error)
  }
})
```

## Configuration

### Environment Variables
- `NUXT_REDIS_HOST` - Redis host (default: 127.0.0.1)
- `NUXT_REDIS_PORT` - Redis port (default: 6379)
- `NUXT_REDIS_PASSWORD` - Redis password
- `NUXT_REDIS_USERNAME` - Redis username
- `NUXT_REDIS_DB` - Redis database number (default: 0)

### Module Options (`nuxt.config.ts`)
```typescript
export default defineNuxtConfig({
  modules: ['nuxt-queuekit'],
  queue: {
    redis: { host, port, password, username, db },
    jobsDir: 'server/jobs',  // Custom jobs directory
    jobs: {
      // Manual job registration (file paths or inline definitions)
      MyJob: './server/custom-jobs/MyJob.ts'
    }
  }
})
```

## API Patterns

### File-Based Jobs (Recommended)
Use `dispatch()` for quick one-off job dispatching:
```typescript
const { jobId, progress, status, result } = await dispatch('SendEmail', { to: 'user@example.com' })
```

### Queue Composable
Use `useQueue()` when dispatching multiple jobs or in Vue components:
```typescript
const queue = useQueue('emails')
const { jobId, progress, status } = await queue.add('SendEmail', { to: 'user@example.com' })
```

Both return identical reactive `JobResponse` objects with real-time updates.

## Directory Structure

```
src/
├── module.ts                    # Main Nuxt module
├── runtime/
│   ├── composables/
│   │   └── useQueue.ts         # Client-side queue composable
│   ├── server/
│   │   ├── api/queue/           # API endpoints
│   │   ├── plugins/
│   │   │   └── job-loader.ts   # Auto-discovers jobs from server/jobs/
│   │   └── utils/
│   │       ├── defineJob.ts     # Job definition helper
│   │       ├── dispatch.ts     # File-based job dispatch
│   │       ├── jobRegistry.ts  # Global job registry
│   │       ├── pubsub.ts       # Redis pub/sub utilities
│   │       └── composables.ts  # Server-side composables
└── cli/
    ├── index.ts                # CLI entry point
    └── worker.ts               # Worker CLI command
```
