'use client'

import { useActionState } from 'react'
import { updateLead, type LeadActionState } from '@/app/(app)/leads/actions'
import type { LeadRow } from '@/lib/leads/queries'

const empty: LeadActionState = {}
const categories = ['Academia', 'Mercado', 'Padaria', 'Restaurante', 'Hotel', 'Farmácia', 'Clínica', 'Loja', 'Outros']

export function LeadEditForm({ lead }: { lead: LeadRow }) {
  const [state, action, pending] = useActionState(updateLead, empty)
  return <details style={{ marginTop: 18 }}><summary className="auth-link" style={{ cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Editar dados do CRM</summary><form action={action} className="stack" style={{ marginTop: 14 }}>
    <input type="hidden" name="leadId" value={lead.id} />
    <div className="field-grid">
      <label className="field"><span className="label">Nome</span><input className="input" name="name" required defaultValue={lead.name} /></label>
      <label className="field"><span className="label">Segmento</span><select className="select" name="category" defaultValue={lead.category}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
      <label className="field"><span className="label">Endereço</span><input className="input" name="address" defaultValue={lead.address ?? ''} /></label>
      <label className="field"><span className="label">Cidade</span><input className="input" name="city" required defaultValue={lead.city} /></label>
      <label className="field"><span className="label">UF</span><input className="input" name="state" required maxLength={2} defaultValue={lead.state} /></label>
      <label className="field"><span className="label">Telefone</span><input className="input" name="phone" type="tel" defaultValue={lead.phone ?? ''} /></label>
      <label className="field"><span className="label">E-mail</span><input className="input" name="email" type="email" defaultValue={lead.email ?? ''} /></label>
      <label className="field"><span className="label">Site</span><input className="input" name="website" type="url" defaultValue={lead.website ?? ''} /></label>
      <label className="field"><span className="label">Horas abertas por dia</span><input className="input" name="openHours" type="number" min="0" max="24" step="0.5" defaultValue={lead.open_hours ?? ''} /></label>
    </div>
    {state.error && <div className="alert" role="alert">{state.error}</div>}{state.success && <div className="notice" role="status">{state.success}</div>}
    <button className="btn btn-secondary" disabled={pending}>{pending ? 'Salvando…' : 'Salvar dados'}</button>
  </form></details>
}
