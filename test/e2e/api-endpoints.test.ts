import { fileURLToPath } from 'node:url'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils/e2e'
import { Worker } from 'bullmq'

describe('API Endpoints E2E', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('../fixtures/basic', import.meta.url)),
  })

  let worker: Worker

  afterAll(async () => {
    await worker?.close()
  })

  describe('POST /api/queue/add', () => {
    it('should add a job to the queue', async () => {
      const response = await $fetch('/api/queue/add', {
        method: 'POST',
        body: {
          queueName: 'default',
          jobName: 'test-job',
          data: { message: 'Hello World' },
        },
      })

      expect(response).toBeDefined()
      expect(response.jobId).toBeDefined()
      expect(response.queueName).toBe('default')
    })

    it('should add a job with options', async () => {
      const response = await $fetch('/api/queue/add', {
        method: 'POST',
        body: {
          queueName: 'default',
          jobName: 'delayed-job',
          data: { test: 'data' },
          options: {
            delay: 5000,
            priority: 1,
          },
        },
      })

      expect(response).toBeDefined()
      expect(response.jobId).toBeDefined()
    })

    it('should handle custom queue names', async () => {
      const response = await $fetch('/api/queue/add', {
        method: 'POST',
        body: {
          queueName: 'custom-queue',
          jobName: 'custom-job',
          data: { custom: 'data' },
        },
      })

      expect(response).toBeDefined()
      expect(response.queueName).toBe('custom-queue')
    })

    it('should return error for invalid request', async () => {
      try {
        await $fetch('/api/queue/add', {
          method: 'POST',
          body: {
            // Missing required fields
          },
        })
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error).toBeDefined()
      }
    })
  })

  describe('GET /api/queue/[queueName]/[jobId]', () => {
    it('should get job status', async () => {
      // First add a job
      const addResponse = await $fetch('/api/queue/add', {
        method: 'POST',
        body: {
          queueName: 'default',
          jobName: 'status-test',
          data: { test: 'status' },
        },
      })

      // Then get its status
      const statusResponse = await $fetch(
        `/api/queue/${addResponse.queueName}/${addResponse.jobId}`
      )

      expect(statusResponse).toBeDefined()
      expect(statusResponse.id).toBe(addResponse.jobId)
      expect(statusResponse.name).toBe('status-test')
      expect(statusResponse.data).toEqual({ test: 'status' })
    })

    it('should return null for non-existent job', async () => {
      const response = await $fetch('/api/queue/default/non-existent-id')
      expect(response).toBeUndefined()
    })
  })
})
