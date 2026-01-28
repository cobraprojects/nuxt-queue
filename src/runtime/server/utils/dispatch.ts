import type { JobsOptions, Job } from 'bullmq'
import { useServerQueue } from './composables'
import { getJob } from './jobRegistry'

export interface DispatchOptions extends Omit<JobsOptions, 'jobId'> {
  queue?: string
}

/**
 * Dispatch a job by name (File-Based Jobs API)
 *
 * @example
 * ```typescript
 * const job = await dispatch('SendEmailJob', { to: 'user@example.com' })
 * console.log('Job ID:', job.id)
 * ```
 */
export async function dispatch<T = unknown, R = unknown, N extends string = string>(
  jobName: string,
  data: T,
  options?: DispatchOptions,
): Promise<Job<T, R, N>> {
  const jobDefinition = getJob(jobName)

  if (!jobDefinition) {
    throw new Error(`Job "${jobName}" is not registered. Make sure it's defined in server/jobs/`)
  }

  const queueName = options?.queue || jobDefinition.queue || 'default'
  const queue = useServerQueue(queueName)

  // Merge job definition options with dispatch options
  const jobOptions = {
    ...jobDefinition.options,
    ...options,
  }

  // Only pass options if there are any
  const finalOptions = Object.keys(jobOptions).length > 0 ? jobOptions : undefined

  return await queue.add(jobName, data, finalOptions) as Job<T, R, N>
}
