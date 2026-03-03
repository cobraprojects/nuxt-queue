import type { ConnectionOptions, JobsOptions } from 'bullmq'
import { ref, type Ref } from 'vue'
import { getJob } from './jobRegistry'
import { useQueueConnection } from './composables'
import { subscribeToJob } from './pubsub'
import type { JobResponse } from '../../composables/useQueue'

// Re-export for convenience
export type { JobResponse }

export interface DispatchOptions extends Omit<JobsOptions, 'jobId'> {
  queue?: string
}

/**
 * Type guard to check if connection has Redis options
 */
function isRedisOptions(conn: ConnectionOptions): conn is { host: string, port: number, password?: string, username?: string, db: number } {
  return 'host' in conn && 'port' in conn
}

/**
 * Dispatch a job by name (File-Based Jobs API)
 * Server runtime helper that returns reactive refs with real-time updates
 *
 * @example
 * ```typescript
 * const { jobId, progress, status, result } = await dispatch('SendEmailJob', {
 *   to: 'user@example.com'
 * })
 *
 * // Watch progress in real-time
 * watch(progress, (value) => console.log(`Progress: ${value}%`))
 * ```
 */
export async function dispatch<T = unknown, R = unknown>(
  jobName: string,
  data: T,
  options?: DispatchOptions,
): Promise<JobResponse<R>> {
  const jobDefinition = getJob(jobName)

  if (!jobDefinition) {
    throw new Error(`Job "${jobName}" is not registered. Make sure it's defined in server/jobs/`)
  }

  const queueName = options?.queue || jobDefinition.queue || 'default'

  // Merge job definition options with dispatch options
  const jobOptions = {
    ...jobDefinition.options,
    ...options,
  }

  // Call the API endpoint
  const response = await $fetch<{ jobId: string }>('/api/queue/add', {
    method: 'POST',
    body: {
      queueName,
      jobName,
      data,
      options: Object.keys(jobOptions).length > 0 ? jobOptions : undefined,
    },
  })

  const jobId = response.jobId

  // Create reactive refs
  const progress = ref(0)
  const status = ref<'waiting' | 'active' | 'completed' | 'failed' | 'delayed'>('waiting')
  const result = ref<R | null>(null)
  const error = ref<string | null>(null)

  // Subscribe to job events via Redis Pub/Sub (server-side)
  const connection = useQueueConnection()
  // ConnectionOptions can be Redis or Cluster, we only support Redis for now
  if (isRedisOptions(connection)) {
    const redisOptions = {
      host: connection.host,
      port: connection.port,
      password: connection.password,
      username: connection.username,
      db: connection.db,
    }
    let unsubscribe: (() => Promise<void>) | null = null
    let isUnsubscribed = false
    const safeUnsubscribe = async () => {
      if (unsubscribe && !isUnsubscribed) {
        isUnsubscribed = true
        await unsubscribe()
      }
    }

    unsubscribe = await subscribeToJob(redisOptions, queueName, jobId, (event) => {
      if (event.type === 'progress') {
        progress.value = event.progress ?? 0
      }
      else if (event.type === 'active') {
        status.value = 'active'
      }
      else if (event.type === 'completed') {
        status.value = 'completed'
        result.value = event.result as R ?? null
        progress.value = 100
        void safeUnsubscribe()
      }
      else if (event.type === 'failed') {
        status.value = 'failed'
        error.value = event.error ?? 'Unknown error'
        void safeUnsubscribe()
      }
      else if (event.type === 'waiting') {
        status.value = 'waiting'
      }
    })
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

  // Utility method to manually refresh status
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
}
