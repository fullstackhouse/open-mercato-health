import type {
  HealthContainer,
  OrchestratorOptions,
  ReadinessResponse,
  ReadinessStatus,
  ReadyCheckStrategy,
  HealthCheckResult,
} from './types'
import {
  DatabaseReadyCheckStrategy,
  CacheReadyCheckStrategy,
  QueueRedisReadyCheckStrategy,
  FulltextSearchReadyCheckStrategy,
  VectorSearchReadyCheckStrategy,
  KmsReadyCheckStrategy,
  EmailDeliveryReadyCheckStrategy,
  ExternalAiProvidersReadyCheckStrategy,
} from './strategies'

const DEFAULT_CHECK_TIMEOUT = 5000

/**
 * Orchestrates health check strategies and computes overall readiness status.
 */
export class ReadinessOrchestrator {
  private readonly strategies: ReadyCheckStrategy[]
  private readonly checkTimeout: number
  private readonly parallel: boolean

  constructor(options: OrchestratorOptions = {}) {
    this.checkTimeout = options.checkTimeout ?? DEFAULT_CHECK_TIMEOUT
    this.parallel = options.parallel ?? true
    this.strategies = []

    // Initialize built-in strategies if container provided
    if (options.container) {
      this.registerBuiltInStrategies(options.container)
    }

    // Add custom strategies
    if (options.strategies) {
      this.strategies.push(...options.strategies)
    }
  }

  private registerBuiltInStrategies(container: HealthContainer): void {
    this.strategies.push(
      new DatabaseReadyCheckStrategy(container),
      new CacheReadyCheckStrategy(container),
      new QueueRedisReadyCheckStrategy(container),
      new FulltextSearchReadyCheckStrategy(container),
      new VectorSearchReadyCheckStrategy(container),
      new KmsReadyCheckStrategy(container),
      new EmailDeliveryReadyCheckStrategy(container),
      new ExternalAiProvidersReadyCheckStrategy(container)
    )
  }

  /**
   * Register an additional strategy
   */
  addStrategy(strategy: ReadyCheckStrategy): void {
    this.strategies.push(strategy)
  }

  /**
   * Execute all readiness checks
   */
  async checkReadiness(): Promise<ReadinessResponse> {
    const start = Date.now()
    const timestamp = new Date().toISOString()

    let checks: HealthCheckResult[]

    if (this.parallel) {
      checks = await Promise.all(
        this.strategies.map((strategy) => this.runWithTimeout(strategy))
      )
    } else {
      checks = []
      for (const strategy of this.strategies) {
        checks.push(await this.runWithTimeout(strategy))
      }
    }

    const status = this.computeOverallStatus(checks)
    const durationMs = Date.now() - start

    return {
      status,
      timestamp,
      durationMs,
      checks,
    }
  }

  private async runWithTimeout(
    strategy: ReadyCheckStrategy
  ): Promise<HealthCheckResult> {
    const start = Date.now()

    try {
      const result = await Promise.race([
        strategy.check(),
        new Promise<HealthCheckResult>((_, reject) =>
          setTimeout(
            () => reject(new Error('Check timed out')),
            this.checkTimeout
          )
        ),
      ])
      return result
    } catch (error) {
      return {
        name: strategy.name,
        required: strategy.required,
        status: 'fail',
        latencyMs: Date.now() - start,
        message: error instanceof Error ? error.message : String(error),
      }
    }
  }

  private computeOverallStatus(checks: HealthCheckResult[]): ReadinessStatus {
    const hasRequiredFailure = checks.some(
      (c) => c.required && c.status === 'fail'
    )

    if (hasRequiredFailure) {
      return 'fail'
    }

    const hasOptionalFailure = checks.some(
      (c) => !c.required && c.status === 'fail'
    )

    if (hasOptionalFailure) {
      return 'degraded'
    }

    return 'ok'
  }
}
