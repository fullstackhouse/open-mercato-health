/**
 * Status values for individual health checks
 */
export type HealthCheckStatus = 'ok' | 'fail' | 'skip'

/**
 * Result from a single health check strategy
 */
export type HealthCheckResult = {
  /** Identifier key for the check */
  name: string
  /** Whether this check is required for overall readiness */
  required: boolean
  /** Current status of the check */
  status: HealthCheckStatus
  /** Time taken to execute the check in milliseconds */
  latencyMs: number
  /** Optional message providing details (especially for failures) */
  message: string | null
}

/**
 * Overall readiness status
 */
export type ReadinessStatus = 'ok' | 'degraded' | 'fail'

/**
 * Response structure for the readiness endpoint
 */
export type ReadinessResponse = {
  /** Aggregate status across all checks */
  status: ReadinessStatus
  /** ISO 8601 timestamp when check was performed */
  timestamp: string
  /** Total time to run all checks in milliseconds */
  durationMs: number
  /** Individual check results */
  checks: HealthCheckResult[]
}

/**
 * Configuration for enabling/disabling individual checks
 */
export type CheckEnableMode = 'true' | 'false' | 'auto'

/**
 * Check identifier keys matching environment variable suffixes
 */
export type CheckKey =
  | 'DATABASE'
  | 'CACHE'
  | 'QUEUE_REDIS'
  | 'SEARCH_FULLTEXT'
  | 'SEARCH_VECTOR'
  | 'KMS'
  | 'EMAIL_DELIVERY'
  | 'EXTERNAL_AI_PROVIDERS'

/**
 * Strategy interface that all health check implementations must follow
 */
export interface ReadyCheckStrategy {
  /** Unique identifier for the check */
  readonly id: CheckKey
  /** Human-readable name for display */
  readonly name: string
  /** Whether this check is required for overall readiness */
  readonly required: boolean
  /**
   * Execute the health check
   * @returns Promise resolving to check result
   */
  check(): Promise<HealthCheckResult>
  /**
   * Determine if this strategy should run based on configuration
   * Used for 'auto' mode to detect if the service is configured
   */
  isConfigured(): boolean
}

/**
 * DI container interface - minimal subset for strategy dependency injection
 * Compatible with Awilix containers used by Open Mercato
 */
export interface HealthContainer {
  resolve<T = unknown>(name: string): T
  hasRegistration(name: string): boolean
}

/**
 * Options for creating the readiness orchestrator
 */
export type OrchestratorOptions = {
  /** DI container for resolving services */
  container?: HealthContainer
  /** Custom strategies to register (in addition to built-in) */
  strategies?: ReadyCheckStrategy[]
  /** Timeout for individual checks in milliseconds (default: 5000) */
  checkTimeout?: number
  /** Run checks in parallel (default: true) */
  parallel?: boolean
}

/**
 * Options for the readiness handler factory
 */
export type ReadyHandlerOptions = OrchestratorOptions & {
  /** Additional checks beyond built-in strategies */
  additionalStrategies?: ReadyCheckStrategy[]
}

/**
 * Handler response structure
 */
export type HandlerResponse<T> = {
  status: number
  body: T
}
