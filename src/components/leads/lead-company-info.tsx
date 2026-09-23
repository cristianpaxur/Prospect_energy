'use client'

import { useGooglePlace } from '@/components/leads/google-place-provider'

type LeadCompanyInfoProps = {
  lead: { address: string | null; city: string; state: string; phone: string | null; email: string | null; website: string | null }
}

export function LeadCompanyInfo({ lead }: LeadCompanyInfoProps) {
  const { preview } = useGooglePlace()
  const fields = [
    { label: 'Endereço', value: preview?.address || lead.address || 'Não informado' },
    { label: 'Cidade e estado', value: [lead.city, lead.state].filter(Boolean).join(', ') || 'Não informado' },
    { label: 'Telefone', value: preview?.phone || lead.phone || 'Não informado' },
    { label: 'E-mail', value: lead.email || 'Não informado' },
    { label: 'Site', value: preview?.website || lead.website || 'Não informado', href: preview?.website || lead.website },
    { label: 'Origem', value: 'Prospecção Prospect Energy' },
  ]

  return <div className="field-grid" style={{ gridTemplateColumns: 'repeat(2,minmax(0,1fr))' }}>{fields.map((field) => <div key={field.label}>
    <span className="label">{field.label}</span>
    <div className="small">{field.href ? <a className="auth-link" href={field.href} target="_blank" rel="noreferrer">{field.value}</a> : field.value}</div>
  </div>)}</div>
}
