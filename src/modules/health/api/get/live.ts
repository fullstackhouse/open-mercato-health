import type { OpenApiMethodDoc, OpenApiRouteDoc } from '@open-mercato/shared/lib/openapi'
import { NextResponse } from 'next/server'

export const metadata = {
  GET: {
    requireAuth: false,
  },
}

export async function GET() {
  return new NextResponse('ok', {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  })
}

export default GET

const healthTag = 'Health'

const liveDoc: OpenApiMethodDoc = {
  summary: 'Liveness probe',
  description: 'Returns ok if the process is alive. No dependency checks.',
  tags: [healthTag],
  responses: [
    {
      status: 200,
      description: 'Process is alive',
      mediaType: 'text/plain',
      example: 'ok',
    },
  ],
}

export const openApi: OpenApiRouteDoc = {
  tag: healthTag,
  summary: 'Liveness probe',
  methods: {
    GET: liveDoc,
  },
}
