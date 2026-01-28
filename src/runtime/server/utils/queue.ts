import { Queue, Worker, type Job, type ConnectionOptions, type WorkerOptions, type QueueOptions } from 'bullmq'

export interface QueueConfig {
  name: string
  connection: ConnectionOptions
  options?: QueueOptions
}

export interface WorkerConfig<T = unknown, R = unknown> {
  queueName: string
  connection: ConnectionOptions
  processor: (job: Job<T>) => Promise<R>
  options?: Omit<WorkerOptions, 'connection'>
}

const queues = new Map<string, Queue>()
const workers = new Map<string, Worker>()

export function createQueue(config: QueueConfig): Queue {
  if (queues.has(config.name)) {
    return queues.get(config.name)!
  }

  const queue = new Queue(config.name, {
    connection: config.connection,
    ...config.options,
  })

  queues.set(config.name, queue)
  return queue
}

export function createWorker<T = unknown, R = unknown>(config: WorkerConfig<T, R>): Worker {
  const workerId = `${config.queueName}-worker`

  if (workers.has(workerId)) {
    return workers.get(workerId)!
  }

  const worker = new Worker(
    config.queueName,
    config.processor,
    {
      connection: config.connection,
      ...config.options,
    },
  )

  workers.set(workerId, worker)
  return worker
}

export function getQueue(name: string): Queue | undefined {
  return queues.get(name)
}

export function getWorker(queueName: string): Worker | undefined {
  return workers.get(`${queueName}-worker`)
}

export async function closeAll() {
  await Promise.all([
    ...Array.from(queues.values()).map(q => q.close()),
    ...Array.from(workers.values()).map(w => w.close()),
  ])
  queues.clear()
  workers.clear()
}
