import { describe, it, expect, beforeEach } from 'vitest'
import { registerJob, getJob, getAllJobs, hasJob } from '../../src/runtime/server/utils/jobRegistry'
import { defineJob } from '../../src/runtime/server/utils/defineJob'

describe('jobRegistry', () => {
  beforeEach(() => {
    // Clear registry before each test
    const allJobs = getAllJobs()
    allJobs.clear()
  })

  it('should register a job', () => {
    const job = defineJob({
      async handle(data) {
        return data
      },
    })

    registerJob('TestJob', job)

    expect(hasJob('TestJob')).toBe(true)
  })

  it('should retrieve a registered job', () => {
    const job = defineJob({
      async handle(_data) {
        return { processed: true }
      },
    })

    registerJob('EmailJob', job)

    const retrieved = getJob('EmailJob')
    expect(retrieved).toBe(job)
  })

  it('should return undefined for unregistered job', () => {
    const retrieved = getJob('NonExistentJob')
    expect(retrieved).toBeUndefined()
  })

  it('should check if job exists', () => {
    const job = defineJob({
      async handle(data) {
        return data
      },
    })

    expect(hasJob('MyJob')).toBe(false)

    registerJob('MyJob', job)

    expect(hasJob('MyJob')).toBe(true)
  })

  it('should get all registered jobs', () => {
    const job1 = defineJob({
      async handle(data) {
        return data
      },
    })

    const job2 = defineJob({
      async handle(data) {
        return data
      },
    })

    registerJob('Job1', job1)
    registerJob('Job2', job2)

    const allJobs = getAllJobs()
    expect(allJobs.size).toBe(2)
    expect(allJobs.has('Job1')).toBe(true)
    expect(allJobs.has('Job2')).toBe(true)
  })

  it('should overwrite existing job with same name', () => {
    const job1 = defineJob({
      async handle(_data) {
        return { version: 1 }
      },
    })

    const job2 = defineJob({
      async handle(_data) {
        return { version: 2 }
      },
    })

    registerJob('TestJob', job1)
    registerJob('TestJob', job2)

    const retrieved = getJob('TestJob')
    expect(retrieved).toBe(job2)
  })
})
