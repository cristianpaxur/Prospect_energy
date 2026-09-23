'use client'

import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { LeadCard } from './lead-card'
import type { LeadCardData, PipelineStatus } from '@/types/domain'

const labels: Record<PipelineStatus, string> = { NOVO: 'Novos', CONTATO_REALIZADO: 'Contato realizado', INTERESSADO: 'Interessados', AGUARDANDO_FATURA: 'Aguardando fatura', ANALISE: 'Em análise', PROPOSTA: 'Proposta', FECHADO: 'Fechados', PERDIDO: 'Perdidos' }

export function PipelineColumn({ status, leads }: { status: PipelineStatus; leads: LeadCardData[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status, data: { status } })
  return <section ref={setNodeRef} className="kanban-column" aria-label={`${labels[status]}: ${leads.length} leads`} style={{ outline: isOver ? '2px solid #36b982' : undefined }}>
    <div className="kanban-column-head"><span>{labels[status]}</span><span className="badge">{leads.length}</span></div>
    <SortableContext id={status} items={leads.map((lead) => lead.id)} strategy={verticalListSortingStrategy}>{leads.map((lead) => <LeadCard key={lead.id} lead={lead} />)}</SortableContext>
  </section>
}
