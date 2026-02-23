import type { CheckKey, HealthContainer } from '../types'
import { BaseReadyCheckStrategy } from './base'

/**
 * Fulltext search health check strategy.
 * Verifies Meilisearch or other fulltext search provider connectivity.
 */
export class FulltextSearchReadyCheckStrategy extends BaseReadyCheckStrategy {
  readonly id: CheckKey = 'SEARCH_FULLTEXT'
  readonly name = 'Search (Fulltext)'
  readonly required = false

  constructor(private readonly container: HealthContainer) {
    super()
  }

  isConfigured(): boolean {
    return Boolean(process.env.MEILISEARCH_HOST || process.env.SEARCH_FULLTEXT_URL)
  }

  protected async performCheck(): Promise<{ ok: boolean; message?: string }> {
    if (!this.container.hasRegistration('searchStrategies')) {
      return { ok: false, message: 'Search strategies not registered' }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const strategies = this.container.resolve<any[]>('searchStrategies')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fulltextStrategy = strategies?.find((s: any) => s.id === 'fulltext')

    if (!fulltextStrategy) {
      return { ok: false, message: 'Fulltext strategy not registered' }
    }

    const isAvailable = await fulltextStrategy.isAvailable()

    if (!isAvailable) {
      return { ok: false, message: 'Meilisearch not available' }
    }

    return { ok: true }
  }
}
