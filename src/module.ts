import { defineNuxtModule, addPlugin, createResolver, addServerImportsDir, addServerHandler, addImportsDir, addServerPlugin } from '@nuxt/kit'
import { defu } from 'defu'

export interface RedisConfig {
  host?: string
  port?: number
  password?: string
  username?: string
  db?: number
}

export interface ModuleOptions {
  redis?: RedisConfig
  jobsDir?: string
  jobs?: Record<string, string | JobDefinition> // Can be file path or inline definition
}

interface JobDefinition {
  handle: (data: unknown, job: unknown) => Promise<unknown> | unknown
  queue?: string
  options?: Record<string, unknown>
  onCompleted?: (job: unknown, result: unknown) => void | Promise<void>
  onFailed?: (job: unknown, error: Error) => void | Promise<void>
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-queuekit',
    configKey: 'queue',
  },
  defaults: {
    redis: {
      host: process.env.NUXT_REDIS_HOST || '127.0.0.1',
      port: Number(process.env.NUXT_REDIS_PORT || 6379),
      password: process.env.NUXT_REDIS_PASSWORD || undefined,
      username: process.env.NUXT_REDIS_USERNAME || undefined,
      db: Number(process.env.NUXT_REDIS_DB || 0),
    },
    jobsDir: 'server/jobs',
    jobs: {},
  },
  async setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)

    // Add runtime config (only serializable values)
    nuxt.options.runtimeConfig.queue = defu(nuxt.options.runtimeConfig.queue, {
      redis: options.redis,
      jobsDir: options.jobsDir,
    })

    // Store jobs config in a way that won't trigger serialization warnings
    // We'll make it available through a virtual module instead of runtime config
    const jobsConfig = options.jobs || {}

    // Create a virtual module to provide jobs config
    nuxt.hook('nitro:config', (nitroConfig) => {
      nitroConfig.virtual = nitroConfig.virtual || {}
      nitroConfig.virtual['#nuxt-queuekit-jobs'] = `export default ${JSON.stringify({})}`

      // Store jobs in Nitro's internal options (not runtime config)
      nitroConfig.runtimeConfig = nitroConfig.runtimeConfig || {}
      nitroConfig.runtimeConfig.nuxtQueue = nitroConfig.runtimeConfig.nuxtQueue || {}
      nitroConfig.runtimeConfig.nuxtQueue.configJobs = jobsConfig
    })

    // Add server utilities
    addServerImportsDir(resolver.resolve('./runtime/server/utils'))

    // Add composables
    addImportsDir(resolver.resolve('./runtime/composables'))

    // Add API routes
    addServerHandler({
      route: '/api/queue/add',
      handler: resolver.resolve('./runtime/server/api/queue/add.post'),
    })

    addServerHandler({
      route: '/api/queue/:queueName/:jobId',
      handler: resolver.resolve('./runtime/server/api/queue/[queueName]/[jobId].get'),
    })

    // Add plugin
    addPlugin(resolver.resolve('./runtime/plugin'))

    // Add job loader plugin (auto-discovers jobs from server/jobs/)
    addServerPlugin(resolver.resolve('./runtime/server/plugins/job-loader'))
  },
})
