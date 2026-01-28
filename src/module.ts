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
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-queue',
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
  },
  async setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)

    // Add runtime config
    nuxt.options.runtimeConfig.queue = defu(nuxt.options.runtimeConfig.queue, {
      redis: options.redis,
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
