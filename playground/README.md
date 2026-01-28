# Playground - defineWorker Examples

This playground demonstrates the `defineWorker()` API with event handlers.

## Setup

1. Make sure Redis is running:
```bash
redis-server
```

2. Start the Nuxt dev server:
```bash
npm run dev
```

3. In another terminal, start the workers:
```bash
npx nuxt-queue worker --cwd playground
```

4. Open http://localhost:3000 in your browser

## What's Included

### Worker Definitions (`server/plugins/workers.ts`)

Three example workers demonstrating different features:

1. **Email Worker** (`emails` queue)
   - Progress updates (25%, 50%, 75%, 100%)
   - `onCompleted` handler logging success
   - `onFailed` handler for error tracking
   - `onProgress` handler for real-time updates

2. **Notification Worker** (`notifications` queue)
   - Rate limiting (max 10 jobs/second)
   - Concurrency control (5 concurrent jobs)
   - Event handlers for monitoring

3. **Data Processing Worker** (`data-processing` queue)
   - Batch processing with progress tracking
   - Processes 10 items with progress updates
   - Demonstrates long-running job patterns

### API Endpoints

- `POST /api/test-email` - Add email job
- `POST /api/test-notification` - Add notification job
- `POST /api/test-data-processing` - Add batch processing job
- `GET /api/queue/[queueName]/[jobId]` - Check job status

### UI (`app.vue`)

Interactive playground with:
- Buttons to trigger each worker type
- Job status checking
- Real-time result display
- Progress monitoring

## Event Handlers

All workers use event handlers to demonstrate monitoring:

```typescript
defineWorker({
  queueName: 'emails',
  processor: async (job) => {
    // Process the job
    await job.updateProgress(50)
    return { success: true }
  },
  onCompleted: async (job, result) => {
    console.log('✅ Job completed:', job.id)
  },
  onFailed: async (job, error) => {
    console.error('❌ Job failed:', error.message)
  },
  onProgress: async (job, progress) => {
    console.log('📊 Progress:', progress)
  }
})
```

## Monitoring

Watch the terminal where you started the workers to see:
- Job processing logs
- Progress updates
- Completion/failure events
- Error messages

## Testing

1. Click "Send Test Email" - watch for progress updates in terminal
2. Click "Send Test Notification" - see rate limiting in action
3. Click "Process Batch Data" - observe batch processing with progress
4. Use "Check Status" buttons to see job state and results
