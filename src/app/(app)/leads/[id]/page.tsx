import type { Metadata } from 'next'
import Link from 'next/link'
import { CalendarDays, FileText, History, MessageSquareText, Zap } from 'lucide-react'
import { ActivityFeed } from '@/components/leads/activity-feed'
import { LeadHeader } from '@/components/leads/lead-header'
import { NoteForm } from '@/components/leads/note-form'
import { QuickActions } from '@/components/leads/quick-actions'
import { TaskForm } from '@/components/leads/task-form'
import { LeadEditForm } from '@/components/leads/lead-edit-form'
import { GooglePlacePanel } from '@/components/leads/google-place-panel'
import { GooglePlaceProvider } from '@/components/leads/google-place-provider'
import { LeadCompanyInfo } from '@/components/leads/lead-company-info'
import { completeTask } from '@/app/(app)/leads/actions'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { getCurrentContext } from '@/lib/auth/context'
import { formatBRL } from '@/lib/domain/money'
import { getLeadDetail } from '@/lib/leads/queries'

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

  return <GooglePlaceProvider leadId={lead.id} enabled={Boolean(lead.external_place_id)} autoLoad={false}><main className="page-content"><LeadHeader lead={lead} />{lead.external_place_id && <div style={{ marginBottom: 18 }}><GooglePlacePanel /></div>}
    <div className="two-column"><div className="stack">
      <Card><CardHeader><div><h2 className="card-title">Ações rápidas</h2><p className="card-copy">Entre em contato e registre a atividade automaticamente.</p></div></CardHeader><CardContent><QuickActions lead={lead} licenseeName={context.profile.full_name} licenseeCity={context.profile.city} defaultMessage={defaultMessage} /></CardContent></Card>
      <Card><CardHeader><div><h2 className="card-title">Informações da empresa</h2><p className="card-copy">Dados disponíveis para esta oportunidade · Google ao vivo quando disponível</p></div></CardHeader><CardContent><div className="stack"><LeadCompanyInfo lead={lead} /><LeadEditForm lead={lead} /></div></CardContent></Card>
      <Card><CardHeader><div><h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}><MessageSquareText size={16} color="#0a8a58" /> Anotações</h2><p className="card-copy">Informações adicionadas por você</p></div></CardHeader><CardContent><div className="stack">{detail.notes.map((note) => <div key={note.id} style={{ borderLeft: '2px solid #24bd7c', paddingLeft: 12 }}><div className="small" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{note.content}</div><div className="company-address">{new Date(note.created_at).toLocaleString('pt-BR')}</div></div>)}<NoteForm leadId={lead.id} /></div></CardContent></Card>
    </div><div className="stack">
      <Card><CardHeader><div><h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}><CalendarDays size={16} color="#0a8a58" /> Próxima ação</h2><p className="card-copy">Lembretes que aparecem no Dashboard</p></div></CardHeader><CardContent><div className="stack">{detail.tasks.filter((task) => !task.completed_at).map((task) => <div className="task-row" key={task.id} style={{ border: '1px solid #edf0f1', borderRadius: 8, padding: 11 }}><span className="task-dot" /><div style={{ flex: 1 }}><div className="task-name">{task.description}</div><div className="task-meta">{new Date(task.due_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</div><form action={async () => { 'use server'; await completeTask(task.id, lead.id) }}><button className="btn btn-ghost" style={{ margin: '4px 0 0', minHeight: 27, padding: '0 3px' }}>Marcar concluída</button></form></div></div>)}<TaskForm leadId={lead.id} /></div></CardContent></Card>
      <Card><CardHeader><div><h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}><FileText size={16} color="#0a8a58" /> Fatura e simulação</h2><p className="card-copy">Análise de consumo e economia potencial</p></div></CardHeader><CardContent><div className="stack">{latestInvoice ? <div className="notice">Última fatura · {formatBRL(Number(latestInvoice.amount))} · {Number(latestInvoice.consumption_kwh).toLocaleString('pt-BR')} kWh<br />{latestSimulation ? `Economia estimada: ${formatBRL(Number(latestSimulation.estimated_monthly_savings ?? 0))}/mês` : 'Ainda não simulada.'}</div> : <p className="small muted">Nenhuma fatura cadastrada.</p>}<Link className="btn btn-primary" href={`/leads/${lead.id}/fatura`}><FileText size={14} />{latestInvoice ? 'Atualizar fatura' : 'Adicionar fatura'} <Zap size={13} /></Link></div></CardContent></Card>
      <Card><CardHeader><div><h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}><History size={16} color="#0a8a58" /> Histórico</h2><p className="card-copy">Atividades registradas para este lead</p></div></CardHeader><CardContent><ActivityFeed activities={detail.activities} /></CardContent></Card>
    </div></div>
  </main></GooglePlaceProvider>
}
