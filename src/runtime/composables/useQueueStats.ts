import { ref } from 'vue'

interface QueueStats {
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
}

export function useQueueStats(queueName = 'default') {
  const stats = ref<QueueStats | null>(null)
  const error = ref<string | null>(null)
  const loading = ref(false)

  const refresh = async () => {
    loading.value = true
    error.value = null

    try {
      const response = await $fetch<QueueStats>(`/api/queue/${queueName}/stats`)
      stats.value = response
    }
    catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch queue statistics'
      error.value = message
      console.error('Failed to fetch queue stats:', err)
    }
    finally {
      loading.value = false
    }
  }

  return {
    stats,
    error,
    loading,
    refresh,
  }
}
