# @fullstackhouse/open-mercato-health

Health check endpoints for Open Mercato applications. Provides Kubernetes-style liveness and readiness probes with configurable service checks.

## Installation

```bash
npm install @fullstackhouse/open-mercato-health
```

## Quick Start

### Next.js App Router

```typescript
// app/api/health/live/route.ts
import { createNextHealthHandlers } from '@fullstackhouse/open-mercato-health/integrations/nextjs'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'

const handlers = createNextHealthHandlers(createRequestContainer)
export const GET = handlers.live

// app/api/health/ready/route.ts
export const GET = handlers.ready
```

## Endpoints

### Liveness (`GET /api/health/live`)

Returns `ok` with HTTP 200. No dependencies are checked - this indicates the process is running.

```
HTTP/1.1 200 OK
Content-Type: text/plain

ok
```

### Readiness (`GET /api/health/ready`)

Returns JSON with check results. HTTP 200 when all required checks pass, 503 when any required check fails.

```json
{
  "status": "ok",
  "timestamp": "2026-02-23T12:00:00.000Z",
  "durationMs": 18,
  "checks": [
    { "name": "Database", "required": true, "status": "ok", "latencyMs": 7, "message": null },
    { "name": "Cache", "required": true, "status": "ok", "latencyMs": 2, "message": null },
    { "name": "Search (Fulltext)", "required": false, "status": "skip", "latencyMs": 0, "message": "Check disabled or not configured" }
  ]
}
```

## Status Values

| Overall Status | Description | HTTP Code |
|----------------|-------------|-----------|
| `ok` | All required checks pass, optional checks pass or skip | 200 |
| `degraded` | All required checks pass, at least one optional check fails | 200 |
| `fail` | Any required check fails | 503 |

| Check Status | Description |
|--------------|-------------|
| `ok` | Check passed |
| `fail` | Check failed |
| `skip` | Check disabled or not configured |

## Built-in Checks

| Check | Required | Description |
|-------|----------|-------------|
| Database | Yes | Executes `SELECT 1` via EntityManager |
| Cache | Yes | Performs set/get/delete cycle |
| Queue (Redis) | No | Verifies BullMQ queue connectivity |
| Search (Fulltext) | No | Checks Meilisearch availability |
| Search (Vector) | No | Checks vector search provider |
| KMS (Vault) | No | Verifies encryption service health |
| Email Delivery | No | Checks email provider configuration |
| AI Providers | No | Verifies AI service connectivity |

## Configuration

Control which checks run via environment variables:

```bash
# Enable/disable individual checks (true, false, or auto)
HEALTH_READY_CHECK_DATABASE_ENABLED=true
HEALTH_READY_CHECK_CACHE_ENABLED=true
HEALTH_READY_CHECK_QUEUE_REDIS_ENABLED=auto
HEALTH_READY_CHECK_SEARCH_FULLTEXT_ENABLED=auto
HEALTH_READY_CHECK_SEARCH_VECTOR_ENABLED=auto
HEALTH_READY_CHECK_KMS_ENABLED=auto
HEALTH_READY_CHECK_EMAIL_DELIVERY_ENABLED=auto
HEALTH_READY_CHECK_EXTERNAL_AI_PROVIDERS_ENABLED=auto
```

- `true`: Always run the check
- `false`: Never run the check
- `auto` (default): Run if the service is configured

## Custom Checks

Create custom health check strategies by extending `BaseReadyCheckStrategy`:

```typescript
import { BaseReadyCheckStrategy } from '@fullstackhouse/open-mercato-health'
import type { CheckKey, HealthContainer } from '@fullstackhouse/open-mercato-health'

class StripeReadyCheckStrategy extends BaseReadyCheckStrategy {
  readonly id = 'STRIPE' as CheckKey
  readonly name = 'Stripe API'
  readonly required = false

  constructor(private readonly container: HealthContainer) {
    super()
  }

  isConfigured(): boolean {
    return Boolean(process.env.STRIPE_SECRET_KEY)
  }

  protected async performCheck(): Promise<{ ok: boolean; message?: string }> {
    const stripe = this.container.resolve<any>('stripeService')
    await stripe.balance.retrieve()
    return { ok: true }
  }
}
```

Use custom strategies with the orchestrator:

```typescript
import { createNextHealthHandlers } from '@fullstackhouse/open-mercato-health/integrations/nextjs'

const handlers = createNextHealthHandlers(createRequestContainer, {
  additionalStrategies: [new StripeReadyCheckStrategy(container)],
})
```

## API Reference

### `createNextHealthHandlers(getContainer, options?)`

Create Next.js App Router handlers for health endpoints.

**Parameters:**
- `getContainer`: `() => Promise<HealthContainer> | HealthContainer` - Function returning DI container
- `options`: `ReadyHandlerOptions` (optional)

**Returns:** `{ live(): Promise<Response>, ready(): Promise<Response> }`

### `ReadinessOrchestrator`

Orchestrates health check strategies.

```typescript
import { ReadinessOrchestrator } from '@fullstackhouse/open-mercato-health'

const orchestrator = new ReadinessOrchestrator({
  container,           // DI container
  strategies: [],      // Custom strategies
  checkTimeout: 5000,  // Per-check timeout (ms)
  parallel: true,      // Run checks in parallel
})

const result = await orchestrator.checkReadiness()
```

### Types

```typescript
type HealthCheckStatus = 'ok' | 'fail' | 'skip'

type HealthCheckResult = {
  name: string
  required: boolean
  status: HealthCheckStatus
  latencyMs: number
  message: string | null
}

type ReadinessResponse = {
  status: 'ok' | 'degraded' | 'fail'
  timestamp: string
  durationMs: number
  checks: HealthCheckResult[]
}

interface HealthContainer {
  resolve<T>(name: string): T
  hasRegistration(name: string): boolean
}
```

## Kubernetes Configuration

```yaml
livenessProbe:
  httpGet:
    path: /api/health/live
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /api/health/ready
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
```

## License

MIT
