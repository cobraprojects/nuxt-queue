import { defineNuxtPlugin } from '#app'

export default defineNuxtPlugin(() => {
  return {
    provide: {
      queue: {
        async add<T = unknown, R = unknown>(jobName: string, data: T, options?: unknown): Promise<R> {
          const response = await $fetch<R>('/api/queue/add', {
            method: 'POST',
            body: {
              queueName: 'default',
              jobName,
              data,
              options,
            },
          })
          return response as R
        },
      },
    },
  }
})
