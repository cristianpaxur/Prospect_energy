import { DASHBOARD_PIPELINE_ORDER, type DashboardSummary } from '@/lib/dashboard/summary'

const labels: Record<(typeof DASHBOARD_PIPELINE_ORDER)[number], string> = {
  NOVO: 'Novos', CONTATO_REALIZADO: 'Contatados', INTERESSADO: 'Interessados',
  AGUARDANDO_FATURA: 'Aguardando fatura', ANALISE: 'Em análise', PROPOSTA: 'Propostas', FECHADO: 'Fechados', PERDIDO: 'Perdidos',
}

export function Funnel({ summary }: { summary: DashboardSummary }) {
  const max = Math.max(1, ...DASHBOARD_PIPELINE_ORDER.filter((status) => status !== 'PERDIDO').map((status) => summary.pipelineCounts[status]))
  return <section className="card"><div className="card-head"><div><h2 className="card-title">Seu funil de vendas</h2><p className="card-copy">Oportunidades por etapa do processo</p></div><span className="badge">{summary.leadCount} leads</span></div><div className="funnel-list">{DASHBOARD_PIPELINE_ORDER.filter((status) => status !== 'PERDIDO').map((status) => <div className="funnel-row" key={status}><span>{labels[status]}</span><div className="funnel-track"><div className="funnel-bar" style={{ width: `${summary.pipelineCounts[status] ? Math.max(7, (summary.pipelineCounts[status] / max) * 100) : 0}%` }} /></div><span className="funnel-count">{summary.pipelineCounts[status]}</span></div>)}</div></section>
}
