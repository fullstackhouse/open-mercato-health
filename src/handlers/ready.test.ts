import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createReadinessHandler } from './ready'
import type { ReadyCheckStrategy } from '../types'

function createMockStrategy(
  overrides: Partial<ReadyCheckStrategy> & {
    checkStatus?: 'ok' | 'fail' | 'skip'
    checkMessage?: string
  } = {}
): ReadyCheckStrategy {
  return {
    id: overrides.id ?? 'DATABASE',
    name: overrides.name ?? 'Test Strategy',
    required: overrides.required ?? true,
    isConfigured: overrides.isConfigured ?? (() => true),
    check:
      overrides.check ??
      (async () => ({
        name: overrides.name ?? 'Test Strategy',
        required: overrides.required ?? true,
        status: overrides.checkStatus ?? 'ok',
        latencyMs: 5,
        message: overrides.checkMessage ?? null,
      })),
  }
}

describe('createReadinessHandler', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns 200 when all checks pass', async () => {
    const strategy = createMockStrategy({ checkStatus: 'ok' })
    const handler = createReadinessHandler({ strategies: [strategy] })

    const resultPromise = handler()
    await vi.runAllTimersAsync()
    const result = await resultPromise

    expect(result.status).toBe(200)
    expect(result.body.status).toBe('ok')
  })

  it('returns 503 when required check fails', async () => {
    const strategy = createMockStrategy({
      required: true,
      checkStatus: 'fail',
      checkMessage: 'Database unavailable',
    })
    const handler = createReadinessHandler({ strategies: [strategy] })

    const resultPromise = handler()
    await vi.runAllTimersAsync()
    const result = await resultPromise

    expect(result.status).toBe(503)
    expect(result.body.status).toBe('fail')
  })

  it('returns 200 with degraded when optional check fails', async () => {
    const requiredStrategy = createMockStrategy({
      id: 'DATABASE',
      name: 'Database',
      required: true,
      checkStatus: 'ok',
    })
    const optionalStrategy = createMockStrategy({
      id: 'SEARCH_FULLTEXT',
      name: 'Search',
      required: false,
      checkStatus: 'fail',
    })
    const handler = createReadinessHandler({
      strategies: [requiredStrategy, optionalStrategy],
    })

    const resultPromise = handler()
    await vi.runAllTimersAsync()
    const result = await resultPromise

    expect(result.status).toBe(200)
    expect(result.body.status).toBe('degraded')
  })

  it('includes all check results in body', async () => {
    const strategy1 = createMockStrategy({
      id: 'DATABASE',
      name: 'Database',
      checkStatus: 'ok',
    })
    const strategy2 = createMockStrategy({
      id: 'CACHE',
      name: 'Cache',
      checkStatus: 'ok',
    })
    const handler = createReadinessHandler({
      strategies: [strategy1, strategy2],
    })

    const resultPromise = handler()
    await vi.runAllTimersAsync()
    const result = await resultPromise

    expect(result.body.checks).toHaveLength(2)
    expect(result.body.checks.map((c) => c.name)).toContain('Database')
    expect(result.body.checks.map((c) => c.name)).toContain('Cache')
  })

  it('accepts additional strategies', async () => {
    const baseStrategy = createMockStrategy({
      id: 'DATABASE',
      name: 'Base',
    })
    const additionalStrategy = createMockStrategy({
      id: 'CACHE',
      name: 'Additional',
    })

    const handler = createReadinessHandler({
      strategies: [baseStrategy],
      additionalStrategies: [additionalStrategy],
    })

    const resultPromise = handler()
    await vi.runAllTimersAsync()
    const result = await resultPromise

    expect(result.body.checks).toHaveLength(2)
  })
})
