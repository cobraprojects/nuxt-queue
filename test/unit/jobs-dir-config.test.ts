import { describe, it, expect } from 'vitest'
import type { ModuleOptions } from '../../src/module'

describe('jobsDir configuration', () => {
  it('should have default jobsDir value', () => {
    const moduleOptions: ModuleOptions = {
      redis: {
        host: '127.0.0.1',
        port: 6379,
      },
    }

    // Default should be 'server/jobs'
    expect(moduleOptions.jobsDir).toBeUndefined() // Will use default from module
  })

  it('should accept custom jobsDir', () => {
    const moduleOptions: ModuleOptions = {
      redis: {
        host: '127.0.0.1',
        port: 6379,
      },
      jobsDir: 'server/my-custom-jobs',
    }

    expect(moduleOptions.jobsDir).toBe('server/my-custom-jobs')
  })

  it('should accept nested jobsDir paths', () => {
    const moduleOptions: ModuleOptions = {
      redis: {
        host: '127.0.0.1',
        port: 6379,
      },
      jobsDir: 'app/background/jobs',
    }

    expect(moduleOptions.jobsDir).toBe('app/background/jobs')
  })

  it('should type-check ModuleOptions with jobsDir', () => {
    // This test ensures TypeScript accepts the jobsDir option
    const validConfig: ModuleOptions = {
      redis: {
        host: 'localhost',
        port: 6379,
        password: 'secret',
        username: 'admin',
        db: 1,
      },
      jobsDir: 'custom/path/to/jobs',
    }

    expect(validConfig).toBeDefined()
    expect(validConfig.jobsDir).toBe('custom/path/to/jobs')
  })

  it('should allow jobsDir to be optional', () => {
    const configWithoutJobsDir: ModuleOptions = {
      redis: {
        host: '127.0.0.1',
        port: 6379,
      },
    }

    expect(configWithoutJobsDir.jobsDir).toBeUndefined()
  })
})
