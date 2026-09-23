import type { EligibilityRule, InvoiceInput, SimulationResult } from '@/types/domain'

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function emptyResult(status: SimulationResult['status'], discountPercentage: number | null = null): SimulationResult {
  return { status, discountPercentage, monthlySavings: null, annualSavings: null, newAmount: null }
}

export function calculateSimulation(invoice: InvoiceInput, rule: EligibilityRule | null): SimulationResult {
  if (!Number.isFinite(invoice.amount) || invoice.amount < 0 || !rule || !rule.active) {
    return emptyResult('NECESSITA_VALIDACAO')
  }

  const matches = rule.provider.trim().toLocaleUpperCase('pt-BR') === invoice.provider.trim().toLocaleUpperCase('pt-BR')
    && rule.state.trim().toLocaleUpperCase('pt-BR') === invoice.state.trim().toLocaleUpperCase('pt-BR')
    && rule.customerType === invoice.customerType
  if (!matches) return emptyResult('NECESSITA_VALIDACAO')

  if ((rule.minimumAmount !== null && invoice.amount < rule.minimumAmount)
    || (rule.maximumAmount !== null && invoice.amount > rule.maximumAmount)) {
    return emptyResult('FORA_DOS_CRITERIOS', rule.discountPercentage)
  }

  const monthlySavings = roundMoney(invoice.amount * rule.discountPercentage / 100)
  return {
    status: 'POTENCIALMENTE_ELEGIVEL',
    discountPercentage: rule.discountPercentage,
    monthlySavings,
    annualSavings: roundMoney(monthlySavings * 12),
    newAmount: roundMoney(invoice.amount - monthlySavings),
  }
}
