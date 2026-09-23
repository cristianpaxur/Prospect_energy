import type { Metadata } from 'next'
import Link from 'next/link'
import { Building2, FileText, History, MapPin, MessageSquareText } from 'lucide-react'
import { ActivityFeed } from '@/components/leads/activity-feed'
import { GooglePlacePanel } from '@/components/leads/google-place-panel'
import { GooglePlaceProvider } from '@/components/leads/google-place-provider'
import { LeadCompanyInfo } from '@/components/leads/lead-company-info'
import { LeadEditForm } from '@/components/leads/lead-edit-form'
import { LeadHeader } from '@/components/leads/lead-header'
import { LeadNextAction } from '@/components/leads/lead-next-action'
import { LeadStageControl } from '@/components/leads/lead-stage-control'
import { NoteForm } from '@/components/leads/note-form'
import { QuickActions } from '@/components/leads/quick-actions'
import { getCurrentContext } from '@/lib/auth/context'
import { formatBRL } from '@/lib/domain/money'
import { getLeadDetail } from '@/lib/leads/queries'
import type { PipelineStatus } from '@/types/domain'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const detail = await getLeadDetail(id)
  return { title: detail.lead.name }
}

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [detail, context] = await Promise.all([getLeadDetail(id), getCurrentContext()])
  const { lead } = detail
  const { data: templates } = await context.supabase.from('message_templates').select('content').eq('organization_id', context.organizationId).eq('template_key', 'PRIMEIRO_CONTATO').maybeSingle()
  const defaultMessage = (templates?.content as string | undefined) ?? 'Olá, {{nome_empresa}}! Sou {{nome_licenciado}} de {{cidade}}. Posso apresentar uma forma de reduzir os custos com energia?'
  const latestInvoice = detail.invoices[0]
  const latestSimulation = detail.simulations[0]

  return <GooglePlaceProvider leadId={lead.id} enabled={Boolean(lead.external_place_id)} autoLoad={false}>
    <main className="page-content lead-detail-page">
      <LeadHeader lead={lead} />
      <div className="lead-focus-stack">
        <LeadStageControl leadId={lead.id} status={lead.pipeline_status as PipelineStatus} />
        <LeadNextAction leadId={lead.id} tasks={detail.tasks} />
      </div>

      <div className="two-column lead-detail-secondary">
        <div className="stack">
          <section className="card lead-contact-card" aria-labelledby="lead-contact-title">
            <div className="card-head"><div><span className="label">Contato principal</span><h2 className="card-title" id="lead-contact-title">Falar com a empresa</h2><p className="card-copy">Revise a mensagem e escolha como entrar em contato.</p></div><span className="lead-contact-icon"><MessageSquareText size={17} /></span></div>
            <div className="card-pad lead-contact-content"><QuickActions lead={lead} licenseeName={context.profile.full_name} licenseeCity={context.profile.city} defaultMessage={defaultMessage} /></div>
          </section>

          <details className="card disclosure-card">
            <summary className="card-head disclosure-summary"><div><h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Building2 size={16} color="#0a8a58" /> Informações da empresa</h2><p className="card-copy">Dados de contato e informações editáveis</p></div></summary>
            <div className="card-pad stack"><LeadCompanyInfo lead={lead} /><div className="divider" /><LeadEditForm lead={lead} /></div>
          </details>

          <details className="card disclosure-card">
            <summary className="card-head disclosure-summary"><div><h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><MessageSquareText size={16} color="#0a8a58" /> Anotações</h2><p className="card-copy">Informações adicionadas por você</p></div></summary>
            <div className="card-pad stack">{detail.notes.map((note) => <div key={note.id} className="lead-note"><div className="small" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{note.content}</div><div className="company-address">{new Date(note.created_at).toLocaleString('pt-BR')}</div></div>)}<NoteForm leadId={lead.id} /></div>
          </details>
        </div>

        <div className="stack">
          <details className="card disclosure-card">
            <summary className="card-head disclosure-summary"><div><h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FileText size={16} color="#0a8a58" /> Fatura e simulação</h2><p className="card-copy">{latestInvoice ? `${formatBRL(Number(latestInvoice.amount))} · ${Number(latestInvoice.consumption_kwh).toLocaleString('pt-BR')} kWh` : 'Análise de consumo e economia potencial'}</p></div></summary>
            <div className="card-pad stack">{latestInvoice ? <div className="notice">Última fatura · {formatBRL(Number(latestInvoice.amount))} · {Number(latestInvoice.consumption_kwh).toLocaleString('pt-BR')} kWh<br />{latestSimulation ? `Economia estimada: ${formatBRL(Number(latestSimulation.estimated_monthly_savings ?? 0))}/mês` : 'Ainda não simulada.'}</div> : <p className="small muted">Nenhuma fatura cadastrada.</p>}<Link className="btn btn-secondary" href={`/leads/${lead.id}/fatura`}><FileText size={14} />{latestInvoice ? 'Atualizar fatura' : 'Adicionar fatura'}</Link></div>
          </details>

          <details className="card disclosure-card">
            <summary className="card-head disclosure-summary"><div><h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><History size={16} color="#0a8a58" /> Histórico</h2><p className="card-copy">Atividades registradas para este lead · {detail.activities.length}</p></div></summary>
            <div className="card-pad"><ActivityFeed activities={detail.activities} /></div>
          </details>
        </div>
      </div>

      {lead.external_place_id && <details className="card section-gap disclosure-card">
        <summary className="card-head disclosure-summary"><div><h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><MapPin size={16} color="#0a8a58" /> Dados do Google Maps</h2><p className="card-copy">Informações públicas atuais sobre esta empresa</p></div></summary>
        <div className="card-pad"><GooglePlacePanel /></div>
      </details>}
    </main>
  </GooglePlaceProvider>
}
