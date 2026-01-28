import type { ConnectionOptions, Queue } from 'bullmq'
import { createQueue, getQueue } from './queue'
import { useRuntimeConfig } from '#imports'

let connectionConfig: ConnectionOptions | null = null

export function useQueueConnection(): ConnectionOptions {
  if (connectionConfig) {
    return connectionConfig
  }

  const config = useRuntimeConfig()
  const queueConfig = config.queue || {}

  connectionConfig = {
    host: queueConfig.redis?.host || '127.0.0.1',
    port: queueConfig.redis?.port || 6379,
    password: queueConfig.redis?.password || undefined,
    username: queueConfig.redis?.username || undefined,
    db: queueConfig.redis?.db || 0,
  }

  return connectionConfig
}

export function useQueue<T = unknown, R = unknown, N extends string = string>(name: string = 'default') {
  const existing = getQueue(name)
  if (existing) {
    return existing as Queue<T, R, N>
  }

  const connection = useQueueConnection()
  return createQueue({ name, connection }) as Queue<T, R, N>
}
