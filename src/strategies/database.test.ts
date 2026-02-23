import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { DatabaseReadyCheckStrategy } from './database'
import type { HealthContainer } from '../types'

function createMockContainer(
  overrides: {
    hasEm?: boolean
    selectResult?: unknown
    selectError?: Error
  } = {}
): HealthContainer {
  const mockKnex = {
    raw: vi.fn().mockImplementation(async () => {
      if (overrides.selectError) {
        throw overrides.selectError
      }
      return overrides.selectResult ?? [[{ '1': 1 }]]
    }),
  }

  const mockConnection = {
    getKnex: () => mockKnex,
  }

  const mockEm = {
    getConnection: () => mockConnection,
  }

  return {
    hasRegistration: vi.fn((name: string) => {
      if (name === 'em') return overrides.hasEm ?? true
      return false
    }),
    resolve: vi.fn((name: string) => {
      if (name === 'em') return mockEm
      throw new Error(`Unknown service: ${name}`)
    }),
  }
}

describe('DatabaseReadyCheckStrategy', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('isConfigured', () => {
    it('returns true when em is registered', () => {
      const container = createMockContainer({ hasEm: true })
      const strategy = new DatabaseReadyCheckStrategy(container)

      expect(strategy.isConfigured()).toBe(true)
    })

    it('returns false when em is not registered', () => {
      const container = createMockContainer({ hasEm: false })
      const strategy = new DatabaseReadyCheckStrategy(container)

      expect(strategy.isConfigured()).toBe(false)
    })
  })

  describe('check', () => {
    it('returns ok when database is healthy', async () => {
      const container = createMockContainer()
      const strategy = new DatabaseReadyCheckStrategy(container)

      const result = await strategy.check()

      expect(result.status).toBe('ok')
      expect(result.required).toBe(true)
      expect(result.name).toBe('Database')
    })

    it('returns fail when database connection fails', async () => {
      const container = createMockContainer({
        selectError: new Error('Connection refused'),
      })
      const strategy = new DatabaseReadyCheckStrategy(container)

      const result = await strategy.check()

      expect(result.status).toBe('fail')
      expect(result.message).toContain('Connection refused')
    })

    it('returns skip when check is disabled via env', async () => {
      process.env.HEALTH_READY_CHECK_DATABASE_ENABLED = 'false'
      const container = createMockContainer()
      const strategy = new DatabaseReadyCheckStrategy(container)

      const result = await strategy.check()

      expect(result.status).toBe('skip')
    })

    it('tracks latency', async () => {
      const container = createMockContainer()
      const strategy = new DatabaseReadyCheckStrategy(container)

      const result = await strategy.check()

      expect(result.latencyMs).toBeGreaterThanOrEqual(0)
    })
  })
})
