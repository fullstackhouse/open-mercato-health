// Type declarations for module files
// These are used by consuming applications at build time

declare module '@fullstackhouse/open-mercato-health/modules/health/index' {
  export const metadata: {
    name: string
    title: string
    version: string
    description: string
    author: string
    license: string
  }
}

declare module '@fullstackhouse/open-mercato-health/modules/health/api/get/live' {
  import type { NextResponse } from 'next/server'

  export const metadata: {
    GET: { requireAuth: boolean }
  }

  export function GET(): Promise<NextResponse>
  export default GET

  export const openApi: {
    tag: string
    summary: string
    methods: Record<string, unknown>
  }
}

declare module '@fullstackhouse/open-mercato-health/modules/health/api/get/ready' {
  import type { NextResponse } from 'next/server'

  export const metadata: {
    GET: { requireAuth: boolean }
  }

  export function GET(): Promise<NextResponse>
  export default GET

  export const openApi: {
    tag: string
    summary: string
    methods: Record<string, unknown>
  }
}
