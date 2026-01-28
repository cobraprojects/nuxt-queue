export function useQueue(queueName = 'default') {
  return {
    async add(jobName: string, data: unknown, options?: unknown) {
      return await $fetch('/api/queue/add', {
        method: 'POST',
        body: {
          queueName,
          jobName,
          data,
          options,
        },
      })
    },
  }
}
