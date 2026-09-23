import type { Metadata } from 'next'
import Link from 'next/link'
import { PipelineBoard } from '@/components/pipeline/pipeline-board'
import { getCurrentContext } from '@/lib/auth/context'
import type { LeadCardData } from '@/types/domain'

export const metadata: Metadata = { title: 'Pipeline' }

export default async function PipelinePage() {
  const { supabase, organizationId } = await getCurrentContext()
  const { data } = await supabase.from('leads').select('id,name,category,city,state,score,pipeline_status,created_at').eq('organization_id', organizationId).order('updated_at', { ascending: false }).limit(500)
  const leads = (data ?? []) as unknown as LeadCardData[]
  return <main className="page-content"><div className="page-heading"><div><div className="eyebrow">Acompanhe seus leads em cada etapa</div><h1 className="page-title">Pipeline de oportunidades</h1><p className="page-subtitle">Arraste os cartões entre as etapas ou abra o lead para ver os detalhes.</p></div><Link className="btn btn-secondary" href="/leads">Ver lista</Link></div>
    {leads.length ? <PipelineBoard initialLeads={leads} /> : <section className="card empty-state"><div><h2 className="empty-title">Seu pipeline está vazio</h2><p className="empty-copy">Pesquise empresas da região e adicione os primeiros leads.</p><Link className="btn btn-primary" href="/prospectar">Prospectar empresas</Link></div></section>}
  </main>
}
