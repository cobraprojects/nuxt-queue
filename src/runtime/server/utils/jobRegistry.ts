import type { JobDefinition } from './defineJob'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const jobRegistry = new Map<string, JobDefinition<any, any>>()

/**
 * Register a job in the global registry
 */
export function registerJob<T = unknown, R = unknown>(name: string, definition: JobDefinition<T, R>) {
  jobRegistry.set(name, definition)
}

/**
 * Get a job definition by name
 */
export function getJob<T = unknown, R = unknown>(name: string): JobDefinition<T, R> | undefined {
  return jobRegistry.get(name) as JobDefinition<T, R> | undefined
}

/**
 * Get all registered jobs
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getAllJobs(): Map<string, JobDefinition<any, any>> {
  return jobRegistry
}

/**
 * Check if a job is registered
 */
export function hasJob(name: string): boolean {
  return jobRegistry.has(name)
}
