import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowUpRight, Bolt, Building2, FileText, HandCoins, Users } from 'lucide-react'
import { EmptyDashboard } from '@/components/dashboard/empty-dashboard'
import { Funnel } from '@/components/dashboard/funnel'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { TodayTasks } from '@/components/dashboard/today-tasks'
import { formatBRL } from '@/lib/domain/money'
import { getDashboardSummary, todayInSaoPaulo } from '@/lib/dashboard/queries'
import { getCurrentContext } from '@/lib/auth/context'

export const metadata: Metadata = { title: 'Início' }

export default async function DashboardPage() {
  const { profile, organizationId } = await getCurrentContext()
  const summary = await getDashboardSummary(organizationId)
  const today = todayInSaoPaulo()
  const [year, month, day] = today.split('-').map(Number)
  const dateLabel = new Date(year, month - 1, day).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return <main className="page-content"><div className="page-heading"><div><div className="eyebrow">Visão geral da prospecção</div><h1 className="page-title">Olá, {profile.full_name?.split(' ')[0] || 'bem-vindo'} 👋</h1><p className="page-subtitle">Aqui está o resumo da sua operação comercial.</p></div><div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><span className="muted small" style={{ textTransform: 'capitalize' }}>{dateLabel}</span><Link className="btn btn-primary" href="/prospectar"><Bolt size={15} /> Prospectar</Link></div></div>
    <div className="grid kpi-grid">
      <KpiCard label="Leads encontrados" value={String(summary.leadCount)} note="No seu CRM" icon={<Building2 size={16} />} />
      <KpiCard label="Leads contatados" value={String(summary.contactedCount)} note="Em andamento ou concluídos" icon={<Users size={16} />} />
      <KpiCard label="Faturas recebidas" value={String(summary.invoiceCount)} note="Arquivos privados" icon={<FileText size={16} />} />
      <KpiCard label="Economia identificada" value={formatBRL(summary.identifiedSavings)} note="Estimativa mensal mais recente" icon={<HandCoins size={16} />} />
    </div>
    {summary.leadCount === 0 ? <div className="section-gap"><EmptyDashboard /></div> : <div className="grid dashboard-grid"><Funnel summary={summary} /><TodayTasks summary={summary} /></div>}
    {summary.leadCount > 0 && <div className="section-gap" style={{ textAlign: 'right' }}><Link className="btn btn-ghost" href="/pipeline">Ver pipeline <ArrowUpRight size={14} /></Link></div>}
  </main>
}
