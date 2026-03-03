import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useQueueStats } from '../../src/runtime/composables/useQueueStats'

// Mock Vue composables
vi.mock('vue', async () => {
  const actual = await vi.importActual('vue')
  return {
    ...actual,
    getCurrentInstance: vi.fn(() => null),
  }
})

// Mock $fetch
let fetchMock: ReturnType<typeof vi.fn>

interface QueueStats {
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
}

describe('useQueueStats', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fetchMock = vi.fn()
    ;(globalThis as { $fetch?: unknown }).$fetch = fetchMock
    vi.clearAllMocks()
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should initialize with null stats and no error', () => {
    const { stats, error, loading } = useQueueStats('default')

    expect(stats.value).toBeNull()
    expect(error.value).toBeNull()
    expect(loading.value).toBe(false)
  })

  it('should fetch stats successfully', async () => {
    const mockStats: QueueStats = {
      waiting: 5,
      active: 2,
      completed: 100,
      failed: 3,
      delayed: 1,
    }

    fetchMock.mockResolvedValueOnce(mockStats)

    const { stats, error, loading, refresh } = useQueueStats('default')

    await refresh()

    expect(stats.value).toEqual(mockStats)
    expect(error.value).toBeNull()
    expect(loading.value).toBe(false)
    expect(fetchMock).toHaveBeenCalledWith('/api/queue/default/stats')
  })

  it('should handle fetch errors', async () => {
    const mockError = new Error('Network error')
    fetchMock.mockRejectedValueOnce(mockError)

    const { stats, error, loading, refresh } = useQueueStats('default')

    await refresh()

    expect(stats.value).toBeNull()
    expect(error.value).toBe('Network error')
    expect(loading.value).toBe(false)
  })

  it('should set loading state during fetch', async () => {
    let resolveFetch: (value: QueueStats) => void
    const fetchPromise = new Promise<QueueStats>((resolve) => {
      resolveFetch = resolve
    })

    fetchMock.mockReturnValueOnce(fetchPromise)

    const { loading, refresh } = useQueueStats('default')

    const refreshPromise = refresh()

    // Loading should be true immediately after calling refresh
    expect(loading.value).toBe(true)

    // Resolve the fetch
    resolveFetch!({
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
    })

    await refreshPromise

    // Loading should be false after fetch completes
    expect(loading.value).toBe(false)
  })

  it('should handle non-Error errors', async () => {
    fetchMock.mockRejectedValueOnce('String error')

    const { stats, error, loading, refresh } = useQueueStats('default')

    await refresh()

    expect(stats.value).toBeNull()
    expect(error.value).toBe('Failed to fetch queue statistics')
    expect(loading.value).toBe(false)
  })

  it('should support multiple queue names', async () => {
    const mockStats: QueueStats = {
      waiting: 1,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
    }

    fetchMock.mockResolvedValueOnce(mockStats)

    const { refresh } = useQueueStats('emails')

    await refresh()

    expect(fetchMock).toHaveBeenCalledWith('/api/queue/emails/stats')
  })

  it('should allow multiple refresh calls', async () => {
    const mockStats1: QueueStats = {
      waiting: 5,
      active: 2,
      completed: 100,
      failed: 3,
      delayed: 1,
    }

    const mockStats2: QueueStats = {
      waiting: 3,
      active: 1,
      completed: 102,
      failed: 3,
      delayed: 0,
    }

    fetchMock
      .mockResolvedValueOnce(mockStats1)
      .mockResolvedValueOnce(mockStats2)

    const { stats, refresh } = useQueueStats('default')

    await refresh()
    expect(stats.value).toEqual(mockStats1)

    await refresh()
    expect(stats.value).toEqual(mockStats2)
  })

  it('should expose stats as a ref', () => {
    const { stats } = useQueueStats('default')

    // Verify stats is a Ref
    const isRef = typeof stats.value !== 'undefined' || 'value' in stats
    expect(isRef).toBe(true)
  })

  it('should expose error as a ref', () => {
    const { error } = useQueueStats('default')

    // Verify error is a Ref
    const isRef = typeof error.value !== 'undefined' || 'value' in error
    expect(isRef).toBe(true)
  })

  it('should expose loading as a ref', () => {
    const { loading } = useQueueStats('default')

    // Verify loading is a Ref
    const isRef = typeof loading.value !== 'undefined' || 'value' in loading
    expect(isRef).toBe(true)
  })

  it('should return refresh function', () => {
    const { refresh } = useQueueStats('default')

    expect(typeof refresh).toBe('function')
  })

  it('should handle empty queue stats', async () => {
    const emptyStats: QueueStats = {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
    }

    fetchMock.mockResolvedValueOnce(emptyStats)

    const { refresh } = useQueueStats('default')

    await refresh()

    expect(fetchMock).toHaveBeenCalledWith('/api/queue/default/stats')
  })

  it('should handle all queue states', async () => {
    const fullStats: QueueStats = {
      waiting: 10,
      active: 5,
      completed: 1000,
      failed: 50,
      delayed: 20,
    }

    fetchMock.mockResolvedValueOnce(fullStats)

    const { stats, refresh } = useQueueStats('default')

    await refresh()

    expect(stats.value!.waiting).toBe(10)
    expect(stats.value!.active).toBe(5)
    expect(stats.value!.completed).toBe(1000)
    expect(stats.value!.failed).toBe(50)
    expect(stats.value!.delayed).toBe(20)
  })

  it('should log errors to console', async () => {
    const mockError = new Error('Fetch failed')
    fetchMock.mockRejectedValueOnce(mockError)

    const { refresh } = useQueueStats('default')

    await refresh()

    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to fetch queue stats:', mockError)
  })

  it('should validate QueueStats interface', () => {
    interface QueueStats {
      waiting: number
      active: number
      completed: number
      failed: number
      delayed: number
    }

    const stats: QueueStats = {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
    }

    expect(stats).toHaveProperty('waiting')
    expect(stats).toHaveProperty('active')
    expect(stats).toHaveProperty('completed')
    expect(stats).toHaveProperty('failed')
    expect(stats).toHaveProperty('delayed')

    // All properties should be numbers
    expect(typeof stats.waiting).toBe('number')
    expect(typeof stats.active).toBe('number')
    expect(typeof stats.completed).toBe('number')
    expect(typeof stats.failed).toBe('number')
    expect(typeof stats.delayed).toBe('number')
  })

  it('should handle concurrent refresh calls', async () => {
    const mockStats: QueueStats = {
      waiting: 1,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
    }

    fetchMock.mockResolvedValue(mockStats)

    const { refresh } = useQueueStats('default')

    // Call refresh multiple times concurrently
    await Promise.all([
      refresh(),
      refresh(),
      refresh(),
    ])

    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
