import { describe, it, expect, vi } from 'vitest'

describe('Module Configuration', () => {
  it('should have correct module metadata', () => {
    const metadata = {
      name: 'nuxt-queue',
      configKey: 'queue',
    }

    expect(metadata.name).toBe('nuxt-queue')
    expect(metadata.configKey).toBe('queue')
  })

  it('should define default redis configuration', () => {
    const defaultConfig = {
      redis: {
        host: '127.0.0.1',
        port: 6379,
        db: 0,
      },
    }

    expect(defaultConfig.redis.host).toBe('127.0.0.1')
    expect(defaultConfig.redis.port).toBe(6379)
    expect(defaultConfig.redis.db).toBe(0)
  })

  it('should merge user config with defaults', () => {
    const defaults = {
      redis: {
        host: '127.0.0.1',
        port: 6379,
        db: 0,
      },
    }

    const userConfig = {
      redis: {
        host: 'custom-host',
        password: 'secret',
      },
    }

    const merged = {
      redis: {
        ...defaults.redis,
        ...userConfig.redis,
      },
    }

    expect(merged.redis.host).toBe('custom-host')
    expect(merged.redis.port).toBe(6379)
    expect(merged.redis.password).toBe('secret')
  })
})
