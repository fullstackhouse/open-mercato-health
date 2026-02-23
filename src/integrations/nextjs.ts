import { createLivenessHandler } from '../handlers/live'
import { createReadinessHandler } from '../handlers/ready'
import type { ReadyHandlerOptions, HealthContainer } from '../types'

/**
 * Create Next.js App Router handlers for health endpoints.
 *
 * @param getContainer - Async function that returns the DI container
 * @param options - Additional options for readiness checks
 * @returns Object with live() and ready() handlers for Next.js routes
 *
 * @example
 * ```typescript
 * // app/api/health/live/route.ts
 * import { createNextHealthHandlers } from '@fullstackhouse/open-mercato-health/integrations/nextjs'
 * import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
 *
 * const handlers = createNextHealthHandlers(createRequestContainer)
 * export const GET = handlers.live
 *
 * // app/api/health/ready/route.ts
 * export const GET = handlers.ready
 * ```
 */
export function createNextHealthHandlers(
  getContainer: () => Promise<HealthContainer> | HealthContainer,
  options: Omit<ReadyHandlerOptions, 'container'> = {}
) {
  const livenessHandler = createLivenessHandler()

  return {
    /**
     * Liveness endpoint handler for Next.js App Router.
     * GET /api/health/live
     *
     * Always returns 200 OK with body 'ok'.
     */
    async live(): Promise<Response> {
      const result = await livenessHandler()
      return new Response(result.body, {
        status: result.status,
        headers: { 'Content-Type': 'text/plain' },
      })
    },

    /**
     * Readiness endpoint handler for Next.js App Router.
     * GET /api/health/ready
     *
     * Returns 200 OK when all required checks pass (status: ok or degraded).
     * Returns 503 Service Unavailable when any required check fails (status: fail).
     */
    async ready(): Promise<Response> {
      const container = await getContainer()
      const readinessHandler = createReadinessHandler({
        ...options,
        container,
      })

      const result = await readinessHandler()
      return new Response(JSON.stringify(result.body), {
        status: result.status,
        headers: { 'Content-Type': 'application/json' },
      })
    },
  }
}

/**
 * Create individual Next.js route handlers (alternative API).
 *
 * @example
 * ```typescript
 * // app/api/health/live/route.ts
 * import { createNextLiveHandler } from '@fullstackhouse/open-mercato-health/integrations/nextjs'
 * export const GET = createNextLiveHandler()
 *
 * // app/api/health/ready/route.ts
 * import { createNextReadyHandler } from '@fullstackhouse/open-mercato-health/integrations/nextjs'
 * import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
 * export const GET = createNextReadyHandler(createRequestContainer)
 * ```
 */
export function createNextLiveHandler(): () => Promise<Response> {
  const handler = createLivenessHandler()

  return async function GET(): Promise<Response> {
    const result = await handler()
    return new Response(result.body, {
      status: result.status,
      headers: { 'Content-Type': 'text/plain' },
    })
  }
}

export function createNextReadyHandler(
  getContainer: () => Promise<HealthContainer> | HealthContainer,
  options: Omit<ReadyHandlerOptions, 'container'> = {}
): () => Promise<Response> {
  return async function GET(): Promise<Response> {
    const container = await getContainer()
    const handler = createReadinessHandler({
      ...options,
      container,
    })

    const result = await handler()
    return new Response(JSON.stringify(result.body), {
      status: result.status,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
