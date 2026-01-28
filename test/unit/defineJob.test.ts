import { describe, it, expect } from 'vitest'
import { defineJob } from '../../src/runtime/server/utils/defineJob'

describe('defineJob', () => {
  it('should create a job definition with handle function', () => {
    const job = defineJob({
      async handle(data) {
        return { processed: true, data }
      },
    })

    expect(job).toBeDefined()
    expect(job.handle).toBeTypeOf('function')
  })

  it('should accept queue name', () => {
    const job = defineJob({
      queue: 'emails',
      async handle(data) {
        return data
      },
    })

    expect(job.queue).toBe('emails')
  })

  it('should accept job options', () => {
    const job = defineJob({
      async handle(data) {
        return data
      },
      options: {
        attempts: 3,
        priority: 1,
      },
    })

    expect(job.options).toEqual({
      attempts: 3,
      priority: 1,
    })
  })

  it('should accept lifecycle hooks', () => {
    const onCompleted = async () => {}
    const onFailed = async () => {}

    const job = defineJob({
      async handle(data) {
        return data
      },
      onCompleted,
      onFailed,
    })

    expect(job.onCompleted).toBe(onCompleted)
    expect(job.onFailed).toBe(onFailed)
  })

  it('should support TypeScript generics', () => {
    interface EmailData {
      to: string
      subject: string
    }

    interface EmailResult {
      sent: boolean
      timestamp: string
    }

    const job = defineJob<EmailData, EmailResult>({
      async handle(_data) {
        return {
          sent: true,
          timestamp: new Date().toISOString(),
        }
      },
    })

    expect(job.handle).toBeTypeOf('function')
  })
})
