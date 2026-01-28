import type { Job, WorkerOptions } from 'bullmq'
import { createWorker } from './queue'
import { useQueueConnection } from './composables'

export interface WorkerDefinition<T = unknown, R = unknown> {
  queueName?: string
  processor: (job: Job<T>) => Promise<R>
  options?: WorkerOptions
  onCompleted?: (job: Job<T>, result: R) => void | Promise<void>
  onFailed?: (job: Job<T> | undefined, error: Error) => void | Promise<void>
  onProgress?: (job: Job<T>, progress: number | object) => void | Promise<void>
}

export function defineWorker<T = unknown, R = unknown>(definition: WorkerDefinition<T, R>) {
  return () => {
    const connection = useQueueConnection()
    const queueName = definition.queueName || 'default'

    const worker = createWorker({
      queueName,
      connection,
      processor: definition.processor,
      options: definition.options,
    })

    if (definition.onCompleted) {
      worker.on('completed', definition.onCompleted)
    }

    if (definition.onFailed) {
      worker.on('failed', definition.onFailed)
    }

    if (definition.onProgress) {
      worker.on('progress', definition.onProgress as (job: Job, progress: number | object) => void)
    }

    return worker
  }
}
