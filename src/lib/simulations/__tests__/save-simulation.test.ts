import { describe, expect, it } from 'vitest'
import { chooseEligibilityRule, toSimulationInsert } from '../save-simulation'

const rule = { id: 'rule-1', provider: 'CPFL', state: 'SP', customerType: 'COMERCIAL' as const, minimumAmount: 1000, maximumAmount: 5000, discountPercentage: 12, active: true }

describe('simulation persistence helpers', () => {
  it('prefers an active exact-scope rule, retaining it to explain an out-of-range result', () => {
    expect(chooseEligibilityRule([rule, { ...rule, id: 'inactive', active: false }], { amount: 3850, provider: 'CPFL', state: 'SP', customerType: 'COMERCIAL' })).toEqual(rule)
    expect(chooseEligibilityRule([rule], { amount: 7000, provider: 'CPFL', state: 'SP', customerType: 'COMERCIAL' })).toEqual(rule)
  })

  it('maps the calculated estimate into the persisted simulation shape', () => {
    expect(toSimulationInsert('lead-1', 'invoice-1', 3850, rule, { status: 'POTENCIALMENTE_ELEGIVEL', discountPercentage: 12, monthlySavings: 462, annualSavings: 5544, newAmount: 3388 }))
      .toMatchObject({ lead_id: 'lead-1', invoice_id: 'invoice-1', current_amount: 3850, rule_id: 'rule-1', estimated_monthly_savings: 462, estimated_annual_savings: 5544, estimated_new_amount: 3388 })
  })
})
