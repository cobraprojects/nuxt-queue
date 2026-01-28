import { describe, it, expect } from 'vitest'
import type { ModuleOptions } from '../../src/module'

describe('jobs configuration', () => {
  it('should accept file paths in module config', () => {
    const moduleOptions: ModuleOptions = {
      redis: {
        host: '127.0.0.1',
        port: 6379,
      },
      jobs: {
        CustomJob: './server/jobs/CustomJob.ts',
        AnotherJob: './server/jobs/emails/WelcomeEmail.ts',
      },
    }

    expect(moduleOptions.jobs).toBeDefined()
    expect(moduleOptions.jobs?.CustomJob).toBe('./server/jobs/CustomJob.ts')
    expect(moduleOptions.jobs?.AnotherJob).toBe('./server/jobs/emails/WelcomeEmail.ts')
  })

  it('should accept inline job definitions in module config', () => {
    const moduleOptions: ModuleOptions = {
      redis: {
        host: '127.0.0.1',
        port: 6379,
      },
      jobs: {
        CustomJob: {
          handle: async (data) => {
            return { processed: true, data }
          },
          queue: 'custom',
        },
      },
    }

    expect(moduleOptions.jobs).toBeDefined()
    expect(moduleOptions.jobs?.CustomJob).toBeDefined()
    if (moduleOptions.jobs?.CustomJob && typeof moduleOptions.jobs.CustomJob !== 'string') {
      expect(typeof moduleOptions.jobs.CustomJob.handle).toBe('function')
    }
  })

  it('should allow mixing file paths and inline definitions', () => {
    const moduleOptions: ModuleOptions = {
      redis: {
        host: '127.0.0.1',
        port: 6379,
      },
      jobs: {
        FileJob: './server/jobs/FileJob.ts',
        InlineJob: {
          handle: async () => ({ success: true }),
        },
        AnotherFileJob: './server/jobs/AnotherJob.ts',
      },
    }

    expect(Object.keys(moduleOptions.jobs || {}).length).toBe(3)
    expect(typeof moduleOptions.jobs?.FileJob).toBe('string')
    expect(typeof moduleOptions.jobs?.InlineJob).toBe('object')
    expect(typeof moduleOptions.jobs?.AnotherFileJob).toBe('string')
  })

  it('should allow jobs with lifecycle hooks', () => {
    const moduleOptions: ModuleOptions = {
      redis: {
        host: '127.0.0.1',
        port: 6379,
      },
      jobs: {
        JobWithHooks: {
          handle: async data => data,
          onCompleted: async () => {
            // Hook logic
          },
          onFailed: async () => {
            // Hook logic
          },
        },
      },
    }

    expect(moduleOptions.jobs?.JobWithHooks).toBeDefined()
    if (moduleOptions.jobs?.JobWithHooks && typeof moduleOptions.jobs.JobWithHooks !== 'string') {
      expect(moduleOptions.jobs.JobWithHooks.onCompleted).toBeDefined()
      expect(moduleOptions.jobs.JobWithHooks.onFailed).toBeDefined()
      expect(typeof moduleOptions.jobs.JobWithHooks.onCompleted).toBe('function')
      expect(typeof moduleOptions.jobs.JobWithHooks.onFailed).toBe('function')
    }
  })

  it('should allow empty jobs object', () => {
    const moduleOptions: ModuleOptions = {
      redis: {
        host: '127.0.0.1',
        port: 6379,
      },
      jobs: {},
    }

    expect(moduleOptions.jobs).toBeDefined()
    expect(Object.keys(moduleOptions.jobs || {}).length).toBe(0)
  })

  it('should allow jobs to be undefined', () => {
    const moduleOptions: ModuleOptions = {
      redis: {
        host: '127.0.0.1',
        port: 6379,
      },
    }

    expect(moduleOptions.jobs).toBeUndefined()
  })
})
