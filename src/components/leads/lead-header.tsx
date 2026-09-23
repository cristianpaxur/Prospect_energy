'use client'

import Link from 'next/link'
import { ArrowLeft, FilePlus2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useGooglePlace } from '@/components/leads/google-place-provider'
import type { LeadRow } from '@/lib/leads/queries'

const statusLabels: Record<string, string> = { NOVO: 'Novo', CONTATO_REALIZADO: 'Contato realizado', INTERESSADO: 'Interessado', AGUARDANDO_FATURA: 'Aguardando fatura', ANALISE: 'Análise', PROPOSTA: 'Proposta', FECHADO: 'Fechado', PERDIDO: 'Perdido' }

export function LeadHeader({ lead }: { lead: LeadRow }) {
  const { enabled, preview, loading } = useGooglePlace()
  const potential = lead.score >= 81 ? 'Muito alto' : lead.score >= 61 ? 'Alto' : lead.score >= 31 ? 'Médio' : 'Baixo'
  const hasPlaceholderName = /^lead sem nome$/i.test(lead.name.trim())
  const displayName = preview?.name || (enabled && hasPlaceholderName && loading ? 'Carregando empresa…' : lead.name)
  const location = preview?.address || [lead.address, lead.city, lead.state].filter(Boolean).join(' · ')
  return <div className="page-heading"><div><Link className="small muted" href="/leads" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 12 }}><ArrowLeft size={13} /> Voltar para leads</Link><div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 9 }}><h1 className="page-title">{displayName}</h1><Badge>{lead.category}</Badge><Badge className={lead.score >= 61 ? 'badge-success' : lead.score <= 30 ? 'badge-warning' : ''}>{potential} · {lead.score}</Badge><Badge>{statusLabels[lead.pipeline_status] ?? lead.pipeline_status}</Badge></div><p className="page-subtitle">{location}</p></div><Link className="btn btn-primary" href={`/leads/${lead.id}/fatura`}><FilePlus2 size={15} /> Analisar fatura</Link></div>
}
