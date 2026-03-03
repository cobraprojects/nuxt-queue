import { defineEventHandler, getRouterParam, createError, setResponseStatus } from 'h3'
import { subscribeToJob } from '../../../../utils/pubsub'
import { useQueueConnection } from '../../../../utils/composables'

/**
 * Type guard to check if connection has Redis options
 */
function isRedisOptions(conn: unknown): conn is { host: string, port: number, password?: string, username?: string, db: number } {
  return typeof conn === 'object' && conn !== null && 'host' in conn && 'port' in conn
}

export default defineEventHandler(async (event) => {
  const queueName = getRouterParam(event, 'queueName')
  const jobId = getRouterParam(event, 'jobId')

  if (!queueName || !jobId) {
    throw createError({
      statusCode: 400,
      message: 'Queue name and job ID are required',
    })
  }

  // Set headers for SSE
  event.node.res.setHeader('Content-Type', 'text/event-stream')
  event.node.res.setHeader('Cache-Control', 'no-cache')
  event.node.res.setHeader('Connection', 'keep-alive')
  event.node.res.setHeader('X-Accel-Buffering', 'no') // Disable nginx buffering

  setResponseStatus(event, 200)

  const connection = useQueueConnection()

  if (!isRedisOptions(connection)) {
    throw createError({
      statusCode: 500,
      message: 'Invalid Redis connection configuration',
    })
  }

  // Send initial connection message
  event.node.res.write('data: {"type":"connected"}\n\n')

  // Keep connection alive with heartbeat
  const heartbeat = setInterval(() => {
    event.node.res.write(': heartbeat\n\n')
  }, 30000) // Every 30 seconds

  // Cleanup function
  const cleanup = () => {
    clearInterval(heartbeat)
  }

  try {
    // Subscribe to job events
    const unsubscribe = await subscribeToJob(
      connection,
      queueName,
      jobId,
      (jobEvent) => {
        // Send event to client
        event.node.res.write(`data: ${JSON.stringify(jobEvent)}\n\n`)

        // Close connection if job is completed or failed
        if (jobEvent.type === 'completed' || jobEvent.type === 'failed') {
          setTimeout(() => {
            cleanup()
            unsubscribe()
            event.node.res.end()
          }, 100)
        }
      },
    )

    // Enhanced cleanup with unsubscribe
    const enhancedCleanup = () => {
      cleanup()
      unsubscribe()
    }

    // Handle client disconnect
    event.node.req.on('close', enhancedCleanup)
    event.node.req.on('error', enhancedCleanup)
  }
  catch (error) {
    console.error('SSE error:', error)
    cleanup()
    event.node.res.end()
  }
})
