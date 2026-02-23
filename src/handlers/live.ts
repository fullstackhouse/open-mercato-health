import type { HandlerResponse } from '../types'

/**
 * Liveness check response - always returns 'ok' with HTTP 200.
 * This indicates the process is running and can accept requests.
 * No dependencies are checked - this is intentionally minimal.
 */
export const LIVENESS_RESPONSE: HandlerResponse<string> = {
  status: 200,
  body: 'ok',
}

/**
 * Create a liveness handler function.
 * Returns a handler that always responds with 'ok' and HTTP 200.
 */
export function createLivenessHandler(): () => Promise<HandlerResponse<string>> {
  return async function handleLiveness(): Promise<HandlerResponse<string>> {
    return LIVENESS_RESPONSE
  }
}
