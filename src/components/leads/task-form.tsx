'use client'

import { useActionState } from 'react'
import { createTask, type LeadActionState } from '@/app/(app)/leads/actions'
import { Button } from '@/components/ui/button'

const initial: LeadActionState = {}
function localDate() { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }

export function TaskForm({ leadId }: { leadId: string }) {
  const [state, action, pending] = useActionState(createTask, initial)
  return <form action={action} className="stack"><input type="hidden" name="leadId" value={leadId} /><label className="field"><span className="label">Tipo de atividade</span><select className="select" name="type" defaultValue="FOLLOW_UP"><option value="LIGACAO">Ligar</option><option value="WHATSAPP">WhatsApp</option><option value="SOLICITAR_FATURA">Solicitar fatura</option><option value="ENVIAR_PROPOSTA">Enviar proposta</option><option value="FOLLOW_UP">Follow-up</option><option value="OUTRO">Outro</option></select></label><div className="field-grid" style={{ gridTemplateColumns: '1fr 1fr' }}><label className="field"><span className="label">Data</span><input className="input" name="dueDate" type="date" defaultValue={localDate()} required /></label><label className="field"><span className="label">Horário</span><input className="input" name="dueTime" type="time" defaultValue="09:00" required /></label></div><label className="field"><span className="label">Observação</span><input className="input" name="description" placeholder="Ex.: retornar após análise" minLength={2} required /></label>{state.error && <div className="alert" role="alert">{state.error}</div>}{state.success && <div className="notice" role="status">{state.success}</div>}<Button variant="secondary" disabled={pending}>{pending ? 'Criando…' : 'Criar próxima ação'}</Button></form>
}
