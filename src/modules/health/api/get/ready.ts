import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { ReadinessOrchestrator } from '../../../../orchestrator'
import type { OpenApiMethodDoc, OpenApiRouteDoc } from '@open-mercato/shared/lib/openapi'
import { NextResponse } from 'next/server'

export const metadata = {
  GET: {
    requireAuth: false,
  },
}

export async function GET() {
  const container = await createRequestContainer()

  const orchestrator = new ReadinessOrchestrator({
    container,
  })
  const result = await orchestrator.checkReadiness()
  const statusCode = result.status === 'fail' ? 503 : 200

  return NextResponse.json(result, { status: statusCode })
}

export default GET

const healthTag = 'Health'

const readyDoc: OpenApiMethodDoc = {
  summary: 'Readiness probe',
  description:
    'Checks database, cache, and queue connectivity. Returns 503 if required checks fail.',
  tags: [healthTag],
  responses: [
    { status: 200, description: 'All required checks pass' },
    { status: 503, description: 'Required check failed' },
  ],
}

export const openApi: OpenApiRouteDoc = {
  tag: healthTag,
  summary: 'Readiness probe',
  methods: {
    GET: readyDoc,
  },
}
