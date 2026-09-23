import type { EligibilityRule, InvoiceInput, SimulationResult } from '@/types/domain'

export function chooseEligibilityRule(rules: EligibilityRule[], invoice: InvoiceInput): EligibilityRule | null {
  const matches = rules.filter((rule) => rule.active
    && rule.provider.trim().toLocaleUpperCase('pt-BR') === invoice.provider.trim().toLocaleUpperCase('pt-BR')
    && rule.state.trim().toLocaleUpperCase('pt-BR') === invoice.state.trim().toLocaleUpperCase('pt-BR')
    && rule.customerType === invoice.customerType)
  const withinRange = matches.filter((rule) => (rule.minimumAmount === null || invoice.amount >= rule.minimumAmount)
    && (rule.maximumAmount === null || invoice.amount <= rule.maximumAmount))
  return withinRange.sort((a, b) => {
    const aRange = (a.maximumAmount ?? Number.POSITIVE_INFINITY) - (a.minimumAmount ?? 0)
    const bRange = (b.maximumAmount ?? Number.POSITIVE_INFINITY) - (b.minimumAmount ?? 0)
    return aRange - bRange
  })[0] ?? matches[0] ?? null
}

export function toSimulationInsert(leadId: string, invoiceId: string, amount: number, rule: EligibilityRule | null, result: SimulationResult) {
  return {
    lead_id: leadId,
    invoice_id: invoiceId,
    current_amount: amount,
    rule_id: rule?.id ?? null,
    discount_percentage: result.discountPercentage,
    estimated_monthly_savings: result.monthlySavings,
    estimated_annual_savings: result.annualSavings,
    estimated_new_amount: result.newAmount,
    eligibility_status: result.status,
  }
}

export function buildSimulationWhatsAppText(input: { name: string; amount: number; result: SimulationResult }) {
  if (input.result.status !== 'POTENCIALMENTE_ELEGIVEL' || input.result.monthlySavings === null || input.result.annualSavings === null || input.result.newAmount === null) {
    return `Olá, ${input.name}! Analisei a fatura de energia e preciso validar alguns critérios antes de confirmar uma estimativa de economia.`
  }
  const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  return `Olá, ${input.name}! Com base na fatura de ${money(input.amount)}, a estimativa é de ${money(input.result.monthlySavings)} de economia por mês (${money(input.result.annualSavings)} ao ano). A nova estimativa seria ${money(input.result.newAmount)}. O resultado está sujeito à validação final das condições.`
}
