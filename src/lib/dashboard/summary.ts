export const DASHBOARD_PIPELINE_ORDER = [
  'NOVO', 'CONTATO_REALIZADO', 'INTERESSADO', 'AGUARDANDO_FATURA', 'ANALISE', 'PROPOSTA', 'FECHADO', 'PERDIDO',
] as const

export type DashboardInput = {
  leads: { id?: string; pipeline_status: string }[]
  invoices: { id: string }[]
  simulations: { lead_id: string; estimated_monthly_savings: number | string | null; created_at: string }[]
  tasks: { id: string; lead_id?: string; type?: string; description?: string; due_at: string; completed_at: string | null; leads?: { name: string } | null }[]
  publicIntakeCount?: number
  publicIntakeSubmissions?: { id: string; lead_id: string; upload_state: string; created_at: string; leads?: { name: string; city?: string } | null }[]
}

export type DashboardSummary = {
  leadCount: number
  contactedCount: number
  invoiceCount: number
  identifiedSavings: number
  pipelineCounts: Record<(typeof DASHBOARD_PIPELINE_ORDER)[number], number>
  todayTasks: DashboardInput['tasks']
  publicIntakeCount: number
  publicIntakeSubmissions: NonNullable<DashboardInput['publicIntakeSubmissions']>
}

export function toDashboardSummary(input: DashboardInput, today: string): DashboardSummary {
  const pipelineCounts = Object.fromEntries(DASHBOARD_PIPELINE_ORDER.map((status) => [status, 0])) as DashboardSummary['pipelineCounts']
  for (const lead of input.leads) {
    if (lead.pipeline_status in pipelineCounts) pipelineCounts[lead.pipeline_status as keyof typeof pipelineCounts] += 1
  }

  const latestSavingsByLead = new Map<string, { date: string; amount: number }>()
  for (const simulation of input.simulations) {
    const existing = latestSavingsByLead.get(simulation.lead_id)
    if (!existing || simulation.created_at > existing.date) {
      latestSavingsByLead.set(simulation.lead_id, {
        date: simulation.created_at,
        amount: Number(simulation.estimated_monthly_savings ?? 0),
      })
    }
  }

  const todayTasks = input.tasks.filter((task) => {
    if (task.completed_at) return false
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date(task.due_at)) === today
  })

  return {
    leadCount: input.leads.length,
    contactedCount: input.leads.filter((lead) => lead.pipeline_status !== 'NOVO').length,
    invoiceCount: input.invoices.length,
    identifiedSavings: Math.round([...latestSavingsByLead.values()].reduce((total, row) => total + row.amount, 0) * 100) / 100,
    pipelineCounts,
    todayTasks,
    publicIntakeCount: input.publicIntakeCount ?? 0,
    publicIntakeSubmissions: input.publicIntakeSubmissions ?? [],
  }
}

export function todayInSaoPaulo(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(date)
}
