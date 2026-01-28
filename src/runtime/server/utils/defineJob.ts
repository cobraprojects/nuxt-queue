import type { Job } from 'bullmq'

export interface JobDefinition<T = unknown, R = unknown> {
  /**
   * The job handler function
   */
  handle: (data: T, job: Job<T>) => Promise<R> | R

  /**
   * Queue name (defaults to 'default')
   */
  queue?: string

  /**
   * Job options
   */
  options?: {
    attempts?: number
    backoff?: {
      type: 'exponential' | 'fixed'
      delay: number
    }
    priority?: number
    delay?: number
    removeOnComplete?: boolean
    removeOnFail?: boolean
  }

  /**
   * Called when job completes successfully
   */
  onCompleted?: (job: Job<T>, result: R) => void | Promise<void>

  /**
   * Called when job fails
   */
  onFailed?: (job: Job<T> | undefined, error: Error) => void | Promise<void>
}

/**
 * Define a job class for file-based job handling
 */
export function defineJob<T = unknown, R = unknown>(definition: JobDefinition<T, R>) {
  return definition
}
