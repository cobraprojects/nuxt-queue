import { defineNuxtPlugin } from '#app'

export default defineNuxtPlugin(() => {
  return {
    provide: {
      queue: {
        async add(jobName: string, data: unknown, options?: unknown) {
          return await $fetch('/api/queue/add', {
            method: 'POST',
            body: {
              queueName: 'default',
              jobName,
              data,
              options,
            },
          })
        },
      },
    },
  }
})
