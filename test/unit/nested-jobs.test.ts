import { describe, it, expect, beforeEach } from 'vitest'
import { registerJob, getJob, clearJobs } from '../../src/runtime/server/utils/jobRegistry'

describe('nested job directories', () => {
  beforeEach(() => {
    clearJobs()
  })

  it('should register jobs with dot notation for nested directories', () => {
    const emailJob = {
      handle: async (data: { to: string }) => {
        return { sent: true, to: data.to }
      },
    }

    const notificationJob = {
      handle: async (data: { userId: number }) => {
        return { sent: true, userId: data.userId }
      },
    }

    // Register jobs as they would be from nested directories
    registerJob('emails.WelcomeEmail', emailJob)
    registerJob('notifications.PushNotification', notificationJob)

    expect(getJob('emails.WelcomeEmail')).toBe(emailJob)
    expect(getJob('notifications.PushNotification')).toBe(notificationJob)
  })

  it('should support deeply nested job paths', () => {
    const deepJob = {
      handle: async () => ({ success: true }),
    }

    registerJob('admin.reports.monthly.GenerateReport', deepJob)

    expect(getJob('admin.reports.monthly.GenerateReport')).toBe(deepJob)
  })

  it('should distinguish between jobs with similar names in different directories', () => {
    const emailNotification = {
      handle: async () => ({ type: 'email' }),
    }

    const pushNotification = {
      handle: async () => ({ type: 'push' }),
    }

    registerJob('notifications.email.SendNotification', emailNotification)
    registerJob('notifications.push.SendNotification', pushNotification)

    expect(getJob('notifications.email.SendNotification')).toBe(emailNotification)
    expect(getJob('notifications.push.SendNotification')).toBe(pushNotification)
  })

  it('should handle root level and nested jobs together', () => {
    const rootJob = {
      handle: async () => ({ level: 'root' }),
    }

    const nestedJob = {
      handle: async () => ({ level: 'nested' }),
    }

    registerJob('RootJob', rootJob)
    registerJob('nested.NestedJob', nestedJob)

    expect(getJob('RootJob')).toBe(rootJob)
    expect(getJob('nested.NestedJob')).toBe(nestedJob)
  })

  it('should return undefined for non-existent nested jobs', () => {
    expect(getJob('nonexistent.job.path')).toBeUndefined()
  })
})
