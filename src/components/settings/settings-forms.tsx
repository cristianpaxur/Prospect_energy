'use client'

import { useActionState } from 'react'
import { saveEligibilityRule, saveTemplate, updateOrganization, updateProfile, type SettingsActionState } from '@/app/(app)/configuracoes/actions'
import { Button } from '@/components/ui/button'

const initial: SettingsActionState = {}

function FormFeedback({ state }: { state: SettingsActionState }) {
  if (state.error) return <div className="alert" role="alert">{state.error}</div>
  if (state.success) return <div className="notice" role="status">{state.success}</div>
  return null
}

export function ProfileForm({ profile, email }: { profile: { full_name: string; phone: string; city: string; state: string }; email: string }) {
  const [state, action, pending] = useActionState(updateProfile, initial)
  return <form action={action} className="stack"><div className="field-grid" style={{ gridTemplateColumns: 'repeat(2,minmax(0,1fr))' }}>
    <label className="field"><span className="label">Nome</span><input className="input" name="fullName" defaultValue={profile.full_name} required /></label>
    <label className="field"><span className="label">E-mail</span><input className="input" name="email" type="email" defaultValue={email} required /></label>
    <label className="field"><span className="label">WhatsApp</span><input className="input" name="phone" defaultValue={profile.phone} required /></label>
    <label className="field"><span className="label">Cidade</span><input className="input" name="city" defaultValue={profile.city} required /></label>
    <label className="field"><span className="label">Estado</span><input className="input" name="state" maxLength={2} defaultValue={profile.state} required /></label>
  </div><FormFeedback state={state} /><div><Button type="submit" disabled={pending}>{pending ? 'Salvando…' : 'Salvar perfil'}</Button></div></form>
}

export function OrganizationForm({ name }: { name: string }) {
  const [state, action, pending] = useActionState(updateOrganization, initial)
  return <form action={action} className="stack"><label className="field"><span className="label">Nome da organização</span><input className="input" name="name" defaultValue={name} required /></label><FormFeedback state={state} /><div><Button type="submit" disabled={pending}>{pending ? 'Salvando…' : 'Salvar organização'}</Button></div></form>
}

export type RuleRow = { id: string; provider: string; state: string; customer_type: string; minimum_amount: number | null; maximum_amount: number | null; discount_percentage: number; active: boolean }

function RuleEditor({ rule, label }: { rule?: RuleRow; label: string }) {
  const [state, action, pending] = useActionState(saveEligibilityRule, initial)
  return <form action={action} className="stack card card-pad"><h3 className="card-title">{label}</h3><div className="field-grid">
    <input type="hidden" name="ruleId" value={rule?.id ?? ''} />
    <label className="field"><span className="label">Distribuidora</span><input className="input" name="provider" defaultValue={rule?.provider ?? 'CPFL'} required /></label>
    <label className="field"><span className="label">Estado</span><input className="input" name="state" maxLength={2} defaultValue={rule?.state ?? 'SP'} required /></label>
    <label className="field"><span className="label">Tipo de cliente</span><select className="select" name="customerType" defaultValue={rule?.customer_type ?? 'COMERCIAL'}><option value="RESIDENCIAL">Residencial</option><option value="COMERCIAL">Comercial</option><option value="RURAL">Rural</option><option value="INDUSTRIAL">Industrial</option><option value="OUTRO">Outro</option></select></label>
    <label className="field"><span className="label">Conta mínima (opcional)</span><input className="input" name="minimumAmount" type="number" min="0" step="0.01" defaultValue={rule?.minimum_amount ?? ''} /></label>
    <label className="field"><span className="label">Conta máxima (opcional)</span><input className="input" name="maximumAmount" type="number" min="0" step="0.01" defaultValue={rule?.maximum_amount ?? ''} /></label>
    <label className="field"><span className="label">Desconto estimado (%)</span><input className="input" name="discountPercentage" type="number" min="0.01" max="100" step="0.01" defaultValue={rule?.discount_percentage ?? 12} required /></label>
  </div><label className="small muted" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" name="active" defaultChecked={rule?.active ?? true} /> Regra ativa</label><FormFeedback state={state} /><div><Button type="submit" disabled={pending}>{pending ? 'Salvando…' : 'Salvar regra'}</Button></div></form>
}

export function RuleForm({ rules }: { rules: RuleRow[] }) {
  return <div className="stack">{rules.map((rule) => <RuleEditor key={rule.id} rule={rule} label={`${rule.provider} · ${rule.state} · ${rule.customer_type}`} />)}<RuleEditor label="Adicionar regra" /><p className="small muted">Regras específicas por distribuidora, estado, perfil e faixa de conta. Desative uma regra para impedir que ela seja aplicada.</p></div>
}

export type TemplateRow = { template_key: string; title: string; content: string }
const TEMPLATE_KEYS = ['PRIMEIRO_CONTATO', 'FOLLOW_UP', 'SOLICITAR_FATURA', 'ENVIAR_SIMULACAO', 'ENVIAR_PROPOSTA'] as const

export function TemplatesForm({ templates }: { templates: TemplateRow[] }) {
  const [state, action, pending] = useActionState(saveTemplate, initial)
  return <div className="stack">{TEMPLATE_KEYS.map((key) => {
    const template = templates.find((item) => item.template_key === key)
    return <form action={action} key={key} className="card card-pad stack"><input type="hidden" name="templateKey" value={key} /><label className="field"><span className="label">{template?.title ?? key.replaceAll('_', ' ')}</span><input className="input" name="title" defaultValue={template?.title ?? ''} required /><textarea className="textarea" name="content" defaultValue={template?.content ?? ''} required aria-label={`Mensagem ${key}`} /></label><Button type="submit" variant="secondary" disabled={pending}>{pending ? 'Salvando…' : 'Salvar mensagem'}</Button></form>
  })}<FormFeedback state={state} /><p className="small muted">Variáveis disponíveis: {'{{nome_licenciado}}'}, {'{{nome_empresa}}'} e {'{{cidade}}'}.</p></div>
}
