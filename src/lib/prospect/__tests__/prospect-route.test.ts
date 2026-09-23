import { describe, expect, it } from 'vitest'
import { GET } from '@/app/prospect/route'

describe('legacy prospect route', () => {
  it('redirects /prospect to the current Prospectar page', () => {
    const response = GET(new Request('http://localhost:3000/prospect'))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost:3000/prospectar')
  })
})
