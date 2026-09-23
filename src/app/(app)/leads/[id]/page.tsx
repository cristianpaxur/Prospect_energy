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
    <main className="page-content lead-detail-page lead-detail-action-layout">
      <LeadHeader lead={lead} />
      <LeadStageControl leadId={lead.id} status={lead.pipeline_status as PipelineStatus} />

      <div className="lead-option-one-grid">
        <div className="lead-option-one-main">
          <LeadNextAction leadId={lead.id} tasks={detail.tasks} />

          <section className="card lead-energy-card" aria-labelledby="lead-energy-title">
            <div className="card-head lead-energy-head">
              <div><h2 className="card-title" id="lead-energy-title">Resumo de energia</h2><p className="card-copy">Dados da fatura e da simulação mais recentes.</p></div>
              <span className="lead-energy-icon"><FileText size={17} /></span>
            </div>
            {latestInvoice ? <div className="lead-energy-metrics">
              <div className="lead-energy-metric"><span className="lead-energy-label">Valor da última fatura</span><strong>{formatBRL(Number(latestInvoice.amount))}</strong><span className="lead-energy-note">Última fatura cadastrada</span></div>
              <div className="lead-energy-metric"><span className="lead-energy-label">Consumo informado</span><strong>{Number(latestInvoice.consumption_kwh).toLocaleString('pt-BR')} kWh</strong><span className="lead-energy-note">Consumo registrado</span></div>
              {latestSimulation && <div className="lead-energy-metric lead-energy-estimate"><span className="lead-energy-label">Economia estimada</span><strong>{formatBRL(Number(latestSimulation.estimated_monthly_savings ?? 0))}<small>/mês</small></strong><span className="lead-energy-note">Última simulação</span></div>}
            </div> : <div className="card-pad lead-energy-empty"><p className="card-copy">Nenhuma fatura cadastrada. Adicione uma para analisar o consumo e preparar uma simulação.</p></div>}
            <div className="lead-energy-footer"><span>{latestInvoice?.original_filename ?? 'Nenhuma fatura cadastrada'}</span><Link className="btn btn-secondary" href={`/leads/${lead.id}/fatura`}><FileText size={14} />{latestInvoice ? 'Atualizar fatura' : 'Adicionar fatura'}</Link></div>
          </section>

          <section className="card lead-recent-card" aria-labelledby="lead-recent-title">
            <div className="card-head lead-recent-head"><div><h2 className="card-title" id="lead-recent-title">Última atividade</h2><p className="card-copy">{detail.activities.length ? `${detail.activities.length} atividades registradas` : 'As atividades deste lead aparecerão aqui.'}</p></div><span className="lead-recent-icon"><History size={17} /></span></div>
            <div className="card-pad lead-current-activity"><ActivityFeed activities={detail.activities.slice(0, 1)} /></div>
            <details className="lead-history-details"><summary><History size={14} />Ver histórico completo · {detail.activities.length}</summary><div className="card-pad"><ActivityFeed activities={detail.activities} /></div></details>
          </section>
        </div>

        <aside className="lead-option-one-rail" aria-label="Contato e informações do lead">
          <section className="card lead-contact-card" aria-labelledby="lead-contact-title">
            <div className="card-head"><div><span className="label">Contato prioritário</span><h2 className="card-title" id="lead-contact-title">Falar com a empresa</h2><p className="card-copy">Escolha como entrar em contato com o lead.</p></div><span className="lead-contact-icon"><MessageSquareText size={17} /></span></div>
            <div className="card-pad lead-contact-content"><QuickActions lead={lead} licenseeName={context.profile.full_name} licenseeCity={context.profile.city} defaultMessage={defaultMessage} /></div>
          </section>

          <details className="card disclosure-card lead-company-disclosure">
            <summary className="card-head disclosure-summary"><div><h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Building2 size={16} color="#0a8a58" /> Sobre a empresa</h2><p className="card-copy">{[lead.address, lead.city, lead.state].filter(Boolean).join(' · ') || 'Dados de contato e informações editáveis'}</p></div></summary>
            <div className="card-pad stack"><LeadCompanyInfo lead={lead} /><div className="divider" /><LeadEditForm lead={lead} /></div>
          </details>

          <section className="card lead-notes-card" aria-labelledby="lead-notes-title">
            <div className="card-head lead-notes-head"><div><h2 className="card-title" id="lead-notes-title">Anotações</h2><p className="card-copy">{detail.notes.length ? `${detail.notes.length} registradas` : 'Registre um detalhe importante.'}</p></div><span className="lead-notes-icon"><MessageSquareText size={16} /></span></div>
            {detail.notes.length > 0 ? <div className="card-pad lead-notes-content">
              <div className="lead-note"><div className="lead-note-text">{detail.notes[0].content}</div><div className="company-address">{new Date(detail.notes[0].created_at).toLocaleString('pt-BR')}</div></div>
              {detail.notes.length > 1 && <details className="lead-notes-all"><summary>Ver todas as anotações · {detail.notes.length}</summary><div className="stack">{detail.notes.slice(1).map((note) => <div key={note.id} className="lead-note"><div className="lead-note-text">{note.content}</div><div className="company-address">{new Date(note.created_at).toLocaleString('pt-BR')}</div></div>)}</div></details>}
              <details className="lead-note-add"><summary>Adicionar anotação</summary><div className="lead-note-form"><NoteForm leadId={lead.id} /></div></details>
            </div> : <div className="card-pad lead-notes-content"><p className="card-copy">Ainda não há anotações para este lead.</p><details className="lead-note-add"><summary>Adicionar anotação</summary><div className="lead-note-form"><NoteForm leadId={lead.id} /></div></details></div>}
          </section>
        </aside>
      </div>

      {lead.external_place_id && <details className="card section-gap disclosure-card lead-google-disclosure">
        <summary className="card-head disclosure-summary"><div><h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><MapPin size={16} color="#0a8a58" /> Dados do Google Maps</h2><p className="card-copy">Informações públicas atuais sobre esta empresa</p></div></summary>
        <div className="card-pad"><GooglePlacePanel /></div>
      </details>}
    </main>
  </GooglePlaceProvider>
}
