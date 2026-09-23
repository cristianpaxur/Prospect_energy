'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { uploadInvoice, type InvoiceActionState } from '@/app/(app)/leads/[id]/fatura/actions'

const initial: InvoiceActionState = {}

export function InvoiceUploadForm({ leadId }: { leadId: string }) {
  const [state, action, pending] = useActionState(uploadInvoice, initial)
  return <form className="stack" action={action}><input type="hidden" name="leadId" value={leadId} />
    <label className="field"><span className="label">Arquivo da fatura</span><input className="input" name="file" type="file" accept="application/pdf,image/jpeg,image/png" required /><span className="company-address">PDF, JPG ou PNG · até 10 MB · acesso privado</span></label>
    <div className="field-grid">
      <label className="field"><span className="label">Valor total (R$)</span><input className="input" name="amount" inputMode="decimal" placeholder="3.850,00" required /></label>
      <label className="field"><span className="label">Consumo (kWh)</span><input className="input" name="consumptionKwh" inputMode="decimal" placeholder="2.912" required /></label>
      <label className="field"><span className="label">Distribuidora</span><input className="input" name="provider" defaultValue="CPFL" required /></label>
      <label className="field"><span className="label">Estado da unidade</span><input className="input" name="state" defaultValue="SP" maxLength={2} required /></label>
      <label className="field"><span className="label">Tipo de cliente</span><select className="select" name="customerType" defaultValue="COMERCIAL"><option value="COMERCIAL">Comercial</option><option value="RESIDENCIAL">Residencial</option><option value="RURAL">Rural</option><option value="INDUSTRIAL">Industrial</option><option value="OUTRO">Outro</option></select></label>
      <label className="field"><span className="label">Data de referência</span><input className="input" name="referenceDate" type="date" defaultValue={new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)} required /></label>
    </div>
    {state.error && <div className="alert" role="alert">{state.error}</div>}{state.success && <div className="notice" role="status">{state.success}</div>}
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}><button className="btn btn-primary" disabled={pending}>{pending ? 'Enviando com segurança…' : 'Salvar fatura'}</button>{state.success && <Link className="btn btn-secondary" href={`/leads/${leadId}/simulacao`}>Ir para simulação →</Link>}<Link className="btn btn-ghost" href={`/leads/${leadId}`}>Voltar ao lead</Link></div>
  </form>
}
