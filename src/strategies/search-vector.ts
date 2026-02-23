import type { CheckKey, HealthContainer } from '../types'
import { BaseReadyCheckStrategy } from './base'

/**
 * Vector search health check strategy.
 * Verifies vector/semantic search provider connectivity.
 */
export class VectorSearchReadyCheckStrategy extends BaseReadyCheckStrategy {
  readonly id: CheckKey = 'SEARCH_VECTOR'
  readonly name = 'Search (Vector)'
  readonly required = false

  constructor(private readonly container: HealthContainer) {
    super()
  }

  isConfigured(): boolean {
    return Boolean(
      process.env.SEARCH_VECTOR_URL ||
        process.env.QDRANT_URL ||
        process.env.PINECONE_API_KEY
    )
  }

  protected async performCheck(): Promise<{ ok: boolean; message?: string }> {
    if (!this.container.hasRegistration('searchStrategies')) {
      return { ok: false, message: 'Search strategies not registered' }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const strategies = this.container.resolve<any[]>('searchStrategies')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vectorStrategy = strategies?.find((s: any) => s.id === 'vector')

    if (!vectorStrategy) {
      return { ok: false, message: 'Vector strategy not registered' }
    }

    const isAvailable = await vectorStrategy.isAvailable()

    if (!isAvailable) {
      return { ok: false, message: 'Vector search not available' }
    }

    return { ok: true }
  }
}
