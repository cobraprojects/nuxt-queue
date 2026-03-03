import { ref, onUnmounted, getCurrentInstance, type Ref } from 'vue'

export interface JobResponse<R = unknown> {
  jobId: string
  queueName: string
  progress: Ref<number>
  status: Ref<'waiting' | 'active' | 'completed' | 'failed' | 'delayed'>
  result: Ref<R | null>
  error: Ref<string | null>
  cancel: () => Promise<void>
  retry: () => Promise<void>
  refresh: () => Promise<void>
}

export function useQueue(queueName = 'default') {
  // Store active event sources for cleanup
  const eventSources = new Set<EventSource>()

  // Cleanup all event sources when component unmounts (only in component context)
  // Check if we're inside a component before calling onUnmounted
  if (getCurrentInstance()) {
    onUnmounted(() => {
      eventSources.forEach(es => es.close())
      eventSources.clear()
    })
  }

  return {
    async add<T = unknown, R = unknown>(jobName: string, data: T, options?: unknown): Promise<JobResponse<R>> {
      const response = await $fetch<{ jobId: string }>('/api/queue/add', {
        method: 'POST',
        body: {
          queueName,
          jobName,
          data,
          options,
        },
      })

      const jobId = response.jobId

      // Create reactive refs
      const progress = ref(0)
      const status = ref<'waiting' | 'active' | 'completed' | 'failed' | 'delayed'>('waiting')
      const result = ref<R | null>(null)
      const error = ref<string | null>(null)

      // Auto-connect to SSE for real-time updates
      if (typeof EventSource !== 'undefined') {
        try {
          const eventSource = new EventSource(`/api/queue/${queueName}/${jobId}/events`)
          eventSources.add(eventSource)

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
                eventSource.close()
                eventSources.delete(eventSource)
              }
              else if (eventData.type === 'failed') {
                status.value = 'failed'
                error.value = eventData.error ?? 'Unknown error'
                eventSource.close()
                eventSources.delete(eventSource)
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
            // Set failed state so caller knows
            status.value = 'failed'
            error.value = 'Failed to connect to job events'
            eventSource.close()
            eventSources.delete(eventSource)
          }
        }
        catch (err) {
          // Set failed state when EventSource creation fails
          status.value = 'failed'
          error.value = 'Failed to connect to job events'
          console.error('Failed to create EventSource:', err)
        }
      }

      // Utility methods
      const cancel = async () => {
        // @ts-expect-error - $fetch type inference issue with dynamic routes
        await $fetch(`/api/queue/${queueName}/${jobId}/cancel`, { method: 'POST' })
      }

      const retry = async () => {
        // @ts-expect-error - $fetch type inference issue with dynamic routes
        await $fetch(`/api/queue/${queueName}/${jobId}/retry`, { method: 'POST' })
      }

      const refresh = async () => {
        const job = await $fetch<{
          progress?: number
          state: string
          returnvalue?: R
          failedReason?: string
        }>(`/api/queue/${queueName}/${jobId}`)
        progress.value = job.progress ?? 0
        status.value = job.state as 'waiting' | 'active' | 'completed' | 'failed' | 'delayed'
        result.value = job.returnvalue ?? null
        error.value = job.failedReason ?? null
      }

      return {
        jobId,
        queueName,
        progress,
        status,
        result: result as Ref<R | null>,
        error,
        cancel,
        retry,
        refresh,
      }
    },
  }
}
