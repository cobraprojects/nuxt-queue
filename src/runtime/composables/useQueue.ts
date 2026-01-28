export function useQueue(queueName = 'default') {
  return {
    async add<T = unknown, R = unknown>(jobName: string, data: T, options?: unknown): Promise<R> {
      const response = await $fetch<R>('/api/queue/add', {
        method: 'POST',
        body: {
          queueName,
          jobName,
          data,
          options,
        },
      })
      return response as R
    },
  }
}
