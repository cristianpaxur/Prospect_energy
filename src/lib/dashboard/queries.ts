import { createClient } from '@/lib/supabase/server'
import { toDashboardSummary, todayInSaoPaulo, type DashboardInput } from './summary'
export { DASHBOARD_PIPELINE_ORDER } from './summary'
export type { DashboardSummary } from './summary'
export { todayInSaoPaulo } from './summary'

export async function getDashboardSummary(organizationId: string, today = todayInSaoPaulo()) {
  const supabase = await createClient()
  const [{ data: leads }, { data: invoices }, { data: simulations }, { data: tasks }, intakeQueue] = await Promise.all([
    supabase.from('leads').select('id,pipeline_status').eq('organization_id', organizationId),
    supabase.from('invoices').select('id').eq('organization_id', organizationId),
    supabase.from('simulations').select('lead_id,estimated_monthly_savings,created_at').eq('organization_id', organizationId).order('created_at', { ascending: false }),
    supabase.from('tasks').select('id,lead_id,type,description,due_at,completed_at,leads(name)').eq('organization_id', organizationId).is('completed_at', null).order('due_at', { ascending: true }).limit(50),
    supabase.from('public_intake_submissions').select('id,lead_id,upload_state,created_at,leads(name,city)', { count: 'exact' }).eq('organization_id', organizationId).is('reviewed_at', null).order('created_at', { ascending: false }).limit(6),
  ])

  return toDashboardSummary({
    leads: (leads ?? []) as unknown as DashboardInput['leads'],
    invoices: (invoices ?? []) as unknown as DashboardInput['invoices'],
    simulations: (simulations ?? []) as unknown as DashboardInput['simulations'],
    tasks: (tasks ?? []) as unknown as DashboardInput['tasks'],
    publicIntakeCount: intakeQueue.count ?? 0,
    publicIntakeSubmissions: (intakeQueue.data ?? []) as unknown as NonNullable<DashboardInput['publicIntakeSubmissions']>,
  }, today)
}
