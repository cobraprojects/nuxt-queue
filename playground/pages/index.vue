<template>
  <div style="padding: 2rem; font-family: system-ui, sans-serif;">
    <h1>Nuxt Queue Playground</h1>
    <p>Test the queue system with different worker types</p>

    <!-- Real-time Demo Link -->
    <div style="margin-top: 1rem; padding: 1rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; text-align: center;">
      <h2 style="color: white; margin: 0 0 0.5rem 0;">
        ⚡ NEW: Real-time Job Monitoring
      </h2>
      <p style="color: white; margin: 0 0 1rem 0;">
        Watch job progress update instantly with Redis Pub/Sub (&lt; 100ms latency)
      </p>
      <NuxtLink
        to="/realtime"
        style="display: inline-block; padding: 0.75rem 1.5rem; background: white; color: #667eea; text-decoration: none; border-radius: 4px; font-weight: bold;"
      >
        Try Real-time Demo →
      </NuxtLink>
    </div>

    <div style="display: grid; gap: 1rem; margin-top: 2rem;">
      <!-- File-Based Jobs Section -->
      <div style="border: 2px solid #4CAF50; padding: 1rem; border-radius: 8px; background: #f0fff0;">
        <h2>🎯 File-Based Jobs (New!)</h2>
        <p>Test the new file-based job dispatch system with auto-discovery</p>

        <div style="display: grid; gap: 1rem; margin-top: 1rem;">
          <!-- Send Email Job -->
          <div style="background: white; padding: 1rem; border-radius: 4px;">
            <h3>📧 Send Email Job</h3>
            <button
              :disabled="loading.fileBasedEmail"
              style="padding: 0.5rem 1rem; cursor: pointer;"
              @click="dispatchEmailJob"
            >
              {{ loading.fileBasedEmail ? 'Dispatching...' : 'Dispatch SendEmailJob' }}
            </button>
            <div
              v-if="results.fileBasedEmail"
              style="margin-top: 1rem;"
            >
              <pre style="background: #f5f5f5; padding: 1rem; border-radius: 4px; overflow-x: auto;">{{ results.fileBasedEmail }}</pre>
              <button
                :disabled="!results.fileBasedEmail?.jobId"
                style="margin-top: 0.5rem; padding: 0.5rem 1rem; cursor: pointer;"
                @click="checkStatus(results.fileBasedEmail?.queueName || 'default', results.fileBasedEmail?.jobId || '')"
              >
                Check Status
              </button>
            </div>
          </div>

          <!-- Process Data Job -->
          <div style="background: white; padding: 1rem; border-radius: 4px;">
            <h3>⚙️ Process Data Job</h3>
            <button
              :disabled="loading.fileBasedData"
              style="padding: 0.5rem 1rem; cursor: pointer;"
              @click="dispatchDataJob"
            >
              {{ loading.fileBasedData ? 'Dispatching...' : 'Dispatch ProcessDataJob' }}
            </button>
            <div
              v-if="results.fileBasedData"
              style="margin-top: 1rem;"
            >
              <pre style="background: #f5f5f5; padding: 1rem; border-radius: 4px; overflow-x: auto;">{{ results.fileBasedData }}</pre>
              <button
                :disabled="!results.fileBasedData?.jobId"
                style="margin-top: 0.5rem; padding: 0.5rem 1rem; cursor: pointer;"
                @click="checkStatus(results.fileBasedData?.queueName || 'default', results.fileBasedData?.jobId || '')"
              >
                Check Status
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Email Worker Test -->
      <div style="border: 1px solid #ccc; padding: 1rem; border-radius: 8px;">
        <h2>📧 Email Worker</h2>
        <p>Tests worker with progress updates and event handlers</p>
        <button
          :disabled="loading.email"
          style="padding: 0.5rem 1rem; cursor: pointer;"
          @click="testEmailWorker"
        >
          {{ loading.email ? 'Processing...' : 'Send Test Email' }}
        </button>
        <div
          v-if="results.email"
          style="margin-top: 1rem;"
        >
          <pre style="background: #f5f5f5; padding: 1rem; border-radius: 4px; overflow-x: auto;">{{ results.email }}</pre>
          <button
            :disabled="!results.email?.jobId"
            style="margin-top: 0.5rem; padding: 0.5rem 1rem; cursor: pointer;"
            @click="checkStatus('emails', results.email?.jobId || '')"
          >
            Check Status
          </button>
        </div>
      </div>

      <!-- Notification Worker Test -->
      <div style="border: 1px solid #ccc; padding: 1rem; border-radius: 8px;">
        <h2>🔔 Notification Worker</h2>
        <p>Tests worker with rate limiting (max 10 jobs/sec)</p>
        <button
          :disabled="loading.notification"
          style="padding: 0.5rem 1rem; cursor: pointer;"
          @click="testNotificationWorker"
        >
          {{ loading.notification ? 'Processing...' : 'Send Test Notification' }}
        </button>
        <div
          v-if="results.notification"
          style="margin-top: 1rem;"
        >
          <pre style="background: #f5f5f5; padding: 1rem; border-radius: 4px; overflow-x: auto;">{{ results.notification }}</pre>
          <button
            :disabled="!results.notification?.jobId"
            style="margin-top: 0.5rem; padding: 0.5rem 1rem; cursor: pointer;"
            @click="checkStatus('notifications', results.notification?.jobId || '')"
          >
            Check Status
          </button>
        </div>
      </div>

      <!-- Data Processing Worker Test -->
      <div style="border: 1px solid #ccc; padding: 1rem; border-radius: 8px;">
        <h2>⚙️ Data Processing Worker</h2>
        <p>Tests batch processing with detailed progress tracking</p>
        <button
          :disabled="loading.dataProcessing"
          style="padding: 0.5rem 1rem; cursor: pointer;"
          @click="testDataProcessing"
        >
          {{ loading.dataProcessing ? 'Processing...' : 'Process Batch Data' }}
        </button>
        <div
          v-if="results.dataProcessing"
          style="margin-top: 1rem;"
        >
          <pre style="background: #f5f5f5; padding: 1rem; border-radius: 4px; overflow-x: auto;">{{ results.dataProcessing }}</pre>
          <button
            :disabled="!results.dataProcessing?.jobId"
            style="margin-top: 0.5rem; padding: 0.5rem 1rem; cursor: pointer;"
            @click="checkStatus('data-processing', results.dataProcessing?.jobId || '')"
          >
            Check Status
          </button>
        </div>
      </div>

      <!-- Original Test -->
      <div style="border: 1px solid #ccc; padding: 1rem; border-radius: 8px;">
        <h2>🔧 Custom Job Test</h2>
        <p>Add a custom job to the default queue</p>
        <div style="margin-bottom: 1rem;">
          <input
            v-model="jobName"
            placeholder="Job name"
            style="padding: 0.5rem; margin-right: 0.5rem;"
          >
          <input
            v-model="jobData"
            placeholder="Job data (JSON)"
            style="padding: 0.5rem; margin-right: 0.5rem; width: 300px;"
          >
        </div>
        <button
          style="padding: 0.5rem 1rem; cursor: pointer;"
          @click="addJob"
        >
          Add Job
        </button>
        <div
          v-if="result"
          style="margin-top: 1rem;"
        >
          <pre style="background: #f5f5f5; padding: 1rem; border-radius: 4px; overflow-x: auto;">{{ result }}</pre>
        </div>
        <div
          v-if="error"
          style="margin-top: 1rem; padding: 1rem; background: #fee; border-radius: 4px; color: #c00;"
        >
          <strong>Error:</strong> {{ error }}
        </div>
      </div>
    </div>

    <!-- Job Status Display -->
    <div
      v-if="jobStatus"
      style="margin-top: 2rem; border: 2px solid #4CAF50; padding: 1rem; border-radius: 8px;"
    >
      <h2>📊 Job Status</h2>
      <pre style="background: #f5f5f5; padding: 1rem; border-radius: 4px; overflow-x: auto;">{{ jobStatus }}</pre>
    </div>

    <div style="margin-top: 2rem; padding: 1rem; background: #fff3cd; border-radius: 8px;">
      <h3>💡 Instructions</h3>
      <ol>
        <li>Make sure Redis is running on localhost:6379</li>
        <li>Start the Nuxt dev server: <code>npm run dev</code></li>
        <li>In another terminal, start workers: <code>npx nuxt-queuekit worker --cwd playground</code></li>
        <li>Click the buttons above to test different worker types</li>
        <li>Check your terminal to see worker event logs (onCompleted, onFailed, onProgress)</li>
      </ol>
    </div>
  </div>
</template>

<script setup lang="ts">
const queue = useQueue()

const jobName = ref('test-job')
const jobData = ref('{"message": "Hello from queue!"}')
const result = ref()
const error = ref()

const loading = ref({
  email: false,
  notification: false,
  dataProcessing: false,
  fileBasedEmail: false,
  fileBasedData: false,
})

const results = ref<Record<string, { jobId?: string, error?: string, success?: boolean, queueName?: string, message?: string, itemCount?: number } | null>>({
  email: null,
  notification: null,
  dataProcessing: null,
  fileBasedEmail: null,
  fileBasedData: null,
})

const jobStatus = ref<{
  id?: string
  name?: string
  data?: unknown
  progress?: number
  state?: string
  returnvalue?: unknown
  failedReason?: string
  timestamp?: number
  processedOn?: number
  finishedOn?: number
  error?: string
} | null>(null)

async function addJob() {
  try {
    error.value = null
    result.value = null

    const data = JSON.parse(jobData.value)
    const response = await queue.add(jobName.value, data)

    result.value = response
  }
  catch (e: unknown) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}

async function testEmailWorker() {
  loading.value.email = true
  try {
    const response = await $fetch('/api/test-email', { method: 'POST' })
    results.value.email = response
  }
  catch (err) {
    results.value.email = { error: (err as Error).message }
  }
  finally {
    loading.value.email = false
  }
}

async function testNotificationWorker() {
  loading.value.notification = true
  try {
    const response = await $fetch('/api/test-notification', { method: 'POST' })
    results.value.notification = response
  }
  catch (err) {
    results.value.notification = { error: (err as Error).message }
  }
  finally {
    loading.value.notification = false
  }
}

async function testDataProcessing() {
  loading.value.dataProcessing = true
  try {
    const response = await $fetch('/api/test-data-processing', { method: 'POST' })
    results.value.dataProcessing = response
  }
  catch (err) {
    results.value.dataProcessing = { error: (err as Error).message }
  }
  finally {
    loading.value.dataProcessing = false
  }
}

async function checkStatus(queueName: string, jobId: string) {
  if (!jobId) return

  try {
    const status = await $fetch(`/api/queue/${queueName}/${jobId}`)
    jobStatus.value = status as typeof jobStatus.value
  }
  catch (err) {
    jobStatus.value = { error: (err as Error).message }
  }
}

async function dispatchEmailJob() {
  loading.value.fileBasedEmail = true
  try {
    const response = await $fetch('/api/dispatch-email', {
      method: 'POST',
      body: {
        to: 'test@example.com',
        subject: 'File-Based Job Test',
        body: 'This email was sent using the new file-based job system!',
      },
    })
    results.value.fileBasedEmail = response
  }
  catch (err) {
    results.value.fileBasedEmail = { error: (err as Error).message }
  }
  finally {
    loading.value.fileBasedEmail = false
  }
}

async function dispatchDataJob() {
  loading.value.fileBasedData = true
  try {
    const response = await $fetch('/api/dispatch-data', {
      method: 'POST',
      body: {
        userId: 456,
        action: 'process-batch',
        data: { items: 100 },
      },
    })
    results.value.fileBasedData = response
  }
  catch (err) {
    results.value.fileBasedData = { error: (err as Error).message }
  }
  finally {
    loading.value.fileBasedData = false
  }
}
</script>
