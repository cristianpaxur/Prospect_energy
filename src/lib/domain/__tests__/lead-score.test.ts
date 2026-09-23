import { describe, expect, it } from 'vitest'
import { potentialFromScore, scoreLead } from '../lead-score'

describe('lead score', () => {
  it('combines segment, available contact and long opening-hours signals', () => {
    expect(scoreLead({ category: 'MERCADO', hasPhone: true, hasWebsite: true, openHours: 13 })).toBe(65)
  })

  it('caps the score and classifies each approved threshold', () => {
    expect(scoreLead({ category: 'HOTEL', hasPhone: true, hasWebsite: true, openHours: 24 })).toBe(65)
    expect(potentialFromScore(30)).toBe('BAIXO')
    expect(potentialFromScore(31)).toBe('MEDIO')
    expect(potentialFromScore(61)).toBe('ALTO')
    expect(potentialFromScore(81)).toBe('MUITO_ALTO')
  })
})
