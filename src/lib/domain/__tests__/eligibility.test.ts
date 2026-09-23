import { describe, expect, it } from 'vitest'
import { calculateSimulation } from '../eligibility'

const invoice = { amount: 3850, provider: 'CPFL', state: 'SP', customerType: 'COMERCIAL' as const }
const rule = { provider: 'CPFL', state: 'SP', customerType: 'COMERCIAL' as const, minimumAmount: null, maximumAmount: null, discountPercentage: 12, active: true }

describe('simulation eligibility', () => {
  it('calculates estimated savings using a matching active rule', () => {
    expect(calculateSimulation(invoice, rule)).toMatchObject({
      status: 'POTENCIALMENTE_ELEGIVEL', monthlySavings: 462, annualSavings: 5544, newAmount: 3388,
    })
  })

  it('requires validation when there is no active matching rule', () => {
    expect(calculateSimulation(invoice, null).status).toBe('NECESSITA_VALIDACAO')
    expect(calculateSimulation(invoice, { ...rule, active: false }).status).toBe('NECESSITA_VALIDACAO')
    expect(calculateSimulation(invoice, { ...rule, provider: 'EDP' }).status).toBe('NECESSITA_VALIDACAO')
  })

  it('marks accounts outside configured limits without applying an estimate', () => {
    const result = calculateSimulation(invoice, { ...rule, minimumAmount: 4000 })
    expect(result.status).toBe('FORA_DOS_CRITERIOS')
    expect(result.monthlySavings).toBeNull()
  })
})
