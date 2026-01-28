export default defineNuxtConfig({
  modules: ['nuxt-queuekit'],
  devtools: { enabled: true },
  compatibilityDate: 'latest',
  queue: {
    // Example: Register jobs through config using file paths
    jobs: {
      // Using file path from outside server/jobs/ directory (not auto-discovered)
      ExternalJob: './server/custom-jobs/ExternalJob.ts',

      // You can also use inline definitions, but they may trigger warnings
      // ConfigBasedJob: {
      //   async handle(data: { message: string }) {
      //     console.log('📝 Config-based job processing:', data.message)
      //     await new Promise(resolve => setTimeout(resolve, 1000))
      //     return { success: true, message: data.message }
      //   },
      //   queue: 'default',
      //   options: {
      //     attempts: 2,
      //   },
      // },
    },
  },
})
