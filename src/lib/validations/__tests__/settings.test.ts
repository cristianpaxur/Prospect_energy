import { describe, expect, it } from 'vitest'
import { eligibilityRuleSchema } from '../settings'

describe('eligibilityRuleSchema', () => {
  it('accepts optional empty range limits and normalizes state', () => {
    expect(eligibilityRuleSchema.safeParse({
      provider: 'CPFL', state: 'sp', customerType: 'COMERCIAL', minimumAmount: '', maximumAmount: '', discountPercentage: '12', active: true,
    }).data).toMatchObject({ state: 'SP', minimumAmount: null, maximumAmount: null, discountPercentage: 12 })
  })

  it('rejects an invalid state and a discount over one hundred percent', () => {
    expect(eligibilityRuleSchema.safeParse({ provider: '', state: 'S', customerType: 'COMERCIAL', discountPercentage: '101', active: true }).success).toBe(false)
  })

  it('rejects a minimum amount greater than its maximum', () => {
    expect(eligibilityRuleSchema.safeParse({ provider: 'CPFL', state: 'SP', customerType: 'COMERCIAL', minimumAmount: '3000', maximumAmount: '2000', discountPercentage: '12', active: true }).success).toBe(false)
  })
})
