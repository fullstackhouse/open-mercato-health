import type { CheckKey, HealthContainer } from '../types'
import { BaseReadyCheckStrategy } from './base'

/**
 * Queue Redis health check strategy.
 * Verifies Redis connectivity for async queue processing.
 */
export class QueueRedisReadyCheckStrategy extends BaseReadyCheckStrategy {
  readonly id: CheckKey = 'QUEUE_REDIS'
  readonly name = 'Queue (Redis)'
  readonly required = false

  constructor(private readonly container: HealthContainer) {
    super()
  }

  isConfigured(): boolean {
    const strategy = process.env.QUEUE_STRATEGY
    return (
      strategy === 'async' &&
      Boolean(process.env.REDIS_URL || process.env.QUEUE_REDIS_URL)
    )
  }

  protected async performCheck(): Promise<{ ok: boolean; message?: string }> {
    // Try to resolve a queue instance and check its connectivity
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let queue: any = null

    const queueNames = [
      'fulltextIndexQueue',
      'vectorIndexQueue',
      'eventQueue',
      'defaultQueue',
    ]

    for (const name of queueNames) {
      if (this.container.hasRegistration(name)) {
        queue = this.container.resolve(name)
        break
      }
    }

    if (!queue) {
      return { ok: false, message: 'No queue instance available' }
    }

    // BullMQ queues have getJobCounts which requires Redis connectivity
    await queue.getJobCounts()

    return { ok: true }
  }
}
