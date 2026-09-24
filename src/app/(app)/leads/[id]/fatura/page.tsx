import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { FileText } from 'lucide-react'
import { InvoiceUploadForm } from '@/components/invoices/invoice-upload-form'
import { PublicInvoiceReviewForm } from '@/components/invoices/public-invoice-review-form'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { getCurrentContext } from '@/lib/auth/context'
import { formatBRL } from '@/lib/domain/money'

export const metadata: Metadata = { title: 'Fatura de energia' }

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, organizationId } = await getCurrentContext()
  const [{ data: lead }, { data: invoices }, { data: intakes }] = await Promise.all([
    supabase.from('leads').select('id,name,source').eq('id', id).eq('organization_id', organizationId).maybeSingle(),
    supabase.from('invoices').select('id,storage_path,original_filename,amount,consumption_kwh,provider,state,customer_type,reference_date,created_at').eq('lead_id', id).eq('organization_id', organizationId).order('created_at', { ascending: false }),
    supabase.from('public_intake_submissions').select('id,upload_path,original_filename,upload_state,invoice_id').eq('lead_id', id).eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(1),
  ])
  if (!lead) notFound()
  const leadName = (lead as unknown as { name: string }).name
  const invoiceRows = (invoices ?? []) as unknown as { id: string; storage_path: string; original_filename: string; amount: number; consumption_kwh: number; provider: string; state: string; customer_type: string; reference_date: string; created_at: string }[]
  const publicIntake = (intakes ?? [])[0] as { id: string; upload_path: string; original_filename: string; upload_state: string; invoice_id: string | null } | undefined
  const publicInvoiceUrl = publicIntake?.upload_state === 'RECEBIDO'
    ? (await supabase.storage.from('invoices').createSignedUrl(publicIntake.upload_path, 300)).data?.signedUrl ?? null
    : null
  const files = await Promise.all(invoiceRows.map(async (invoice) => {
    const { data } = await supabase.storage.from('invoices').createSignedUrl(invoice.storage_path, 300)
    return { ...invoice, signedUrl: data?.signedUrl ?? null }
  }))

  return <main className="page-content"><div className="page-heading"><div><div className="eyebrow"><Link href={`/leads/${id}`} className="auth-link">← {leadName}</Link></div><h1 className="page-title">Fatura de energia</h1><p className="page-subtitle">Envie o arquivo e preencha os dados para uma estimativa transparente.</p></div></div>
    <div className="two-column"><div className="stack">{publicIntake?.upload_state === 'RECEBIDO' && !publicIntake.invoice_id && lead.source === 'PUBLIC_LINK' && <Card><CardHeader><div><h2 className="card-title">Revisar fatura recebida</h2><p className="card-copy">{publicIntake.original_filename} · envie dados da conta para reutilizar a simulação existente.</p></div>{publicInvoiceUrl && <a className="btn btn-secondary" href={publicInvoiceUrl} target="_blank" rel="noreferrer">Ver fatura</a>}</CardHeader><CardContent><PublicInvoiceReviewForm leadId={id} submissionId={publicIntake.id} /></CardContent></Card>}
      <Card><CardHeader><div><h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FileText size={17} color="#078251" /> Dados da conta</h2><p className="card-copy">O arquivo fica em armazenamento privado e só é acessado por pessoas autorizadas.</p></div></CardHeader><CardContent><InvoiceUploadForm leadId={id} /></CardContent></Card></div>
      <Card><CardHeader><div><h2 className="card-title">Faturas salvas</h2><p className="card-copy">Arquivos e dados registrados para este lead.</p></div></CardHeader><CardContent>{files.length ? <div className="stack">{files.map((invoice) => <div className="task-row" key={invoice.id} style={{ borderBottom: '1px solid #edf0f1', paddingBottom: 12 }}><FileText size={16} color="#078251" /><div style={{ flex: 1 }}><div className="task-name">{invoice.original_filename}</div><div className="task-meta">{formatBRL(Number(invoice.amount))} · {Number(invoice.consumption_kwh).toLocaleString('pt-BR')} kWh · {invoice.provider}/{invoice.state}</div><div className="task-meta">Referência: {new Date(`${invoice.reference_date}T00:00:00`).toLocaleDateString('pt-BR')}</div></div>{invoice.signedUrl ? <a className="btn btn-secondary" href={invoice.signedUrl} target="_blank" rel="noreferrer">Ver arquivo</a> : <span className="small muted">Arquivo indisponível</span>}</div>)}<Link className="btn btn-primary" href={`/leads/${id}/simulacao`}>Calcular economia →</Link></div> : <div className="empty-state"><p className="empty-copy">Ainda não há faturas para este lead.</p></div>}</CardContent></Card></div>
  </main>
}
