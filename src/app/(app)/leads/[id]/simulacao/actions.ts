'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentContext } from '@/lib/auth/context'
import { calculateSimulation } from '@/lib/domain/eligibility'
import { chooseEligibilityRule, toSimulationInsert } from '@/lib/simulations/save-simulation'
import type { CustomerType, EligibilityStatus } from '@/lib/supabase/database'
import type { SimulationResult } from '@/types/domain'

export type SimulationActionState = { error?: string; saved?: { id: string; amount: number; result: SimulationResult } }

export async function saveSimulation(_state: SimulationActionState, formData: FormData): Promise<SimulationActionState> {
  const leadId = String(formData.get('leadId') ?? '')
  const invoiceId = String(formData.get('invoiceId') ?? '')
  if (!leadId || !invoiceId) return { error: 'Selecione uma fatura válida.' }

  const { supabase, organizationId, user } = await getCurrentContext()
  const [{ data: lead }, { data: invoice }, { data: ruleRows }] = await Promise.all([
    supabase.from('leads').select('id').eq('id', leadId).eq('organization_id', organizationId).maybeSingle(),
    supabase.from('invoices').select('id,amount,provider,state,customer_type').eq('id', invoiceId).eq('lead_id', leadId).eq('organization_id', organizationId).maybeSingle(),
    supabase.from('eligibility_rules').select('id,provider,state,customer_type,minimum_amount,maximum_amount,discount_percentage,active').eq('organization_id', organizationId).eq('active', true),
  ])
  if (!lead || !invoice) return { error: 'O lead ou a fatura não estão disponíveis.' }

  const invoiceRow = invoice as unknown as { id: string; amount: number; provider: string; state: string; customer_type: CustomerType }
  const ruleRecords = (ruleRows ?? []) as unknown as { id: string; provider: string; state: string; customer_type: CustomerType; minimum_amount: number | null; maximum_amount: number | null; discount_percentage: number; active: boolean }[]
  const invoiceInput = { amount: Number(invoiceRow.amount), provider: invoiceRow.provider, state: invoiceRow.state, customerType: invoiceRow.customer_type }
  const rules = ruleRecords.map((row) => ({
    id: row.id,
    provider: row.provider,
    state: row.state,
    customerType: row.customer_type as CustomerType,
    minimumAmount: row.minimum_amount === null ? null : Number(row.minimum_amount),
    maximumAmount: row.maximum_amount === null ? null : Number(row.maximum_amount),
    discountPercentage: Number(row.discount_percentage),
    active: row.active,
  }))
  const rule = chooseEligibilityRule(rules, invoiceInput)
  const result = calculateSimulation(invoiceInput, rule)
  const { data: simulation, error: simulationError } = await supabase.from('simulations').insert({
    organization_id: organizationId,
    created_by: user.id,
    ...toSimulationInsert(leadId, invoiceRow.id, invoiceInput.amount, rule, result),
    eligibility_status: result.status as EligibilityStatus,
  }).select('id').single()
  if (simulationError || !simulation) return { error: 'Não foi possível salvar a simulação.' }
  const savedSimulation = simulation as unknown as { id: string }

  const { error: activityError } = await supabase.from('lead_activities').insert({ organization_id: organizationId, lead_id: leadId, user_id: user.id, type: 'SIMULACAO_REALIZADA', metadata: { simulation_id: savedSimulation.id, eligibility_status: result.status } })
  if (activityError) {
    await supabase.from('simulations').delete().eq('id', savedSimulation.id).eq('organization_id', organizationId)
    return { error: 'A simulação não pôde ser registrada no histórico.' }
  }
  revalidatePath(`/leads/${leadId}`)
  revalidatePath(`/leads/${leadId}/simulacao`)
  revalidatePath('/dashboard')
  return { saved: { id: savedSimulation.id, amount: invoiceInput.amount, result } }
}
