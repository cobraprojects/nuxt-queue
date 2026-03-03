import Redis from 'ioredis'
import type { RedisOptions } from 'ioredis'

export interface JobEvent {
  jobId: string
  queueName: string
  jobName: string
  type: 'progress' | 'completed' | 'failed' | 'active' | 'waiting'
  data?: unknown
  progress?: number
  result?: unknown
  error?: string
  timestamp: number
}

let publisher: Redis | null = null
let subscriber: Redis | null = null

export function getPublisher(connection: RedisOptions): Redis {
  if (publisher) {
    return publisher
  }

  publisher = new Redis({
    host: connection.host,
    port: connection.port,
    password: connection.password,
    username: connection.username,
    db: connection.db,
    lazyConnect: true,
  })

  return publisher
}

export function getSubscriber(connection: RedisOptions): Redis {
  if (subscriber) {
    return subscriber
  }

  subscriber = new Redis({
    host: connection.host,
    port: connection.port,
    password: connection.password,
    username: connection.username,
    db: connection.db,
    lazyConnect: true,
  })

  return subscriber
}

export async function publishJobEvent(connection: RedisOptions, event: JobEvent): Promise<void> {
  const pub = getPublisher(connection)

  try {
    if (pub.status !== 'ready') {
      await pub.connect()
    }

    const channel = `queue:${event.queueName}:job:${event.jobId}`
    await pub.publish(channel, JSON.stringify(event))
  }
  catch (error) {
    console.error('Failed to publish job event:', error)
  }
}

export async function subscribeToJob(
  connection: RedisOptions,
  queueName: string,
  jobId: string,
  callback: (event: JobEvent) => void,
): Promise<() => Promise<void>> {
  const sub = getSubscriber(connection)
  const channel = `queue:${queueName}:job:${jobId}`

  try {
    if (sub.status !== 'ready') {
      await sub.connect()
    }

    const messageHandler = (ch: string, message: string) => {
      if (ch === channel) {
        try {
          const event = JSON.parse(message) as JobEvent
          callback(event)
        }
        catch (error) {
          console.error('Failed to parse job event:', error)
        }
      }
    }

    sub.on('message', messageHandler)
    await sub.subscribe(channel)

    // Return unsubscribe function
    return async () => {
      sub.off('message', messageHandler)
      await sub.unsubscribe(channel)
    }
  }
  catch (error) {
    console.error('Failed to subscribe to job:', error)
    throw error
  }
}

export async function closeConnections(): Promise<void> {
  const promises: Array<Promise<void>> = []

  if (publisher) {
    promises.push(publisher.quit().then(() => {}))
    publisher = null
  }

  if (subscriber) {
    promises.push(subscriber.quit().then(() => {}))
    subscriber = null
  }

  await Promise.allSettled(promises)
}

/**
 * Reset connections (for test cleanup)
 * Closes and clears all connections
 */
export function resetConnections(): void {
  publisher = null
  subscriber = null
}
