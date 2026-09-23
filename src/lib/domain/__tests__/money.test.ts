import { describe, expect, it } from 'vitest'
import { formatBRL, parseBRL } from '../money'

describe('money helpers', () => {
  it('formats a stored decimal as Brazilian currency', () => {
    expect(formatBRL(3850)).toBe('R$ 3.850,00')
  })

  it('parses a Brazilian decimal without accepting an invalid amount', () => {
    expect(parseBRL('R$ 3.850,50')).toBe(3850.5)
    expect(parseBRL('abc')).toBeNull()
  })
})
