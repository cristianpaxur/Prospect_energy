'use client'

import Link from 'next/link'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { LeadCardData } from '@/types/domain'

export function LeadCard({ lead }: { lead: LeadCardData }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lead.id, data: { status: lead.pipeline_status } })
  return <article ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? .45 : 1 }} className="lead-card">
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}><Link href={`/leads/${lead.id}`} className="lead-card-title">{lead.name}</Link><button type="button" aria-label={`Mover ${lead.name} entre etapas`} className="btn btn-ghost" style={{ minHeight: 24, padding: '0 2px', cursor: 'grab' }} {...attributes} {...listeners}><GripVertical size={14} /></button></div>
    <div className="lead-card-meta">{lead.category} · {[lead.city, lead.state].filter(Boolean).join('/')}</div>
    <div className="lead-card-footer"><Badge className={lead.score >= 61 ? 'badge-success' : lead.score <= 30 ? 'badge-warning' : ''}>{lead.score >= 81 ? 'Muito alto' : lead.score >= 61 ? 'Alto' : lead.score >= 31 ? 'Médio' : 'Baixo'}</Badge><span className="company-address" style={{ margin: 0 }}>{new Date(lead.created_at).toLocaleDateString('pt-BR')}</span></div>
  </article>
}
