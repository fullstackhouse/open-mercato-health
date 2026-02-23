import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CacheReadyCheckStrategy } from './cache'
import type { HealthContainer } from '../types'

function createMockContainer(
  overrides: {
    hasCache?: boolean
    cacheError?: Error
    cacheReadMismatch?: boolean
  } = {}
): HealthContainer {
  let storedValue: unknown = null

  const mockCache = {
    set: vi.fn(async (_key: string, value: unknown) => {
      if (overrides.cacheError) throw overrides.cacheError
      storedValue = value
    }),
    get: vi.fn(async () => {
      if (overrides.cacheError) throw overrides.cacheError
      return overrides.cacheReadMismatch ? 'wrong-value' : storedValue
    }),
    delete: vi.fn(async () => {
      if (overrides.cacheError) throw overrides.cacheError
      storedValue = null
    }),
  }

  return {
    hasRegistration: vi.fn((name: string) => {
      if (name === 'cache') return overrides.hasCache ?? true
      return false
    }),
    resolve: vi.fn((name: string) => {
      if (name === 'cache') return mockCache
      throw new Error(`Unknown service: ${name}`)
    }),
  }
}

describe('CacheReadyCheckStrategy', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('isConfigured', () => {
    it('returns true when cache is registered', () => {
      const container = createMockContainer({ hasCache: true })
      const strategy = new CacheReadyCheckStrategy(container)

      expect(strategy.isConfigured()).toBe(true)
    })

    it('returns false when cache is not registered', () => {
      const container = createMockContainer({ hasCache: false })
      const strategy = new CacheReadyCheckStrategy(container)

      expect(strategy.isConfigured()).toBe(false)
    })
  })

  describe('check', () => {
    it('returns ok when cache is healthy', async () => {
      const container = createMockContainer()
      const strategy = new CacheReadyCheckStrategy(container)

      const result = await strategy.check()

      expect(result.status).toBe('ok')
      expect(result.required).toBe(true)
      expect(result.name).toBe('Cache')
    })

    it('returns fail when cache operation fails', async () => {
      const container = createMockContainer({
        cacheError: new Error('Redis connection timeout'),
      })
      const strategy = new CacheReadyCheckStrategy(container)

      const result = await strategy.check()

      expect(result.status).toBe('fail')
      expect(result.message).toContain('Redis connection timeout')
    })

    it('returns fail when cache read verification fails', async () => {
      const container = createMockContainer({
        cacheReadMismatch: true,
      })
      const strategy = new CacheReadyCheckStrategy(container)

      const result = await strategy.check()

      expect(result.status).toBe('fail')
      expect(result.message).toContain('verification failed')
    })

    it('returns skip when check is disabled via env', async () => {
      process.env.HEALTH_READY_CHECK_CACHE_ENABLED = 'false'
      const container = createMockContainer()
      const strategy = new CacheReadyCheckStrategy(container)

      const result = await strategy.check()

      expect(result.status).toBe('skip')
    })
  })
})
