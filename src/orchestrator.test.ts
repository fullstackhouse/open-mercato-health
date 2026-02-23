import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ReadinessOrchestrator } from './orchestrator'
import type { ReadyCheckStrategy, HealthCheckResult } from './types'

function createMockStrategy(
  overrides: Partial<ReadyCheckStrategy> & {
    checkResult?: Partial<HealthCheckResult>
  }
): ReadyCheckStrategy {
  const defaults: ReadyCheckStrategy = {
    id: 'DATABASE',
    name: 'Test Strategy',
    required: true,
    isConfigured: () => true,
    check: async () => ({
      name: overrides.name ?? 'Test Strategy',
      required: overrides.required ?? true,
      status: overrides.checkResult?.status ?? 'ok',
      latencyMs: overrides.checkResult?.latencyMs ?? 5,
      message: overrides.checkResult?.message ?? null,
    }),
  }

  return { ...defaults, ...overrides }
}

describe('ReadinessOrchestrator', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('checkReadiness', () => {
    it('returns ok status when all checks pass', async () => {
      const strategy = createMockStrategy({
        name: 'Database',
        required: true,
        checkResult: { status: 'ok' },
      })

      const orchestrator = new ReadinessOrchestrator({
        strategies: [strategy],
      })

      const resultPromise = orchestrator.checkReadiness()
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result.status).toBe('ok')
      expect(result.checks).toHaveLength(1)
      expect(result.checks[0].status).toBe('ok')
    })

    it('returns fail status when required check fails', async () => {
      const strategy = createMockStrategy({
        name: 'Database',
        required: true,
        checkResult: { status: 'fail', message: 'Connection refused' },
      })

      const orchestrator = new ReadinessOrchestrator({
        strategies: [strategy],
      })

      const resultPromise = orchestrator.checkReadiness()
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result.status).toBe('fail')
      expect(result.checks[0].status).toBe('fail')
      expect(result.checks[0].message).toBe('Connection refused')
    })

    it('returns degraded when optional check fails but required passes', async () => {
      const requiredStrategy = createMockStrategy({
        id: 'DATABASE',
        name: 'Database',
        required: true,
        checkResult: { status: 'ok' },
      })

      const optionalStrategy = createMockStrategy({
        id: 'SEARCH_FULLTEXT',
        name: 'Search',
        required: false,
        checkResult: { status: 'fail', message: 'Meilisearch unavailable' },
      })

      const orchestrator = new ReadinessOrchestrator({
        strategies: [requiredStrategy, optionalStrategy],
      })

      const resultPromise = orchestrator.checkReadiness()
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result.status).toBe('degraded')
    })

    it('handles check timeout gracefully', async () => {
      const slowStrategy: ReadyCheckStrategy = {
        id: 'DATABASE',
        name: 'Slow Database',
        required: true,
        isConfigured: () => true,
        check: async () => {
          await new Promise((r) => setTimeout(r, 10000))
          return {
            name: 'Slow Database',
            required: true,
            status: 'ok',
            latencyMs: 10000,
            message: null,
          }
        },
      }

      const orchestrator = new ReadinessOrchestrator({
        strategies: [slowStrategy],
        checkTimeout: 100,
      })

      const resultPromise = orchestrator.checkReadiness()
      await vi.advanceTimersByTimeAsync(200)
      const result = await resultPromise

      expect(result.status).toBe('fail')
      expect(result.checks[0].message).toContain('timed out')
    })

    it('includes timestamp and duration in response', async () => {
      const strategy = createMockStrategy({
        checkResult: { status: 'ok' },
      })

      const orchestrator = new ReadinessOrchestrator({
        strategies: [strategy],
      })

      const resultPromise = orchestrator.checkReadiness()
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result.timestamp).toBeDefined()
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp)
      expect(typeof result.durationMs).toBe('number')
      expect(result.durationMs).toBeGreaterThanOrEqual(0)
    })

    it('runs checks in parallel by default', async () => {
      const checkOrder: string[] = []

      const strategy1: ReadyCheckStrategy = {
        id: 'DATABASE',
        name: 'Strategy 1',
        required: true,
        isConfigured: () => true,
        check: async () => {
          checkOrder.push('start-1')
          await new Promise((r) => setTimeout(r, 50))
          checkOrder.push('end-1')
          return { name: 'Strategy 1', required: true, status: 'ok', latencyMs: 50, message: null }
        },
      }

      const strategy2: ReadyCheckStrategy = {
        id: 'CACHE',
        name: 'Strategy 2',
        required: true,
        isConfigured: () => true,
        check: async () => {
          checkOrder.push('start-2')
          await new Promise((r) => setTimeout(r, 50))
          checkOrder.push('end-2')
          return { name: 'Strategy 2', required: true, status: 'ok', latencyMs: 50, message: null }
        },
      }

      const orchestrator = new ReadinessOrchestrator({
        strategies: [strategy1, strategy2],
        parallel: true,
      })

      const resultPromise = orchestrator.checkReadiness()
      await vi.runAllTimersAsync()
      await resultPromise

      // Both should start before either ends (parallel execution)
      expect(checkOrder.indexOf('start-1')).toBeLessThan(checkOrder.indexOf('end-1'))
      expect(checkOrder.indexOf('start-2')).toBeLessThan(checkOrder.indexOf('end-2'))
      expect(checkOrder.indexOf('start-1')).toBeLessThan(checkOrder.indexOf('end-2'))
      expect(checkOrder.indexOf('start-2')).toBeLessThan(checkOrder.indexOf('end-1'))
    })

    it('runs checks sequentially when parallel is false', async () => {
      const checkOrder: string[] = []

      const strategy1: ReadyCheckStrategy = {
        id: 'DATABASE',
        name: 'Strategy 1',
        required: true,
        isConfigured: () => true,
        check: async () => {
          checkOrder.push('start-1')
          await new Promise((r) => setTimeout(r, 10))
          checkOrder.push('end-1')
          return { name: 'Strategy 1', required: true, status: 'ok', latencyMs: 10, message: null }
        },
      }

      const strategy2: ReadyCheckStrategy = {
        id: 'CACHE',
        name: 'Strategy 2',
        required: true,
        isConfigured: () => true,
        check: async () => {
          checkOrder.push('start-2')
          await new Promise((r) => setTimeout(r, 10))
          checkOrder.push('end-2')
          return { name: 'Strategy 2', required: true, status: 'ok', latencyMs: 10, message: null }
        },
      }

      const orchestrator = new ReadinessOrchestrator({
        strategies: [strategy1, strategy2],
        parallel: false,
      })

      const resultPromise = orchestrator.checkReadiness()
      await vi.runAllTimersAsync()
      await resultPromise

      // Sequential: first should complete before second starts
      expect(checkOrder).toEqual(['start-1', 'end-1', 'start-2', 'end-2'])
    })
  })

  describe('addStrategy', () => {
    it('adds strategy to the orchestrator', async () => {
      const orchestrator = new ReadinessOrchestrator()

      const strategy = createMockStrategy({
        name: 'Custom Check',
        checkResult: { status: 'ok' },
      })

      orchestrator.addStrategy(strategy)

      const resultPromise = orchestrator.checkReadiness()
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result.checks).toHaveLength(1)
      expect(result.checks[0].name).toBe('Custom Check')
    })
  })
})
