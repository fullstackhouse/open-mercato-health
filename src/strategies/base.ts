import type { CheckKey, HealthCheckResult, ReadyCheckStrategy } from '../types'
import { shouldRunCheck } from '../config'

/**
 * Abstract base class for health check strategies.
 * Handles common logic like enable/disable checks and timing.
 */
export abstract class BaseReadyCheckStrategy implements ReadyCheckStrategy {
  abstract readonly id: CheckKey
  abstract readonly name: string
  abstract readonly required: boolean

  /**
   * Determine if the service this strategy checks is configured.
   * Used for 'auto' mode to decide whether to run the check.
   */
  abstract isConfigured(): boolean

  /**
   * Perform the actual health check.
   * Implementations should return { ok: true } on success or { ok: false, message: '...' } on failure.
   */
  protected abstract performCheck(): Promise<{ ok: boolean; message?: string }>

  /**
   * Execute the health check with timing and skip logic.
   */
  async check(): Promise<HealthCheckResult> {
    const start = Date.now()

    if (!shouldRunCheck(this.id, this.isConfigured())) {
      return {
        name: this.name,
        required: this.required,
        status: 'skip',
        latencyMs: Date.now() - start,
        message: 'Check disabled or not configured',
      }
    }

    try {
      const result = await this.performCheck()
      return {
        name: this.name,
        required: this.required,
        status: result.ok ? 'ok' : 'fail',
        latencyMs: Date.now() - start,
        message: result.message ?? null,
      }
    } catch (error) {
      return {
        name: this.name,
        required: this.required,
        status: 'fail',
        latencyMs: Date.now() - start,
        message: error instanceof Error ? error.message : String(error),
      }
    }
  }
}
