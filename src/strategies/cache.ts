import type { CheckKey, HealthContainer } from '../types'
import { BaseReadyCheckStrategy } from './base'

/**
 * Cache health check strategy.
 * Performs a set/get/delete cycle to verify cache functionality.
 */
export class CacheReadyCheckStrategy extends BaseReadyCheckStrategy {
  readonly id: CheckKey = 'CACHE'
  readonly name = 'Cache'
  readonly required = true

  constructor(private readonly container: HealthContainer) {
    super()
  }

  isConfigured(): boolean {
    return (
      this.container.hasRegistration('cache') ||
      this.container.hasRegistration('cacheService')
    )
  }

  protected async performCheck(): Promise<{ ok: boolean; message?: string }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cache = this.container.resolve<any>('cache')

    // Test cache operations with a health check key
    const testKey = '__health_check_test__'
    const testValue = Date.now()

    await cache.set(testKey, testValue, { ttl: 5000 })
    const retrieved = await cache.get(testKey)
    await cache.delete(testKey)

    if (retrieved !== testValue) {
      return { ok: false, message: 'Cache read/write verification failed' }
    }

    return { ok: true }
  }
}
