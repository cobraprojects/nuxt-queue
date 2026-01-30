import { describe, it, expect, afterEach, vi, afterAll } from 'vitest'
import { createQueue, createWorker, getQueue, getWorker, closeAll } from '../../src/runtime/server/utils/queue'

describe('Queue Utils', () => {
  const mockConnection = {
    host: '127.0.0.1',
    port: 6379,
    db: 0,
  }

  afterEach(async () => {
    await closeAll()
    // Give time for connections to fully close
    await new Promise(resolve => setTimeout(resolve, 100))
  })

  afterAll(async () => {
    // Final cleanup
    await closeAll()
    await new Promise(resolve => setTimeout(resolve, 100))
  })

  describe('createQueue', () => {
    it('should create a new queue', () => {
      const queue = createQueue({
        name: 'test-queue',
        connection: mockConnection,
      })

      expect(queue).toBeDefined()
      expect(queue.name).toBe('test-queue')
    })

    it('should return existing queue if already created', () => {
      const queue1 = createQueue({
        name: 'test-queue',
        connection: mockConnection,
      })

      const queue2 = createQueue({
        name: 'test-queue',
        connection: mockConnection,
      })

      expect(queue1).toBe(queue2)
    })

    it('should create different queues for different names', () => {
      const queue1 = createQueue({
        name: 'queue-1',
        connection: mockConnection,
      })

      const queue2 = createQueue({
        name: 'queue-2',
        connection: mockConnection,
      })

      expect(queue1).not.toBe(queue2)
      expect(queue1.name).toBe('queue-1')
      expect(queue2.name).toBe('queue-2')
    })
  })

  describe('createWorker', () => {
    it('should create a new worker', () => {
      const processor = vi.fn(async () => ({ processed: true }))

      const worker = createWorker({
        queueName: 'test-queue',
        connection: mockConnection,
        processor,
      })

      expect(worker).toBeDefined()
      expect(worker.name).toBe('test-queue')
    })

    it('should return existing worker if already created', () => {
      const processor = vi.fn(async () => ({ processed: true }))

      const worker1 = createWorker({
        queueName: 'test-queue',
        connection: mockConnection,
        processor,
      })

      const worker2 = createWorker({
        queueName: 'test-queue',
        connection: mockConnection,
        processor,
      })

      expect(worker1).toBe(worker2)
    })
  })

  describe('getQueue', () => {
    it('should return undefined for non-existent queue', () => {
      const queue = getQueue('non-existent')
      expect(queue).toBeUndefined()
    })

    it('should return existing queue', () => {
      createQueue({
        name: 'test-queue',
        connection: mockConnection,
      })

      const queue = getQueue('test-queue')
      expect(queue).toBeDefined()
      expect(queue?.name).toBe('test-queue')
    })
  })

  describe('getWorker', () => {
    it('should return undefined for non-existent worker', () => {
      const worker = getWorker('non-existent')
      expect(worker).toBeUndefined()
    })

    it('should return existing worker', () => {
      const processor = vi.fn(async () => ({ processed: true }))

      createWorker({
        queueName: 'test-queue',
        connection: mockConnection,
        processor,
      })

      const worker = getWorker('test-queue')
      expect(worker).toBeDefined()
      expect(worker?.name).toBe('test-queue')
    })
  })

  describe('closeAll', () => {
    it('should close all queues and workers', async () => {
      const processor = vi.fn(async () => ({ processed: true }))

      createQueue({
        name: 'queue-1',
        connection: mockConnection,
      })

      createQueue({
        name: 'queue-2',
        connection: mockConnection,
      })

      createWorker({
        queueName: 'worker-1',
        connection: mockConnection,
        processor,
      })

      await closeAll()

      expect(getQueue('queue-1')).toBeUndefined()
      expect(getQueue('queue-2')).toBeUndefined()
      expect(getWorker('worker-1')).toBeUndefined()
    })
  })
})
