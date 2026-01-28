<template>
  <div style="padding: 2rem; font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto;">
    <h1>⚡ Real-time Job Monitoring</h1>
    <p>Watch job progress update in real-time using Redis Pub/Sub (&lt; 100ms latency)</p>

    <div style="margin-top: 2rem; border: 2px solid #4CAF50; padding: 1.5rem; border-radius: 8px; background: #f0fff0;">
      <h2>🎯 Client-Side: useQueue()</h2>
      <p style="margin-bottom: 1rem; color: #666;">
        Uses the client composable with reactive refs
      </p>
      <button
        :disabled="isProcessing"
        style="padding: 0.75rem 1.5rem; font-size: 1rem; cursor: pointer; background: #4CAF50; color: white; border: none; border-radius: 4px;"
        @click="startJob"
      >
        {{ isProcessing ? 'Processing...' : 'Start Data Processing Job' }}
      </button>
    </div>

    <div style="margin-top: 2rem; border: 2px solid #FF9800; padding: 1.5rem; border-radius: 8px; background: #fff8e1;">
      <h2>🚀 Server-Side: dispatch()</h2>
      <p style="margin-bottom: 1rem; color: #666;">
        Uses dispatch() from API route with completion alert
      </p>
      <button
        :disabled="isDispatchProcessing"
        style="padding: 0.75rem 1.5rem; font-size: 1rem; cursor: pointer; background: #FF9800; color: white; border: none; border-radius: 4px;"
        @click="startDispatchJob"
      >
        {{ isDispatchProcessing ? 'Processing...' : 'Dispatch Job from Server' }}
      </button>
    </div>

    <div
      v-if="jobInfo"
      style="margin-top: 2rem; border: 2px solid #2196F3; padding: 1.5rem; border-radius: 8px; background: #e3f2fd;"
    >
      <h2>📊 Live Job Status</h2>

      <div style="margin-bottom: 1rem;">
        <strong>Job ID:</strong> <code>{{ jobInfo.jobId }}</code>
      </div>

      <div style="margin-bottom: 1rem;">
        <strong>Queue:</strong> <code>{{ jobInfo.queueName }}</code>
      </div>

      <div style="margin-bottom: 1rem;">
        <strong>Status:</strong>
        <span
          :style="{
            padding: '0.25rem 0.75rem',
            borderRadius: '4px',
            fontWeight: 'bold',
            background: statusColor,
            color: 'white',
          }"
        >
          {{ status }}
        </span>
      </div>

      <div style="margin-bottom: 1rem;">
        <strong>Progress:</strong>
        <div style="background: #ddd; height: 30px; border-radius: 4px; overflow: hidden; margin-top: 0.5rem;">
          <div
            :style="{
              width: `${progress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #4CAF50, #8BC34A)',
              transition: 'width 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
            }"
          >
            {{ progress }}%
          </div>
        </div>
      </div>

      <div
        v-if="result"
        style="margin-top: 1rem;"
      >
        <strong>Result:</strong>
        <pre style="background: white; padding: 1rem; border-radius: 4px; overflow-x: auto; margin-top: 0.5rem;">{{ JSON.stringify(result, null, 2) }}</pre>
      </div>

      <div
        v-if="error"
        style="margin-top: 1rem; padding: 1rem; background: #ffebee; border-radius: 4px; color: #c62828;"
      >
        <strong>Error:</strong> {{ error }}
      </div>
    </div>

    <div style="margin-top: 2rem; padding: 1rem; background: #fff3cd; border-radius: 8px;">
      <h3>💡 How It Works</h3>
      <ul>
        <li><strong>Zero Configuration:</strong> Real-time updates work automatically</li>
        <li><strong>Redis Pub/Sub:</strong> Events are published when job state changes</li>
        <li><strong>Server-Sent Events (SSE):</strong> Browser receives updates instantly</li>
        <li><strong>Sub-100ms Latency:</strong> Progress updates appear in real-time</li>
        <li><strong>Auto Cleanup:</strong> Connection closes when job completes</li>
        <li><strong>Lifecycle Hooks:</strong> onCompleted/onFailed run server-side + events stream to client</li>
      </ul>
    </div>

    <div style="margin-top: 1rem; padding: 1rem; background: #e3f2fd; border-radius: 8px;">
      <h3>🚀 Usage in Your Code</h3>
      <pre style="background: white; padding: 1rem; border-radius: 4px; overflow-x: auto;"><code>// Client-side (Vue components)
const { progress, status, result } = await queue.add('ProcessData', data)

// Server-side (API routes)
const job = await dispatch('ProcessData', data)
console.log('Job ID:', job.id)

// Both methods stream events to frontend automatically!
// progress, status, and result are reactive refs
watch(status, (value) => {
  if (value === 'completed') {
    alert('Job completed!')
  }
})</code></pre>
    </div>

    <div style="margin-top: 2rem; text-align: center;">
      <NuxtLink
        to="/"
        style="color: #2196F3; text-decoration: none; font-weight: bold;"
      >
        ← Back to Main Playground
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { JobResponse } from '../../src/runtime/composables/useQueue'

// Use the composable directly - auto-imported, works in client-side!
const queue = useQueue()

const isProcessing = ref(false)
const isDispatchProcessing = ref(false)
const jobInfo = ref<{ jobId: string, queueName: string } | null>(null)
const progress = ref(0)
const status = ref<'waiting' | 'active' | 'completed' | 'failed' | 'delayed'>('waiting')
const result = ref<unknown>(null)
const error = ref<string | null>(null)

const statusColor = computed(() => {
  switch (status.value) {
    case 'waiting':
      return '#9E9E9E'
    case 'active':
      return '#2196F3'
    case 'completed':
      return '#4CAF50'
    case 'failed':
      return '#F44336'
    default:
      return '#9E9E9E'
  }
})

async function startJob() {
  isProcessing.value = true
  progress.value = 0
  status.value = 'waiting'
  result.value = null
  error.value = null

  try {
    // Use the new real-time API
    const job: JobResponse = await queue.add('ProcessDataJob', {
      userId: 999,
      action: 'realtime-demo',
      data: { items: 50 },
    })

    // Store job info
    jobInfo.value = {
      jobId: job.jobId,
      queueName: job.queueName,
    }

    // Directly assign the refs from the job response
    progress.value = job.progress.value
    status.value = job.status.value
    result.value = job.result.value
    error.value = job.error.value

    // Watch the refs directly (not through getters)
    watch(job.progress, (value) => {
      progress.value = value
    })

    watch(job.status, (value) => {
      status.value = value
      if (value === 'completed') {
        isProcessing.value = false
        // Delay alert to let progress bar animate to 100%
        setTimeout(() => {
          alert('✅ Job completed successfully!')
        }, 300)
      }
      if (value === 'failed') {
        isProcessing.value = false
        alert('❌ Job failed!')
      }
    })

    watch(job.result, (value) => {
      result.value = value
    })

    watch(job.error, (value) => {
      error.value = value
    })
  }
  catch (err) {
    error.value = (err as Error).message
    isProcessing.value = false
  }
}

async function startDispatchJob() {
  isDispatchProcessing.value = true
  progress.value = 0
  status.value = 'waiting'
  result.value = null
  error.value = null

  try {
    // Call API route that uses dispatch()
    const response = await $fetch<{ success: boolean, jobId: string, queueName: string }>('/api/dispatch-realtime-demo', {
      method: 'POST',
    })

    // Store job info
    jobInfo.value = {
      jobId: response.jobId,
      queueName: response.queueName,
    }

    // Now connect to SSE for real-time updates
    const eventSource = new EventSource(`/api/queue/${response.queueName}/${response.jobId}/events`)

    eventSource.onmessage = (event) => {
      try {
        const eventData = JSON.parse(event.data)

        if (eventData.type === 'connected') {
          return
        }

        if (eventData.type === 'progress') {
          progress.value = eventData.progress ?? 0
        }
        else if (eventData.type === 'active') {
          status.value = 'active'
        }
        else if (eventData.type === 'completed') {
          status.value = 'completed'
          result.value = eventData.result ?? null
          progress.value = 100
          isDispatchProcessing.value = false
          eventSource.close()
          // Delay alert to let progress bar animate to 100%
          setTimeout(() => {
            alert('✅ Dispatch job completed successfully!')
          }, 300)
        }
        else if (eventData.type === 'failed') {
          status.value = 'failed'
          error.value = eventData.error ?? 'Unknown error'
          isDispatchProcessing.value = false
          eventSource.close()
          alert('❌ Dispatch job failed!')
        }
        else if (eventData.type === 'waiting') {
          status.value = 'waiting'
        }
      }
      catch (err) {
        console.error('Failed to parse SSE event:', err)
      }
    }

    eventSource.onerror = () => {
      eventSource.close()
      isDispatchProcessing.value = false
    }
  }
  catch (err) {
    error.value = (err as Error).message
    isDispatchProcessing.value = false
  }
}
</script>
