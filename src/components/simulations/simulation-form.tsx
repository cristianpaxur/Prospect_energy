'use client'

import { useActionState, useState } from 'react'
import { saveSimulation, type SimulationActionState } from '@/app/(app)/leads/[id]/simulacao/actions'
import { buildSimulationWhatsAppText } from '@/lib/simulations/save-simulation'
import type { CustomerType } from '@/lib/supabase/database'
import type { SimulationResult } from '@/types/domain'
import { formatBRL } from '@/lib/domain/money'

type InvoiceOption = { id: string; amount: number; consumption_kwh: number; provider: string; state: string; customer_type: CustomerType; reference_date: string }
const initial: SimulationActionState = {}

function statusLabel(result: SimulationResult) {
  if (result.status === 'POTENCIALMENTE_ELEGIVEL') return 'Empresa potencialmente elegível'
  if (result.status === 'FORA_DOS_CRITERIOS') return 'Fora dos critérios configurados'
  return 'Validação adicional necessária'
}

export function SimulationForm({ leadId, leadName, leadPhone, invoices }: { leadId: string; leadName: string; leadPhone: string | null; invoices: InvoiceOption[] }) {
  const [state, action, pending] = useActionState(saveSimulation, initial)
  const [editedMessage, setEditedMessage] = useState<{ id: string; text: string } | null>(null)
  const message = state.saved
    ? editedMessage?.id === state.saved.id ? editedMessage.text : buildSimulationWhatsAppText({ name: leadName, amount: state.saved.amount, result: state.saved.result })
    : ''
  const phone = leadPhone?.replace(/\D/g, '')
  const whatsappUrl = phone && message ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : null

  return <form className="stack" action={action}><input type="hidden" name="leadId" value={leadId} />
    <label className="field"><span className="label">Fatura para analisar</span><select className="select" name="invoiceId" required defaultValue={invoices[0]?.id ?? ''}>{invoices.map((invoice) => <option value={invoice.id} key={invoice.id}>{new Date(`${invoice.reference_date}T00:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })} · {formatBRL(Number(invoice.amount))} · {invoice.provider}/{invoice.state}</option>)}</select></label>
    <p className="small muted">O cálculo usa as regras que você configurou em Configurações. Toda economia é estimativa e depende de análise final.</p>
    {state.error && <div className="alert" role="alert">{state.error}</div>}
    <button className="btn btn-primary" type="submit" disabled={pending || !invoices.length}>{pending ? 'Calculando e salvando…' : 'Salvar simulação de economia →'}</button>
    {state.saved && <section className={`simulation-result ${state.saved.result.status === 'POTENCIALMENTE_ELEGIVEL' ? 'simulation-result-success' : ''}`} aria-live="polite"><div className="eyebrow">Resultado registrado</div><h2 className="card-title">{statusLabel(state.saved.result)}</h2><div className="field-grid" style={{ marginTop: 14 }}><div><span className="label">Valor atual</span><div className="page-title" style={{ fontSize: 20 }}>{formatBRL(state.saved.amount)}</div></div>{state.saved.result.discountPercentage !== null && <div><span className="label">Desconto configurado</span><div className="page-title" style={{ fontSize: 20 }}>{state.saved.result.discountPercentage}%</div></div>}{state.saved.result.monthlySavings !== null && <div><span className="label">Economia estimada/mês</span><div className="page-title" style={{ fontSize: 20 }}>{formatBRL(state.saved.result.monthlySavings)}</div></div>}{state.saved.result.annualSavings !== null && <div><span className="label">Economia estimada/ano</span><div className="page-title" style={{ fontSize: 20 }}>{formatBRL(state.saved.result.annualSavings)}</div></div>}{state.saved.result.newAmount !== null && <div><span className="label">Nova estimativa</span><div className="page-title" style={{ fontSize: 20 }}>{formatBRL(state.saved.result.newAmount)}</div></div>}</div><label className="field" style={{ marginTop: 14 }}><span className="label">Mensagem para compartilhar (editável)</span><textarea className="input" rows={4} value={message} onChange={(event) => state.saved && setEditedMessage({ id: state.saved.id, text: event.target.value })} /></label><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{whatsappUrl ? <a className="btn btn-primary" href={whatsappUrl} target="_blank" rel="noreferrer">Enviar pelo WhatsApp</a> : <span className="small muted">Cadastre o telefone do lead para abrir uma conversa no WhatsApp.</span>}<button className="btn btn-secondary" type="button" onClick={() => navigator.clipboard.writeText(message).catch(() => undefined)}>Copiar mensagem</button></div><p className="company-address">Estimativa indicativa, sujeita à análise completa e confirmação das condições da distribuidora.</p></section>}
  </form>
}
