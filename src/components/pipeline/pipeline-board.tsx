'use client'

import { useState, useTransition } from 'react'
import { DndContext, KeyboardSensor, PointerSensor, closestCorners, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { moveLeadAction } from '@/app/(app)/pipeline/actions'
import { groupLeadsByStatus, PIPELINE_ORDER } from '@/lib/pipeline'
import type { LeadCardData, PipelineStatus } from '@/types/domain'
import { PipelineColumn } from './pipeline-column'

const columns: PipelineStatus[] = [...PIPELINE_ORDER, 'PERDIDO']

export function PipelineBoard({ initialLeads }: { initialLeads: LeadCardData[] }) {
  const [leads, setLeads] = useState(initialLeads)
  const [message, setMessage] = useState('')
  const [, startTransition] = useTransition()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))
  const grouped = groupLeadsByStatus(leads)

  function onDragEnd(event: DragEndEvent) {
    const leadId = String(event.active.id)
    const overId = event.over?.id
    if (!overId) return
    const lead = leads.find((item) => item.id === leadId)
    const targetColumn = columns.find((status) => status === overId) ?? leads.find((item) => item.id === overId)?.pipeline_status
    if (!lead || !targetColumn || targetColumn === lead.pipeline_status) return

    const previous = leads
    setMessage('')
    setLeads((current) => current.map((item) => item.id === leadId ? { ...item, pipeline_status: targetColumn } : item))
    startTransition(async () => {
      const result = await moveLeadAction(leadId, targetColumn)
      if ('error' in result) { setLeads(previous); setMessage(result.error ?? 'Não foi possível mover o lead.') }
    })
  }

  return <div><DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
    <div className="kanban-board">{columns.map((status) => <PipelineColumn key={status} status={status} leads={grouped[status]} />)}</div>
  </DndContext>{message && <div className="alert section-gap" role="alert">{message}</div>}</div>
}
