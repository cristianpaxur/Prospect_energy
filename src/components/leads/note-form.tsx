'use client'

import { useActionState } from 'react'
import { createNote, type LeadActionState } from '@/app/(app)/leads/actions'
import { Button } from '@/components/ui/button'

const initial: LeadActionState = {}

export function NoteForm({ leadId }: { leadId: string }) {
  const [state, action, pending] = useActionState(createNote, initial)
  return <form action={action} className="stack"><input type="hidden" name="leadId" value={leadId} /><label className="field"><span className="label">Nova anotação</span><textarea className="textarea" name="content" placeholder="Registre uma informação importante sobre esta oportunidade…" maxLength={5000} required /></label>{state.error && <div className="alert" role="alert">{state.error}</div>}{state.success && <div className="notice" role="status">{state.success}</div>}<div><Button type="submit" variant="secondary" disabled={pending}>{pending ? 'Salvando…' : 'Adicionar anotação'}</Button></div></form>
}
