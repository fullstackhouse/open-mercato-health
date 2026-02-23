import { describe, it, expect } from 'vitest'
import { createLivenessHandler, LIVENESS_RESPONSE } from './live'

describe('createLivenessHandler', () => {
  it('returns 200 status', async () => {
    const handler = createLivenessHandler()
    const result = await handler()

    expect(result.status).toBe(200)
  })

  it('returns ok body', async () => {
    const handler = createLivenessHandler()
    const result = await handler()

    expect(result.body).toBe('ok')
  })
})

describe('LIVENESS_RESPONSE', () => {
  it('has correct status', () => {
    expect(LIVENESS_RESPONSE.status).toBe(200)
  })

  it('has correct body', () => {
    expect(LIVENESS_RESPONSE.body).toBe('ok')
  })
})
