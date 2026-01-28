import type { JobsOptions } from 'bullmq'
import { useQueue } from './composables'
import { getJob } from './jobRegistry'

export interface DispatchOptions extends Omit<JobsOptions, 'jobId'> {
  queue?: string
}

/**
 * Dispatch a job by name (File-Based Jobs API)
 *
 * @example
 * ```typescript
 * await dispatch('SendEmailJob', { to: 'user@example.com' })
 * ```
 */
export async function dispatch<T = unknown>(
  jobName: string,
  data: T,
  options?: DispatchOptions,
) {
  const jobDefinition = getJob(jobName)

  if (!jobDefinition) {
    throw new Error(`Job "${jobName}" is not registered. Make sure it's defined in server/jobs/`)
  }

  const queueName = options?.queue || jobDefinition.queue || 'default'
  const queue = useQueue(queueName)

  // Merge job definition options with dispatch options
  const jobOptions = {
    ...jobDefinition.options,
    ...options,
  }

  // Only pass options if there are any
  const finalOptions = Object.keys(jobOptions).length > 0 ? jobOptions : undefined

  const result = await queue.add(jobName, data, finalOptions)

  return {
    jobId: result.id,
    queueName,
  }
}
