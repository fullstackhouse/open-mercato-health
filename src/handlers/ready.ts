import { ReadinessOrchestrator } from '../orchestrator'
import type {
  ReadyHandlerOptions,
  ReadinessResponse,
  HandlerResponse,
} from '../types'

/**
 * Create a readiness check handler.
 * Returns a handler that executes all health checks and returns the aggregated result.
 *
 * HTTP Status codes:
 * - 200: All required checks pass (status: 'ok' or 'degraded')
 * - 503: Any required check fails (status: 'fail')
 */
export function createReadinessHandler(
  options: ReadyHandlerOptions = {}
): () => Promise<HandlerResponse<ReadinessResponse>> {
  const orchestrator = new ReadinessOrchestrator(options)

  if (options.additionalStrategies) {
    for (const strategy of options.additionalStrategies) {
      orchestrator.addStrategy(strategy)
    }
  }

  return async function handleReadiness(): Promise<
    HandlerResponse<ReadinessResponse>
  > {
    const response = await orchestrator.checkReadiness()

    // HTTP 200 for 'ok' and 'degraded', 503 for 'fail'
    const status = response.status === 'fail' ? 503 : 200

    return {
      status,
      body: response,
    }
  }
}
