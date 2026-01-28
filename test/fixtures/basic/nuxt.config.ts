import MyModule from '../../../src/module'

export default defineNuxtConfig({
  modules: [MyModule],
  
  queue: {
    redis: {
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: Number(process.env.REDIS_PORT) || 6379,
      db: Number(process.env.REDIS_DB) || 15, // Use a different DB for tests
    },
  },
})
