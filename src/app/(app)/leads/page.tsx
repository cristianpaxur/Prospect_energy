import type { Metadata } from 'next'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { GoogleLeadsBackfillButton } from '@/components/leads/google-leads-backfill-button'
import { getLeads } from '@/lib/leads/queries'

export const metadata: Metadata = { title: 'Leads' }

const statusLabels: Record<string, string> = { NOVO: 'Novo', CONTATO_REALIZADO: 'Contatado', INTERESSADO: 'Interessado', AGUARDANDO_FATURA: 'Aguardando fatura', ANALISE: 'Análise', PROPOSTA: 'Proposta', FECHADO: 'Fechado', PERDIDO: 'Perdido' }

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const query = (await searchParams).q ?? ''
  const leads = await getLeads(query)
  const pendingGoogleData = query ? 0 : leads.filter((lead) => lead.name.trim().toLowerCase() === 'lead sem nome' && lead.external_place_id).length
  return <main className="page-content"><div className="page-heading"><div><div className="eyebrow">Seu relacionamento comercial</div><h1 className="page-title">Leads</h1><p className="page-subtitle">Consulte as empresas que você está prospectando.</p></div></div>
    <section className="card"><form className="card-head" action="/leads" style={{ alignItems: 'center' }}><div className="top-search" style={{ width: 'min(430px,70vw)' }}><Search size={15} /><input name="q" defaultValue={query} placeholder="Buscar por empresa, cidade ou segmento" aria-label="Buscar leads" style={{ width: '100%', border: 0, outline: 0, background: 'transparent', fontSize: 12 }} /></div><button className="btn btn-secondary" type="submit">Buscar</button><span className="topbar-spacer" /><span className="badge">{leads.length} leads</span></form>
      {pendingGoogleData > 0 && <div className="card-pad" style={{ paddingBottom: 0 }}><GoogleLeadsBackfillButton count={Math.min(pendingGoogleData, 20)} /></div>}
      {leads.length ? <div className="table-wrap"><table className="table"><thead><tr><th>Empresa</th><th>Segmento</th><th>Localização</th><th>Prioridade</th><th>Status</th></tr></thead><tbody>{leads.map((lead) => <tr key={lead.id}><td><Link href={`/leads/${lead.id}`} className="company-name">{lead.name}</Link><div className="company-address">{lead.phone ?? lead.website ?? 'Sem contato cadastrado'}</div></td><td>{lead.category}</td><td>{[lead.city, lead.state].filter(Boolean).join(', ') || '—'}</td><td><span className={`badge ${lead.score >= 61 ? 'badge-success' : lead.score <= 30 ? 'badge-warning' : ''}`}>{lead.score >= 81 ? 'Muito alto' : lead.score >= 61 ? 'Alto' : lead.score >= 31 ? 'Médio' : 'Baixo'} · {lead.score}</span></td><td><span className="badge">{statusLabels[lead.pipeline_status] ?? lead.pipeline_status}</span></td></tr>)}</tbody></table></div> : <div className="empty-state"><div><span className="empty-icon"><Search size={19} /></span><h2 className="empty-title">{query ? 'Nenhum lead encontrado' : 'Seu CRM ainda está vazio'}</h2><p className="empty-copy">{query ? 'Tente outro termo de busca.' : 'Pesquise empresas da sua região para começar a preencher seu pipeline.'}</p>{!query && <Link className="btn btn-primary" href="/prospectar">Prospectar empresas</Link>}</div></div>}
    </section>
  </main>
}
