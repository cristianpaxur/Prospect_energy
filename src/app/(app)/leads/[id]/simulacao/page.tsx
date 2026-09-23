import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Zap } from 'lucide-react'
import { SimulationForm } from '@/components/simulations/simulation-form'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { getCurrentContext } from '@/lib/auth/context'
import { formatBRL } from '@/lib/domain/money'
import type { CustomerType } from '@/lib/supabase/database'

export const metadata: Metadata = { title: 'Simulação de economia' }

export default async function SimulationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, organizationId } = await getCurrentContext()
  const [{ data: lead }, { data: invoices }, { data: simulations }] = await Promise.all([
    supabase.from('leads').select('id,name,phone').eq('id', id).eq('organization_id', organizationId).maybeSingle(),
    supabase.from('invoices').select('id,amount,consumption_kwh,provider,state,customer_type,reference_date').eq('lead_id', id).eq('organization_id', organizationId).order('created_at', { ascending: false }),
    supabase.from('simulations').select('id,current_amount,discount_percentage,estimated_monthly_savings,estimated_annual_savings,estimated_new_amount,eligibility_status,created_at').eq('lead_id', id).eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(20),
  ])
  if (!lead) notFound()
  const leadFields = lead as unknown as { id: string; name: string; phone: string | null }
  const invoiceRows = (invoices ?? []) as unknown as { id: string; amount: number; consumption_kwh: number; provider: string; state: string; customer_type: CustomerType; reference_date: string }[]
  const simulationRows = (simulations ?? []) as unknown as { id: string; current_amount: number; discount_percentage: number | null; estimated_monthly_savings: number | null; estimated_annual_savings: number | null; estimated_new_amount: number | null; eligibility_status: string; created_at: string }[]
  return <main className="page-content"><div className="page-heading"><div><div className="eyebrow"><Link href={`/leads/${id}`} className="auth-link">← {leadFields.name}</Link></div><h1 className="page-title">Simular economia</h1><p className="page-subtitle">Calcule usando a fatura salva e as regras vigentes do seu workspace.</p></div></div>
    <div className="two-column"><Card><CardHeader><div><h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Zap size={17} color="#078251" /> Análise da fatura</h2><p className="card-copy">A regra correspondente é aplicada automaticamente.</p></div></CardHeader><CardContent>{invoiceRows.length ? <SimulationForm leadId={id} leadName={leadFields.name} leadPhone={leadFields.phone} invoices={invoiceRows.map((invoice) => ({ ...invoice, amount: Number(invoice.amount), consumption_kwh: Number(invoice.consumption_kwh) }))} /> : <div className="empty-state"><div><p className="empty-title">Adicione uma fatura primeiro</p><p className="empty-copy">O cálculo depende do valor, distribuidora, estado e tipo de cliente.</p><Link className="btn btn-primary" href={`/leads/${id}/fatura`}>Adicionar fatura</Link></div></div>}</CardContent></Card>
      <Card><CardHeader><div><h2 className="card-title">Simulações anteriores</h2><p className="card-copy">Histórico de resultados registrados para este lead.</p></div></CardHeader><CardContent>{simulationRows.length ? <div className="stack">{simulationRows.map((simulation) => <div className="task-row" key={simulation.id} style={{ borderBottom: '1px solid #edf0f1', paddingBottom: 11 }}><span className="task-dot" /><div><div className="task-name">{simulation.eligibility_status === 'POTENCIALMENTE_ELEGIVEL' ? `${formatBRL(Number(simulation.estimated_monthly_savings ?? 0))}/mês estimados` : simulation.eligibility_status === 'FORA_DOS_CRITERIOS' ? 'Fora dos critérios configurados' : 'Validação necessária'}</div><div className="task-meta">Fatura de {formatBRL(Number(simulation.current_amount))} · {new Date(simulation.created_at).toLocaleString('pt-BR')}</div></div></div>)}</div> : <p className="small muted">Nenhuma simulação salva ainda.</p>}</CardContent></Card></div>
  </main>
}
