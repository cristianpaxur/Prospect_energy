'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentContext } from '@/lib/auth/context'
import { validateInvoiceFile, invoiceSchema } from '@/lib/validations/invoice'
import type { CustomerType } from '@/lib/supabase/database'

export type InvoiceActionState = { error?: string; success?: string }

export async function uploadInvoice(_state: InvoiceActionState, formData: FormData): Promise<InvoiceActionState> {
  const leadId = String(formData.get('leadId') ?? '')
  const file = formData.get('file')
  if (!(file instanceof File)) return { error: 'Selecione a fatura em PDF, JPG ou PNG.' }
  const fileError = validateInvoiceFile(file)
  if (fileError) return { error: fileError }
  const parsed = invoiceSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Confira os dados da fatura.' }

  const { supabase, organizationId, user } = await getCurrentContext()
  const { data: lead } = await supabase.from('leads').select('id').eq('id', leadId).eq('organization_id', organizationId).maybeSingle()
  if (!lead) return { error: 'Este lead não está disponível.' }

  const extension = file.name.toLocaleLowerCase('pt-BR').split('.').pop() === 'jpeg' ? 'jpg' : file.name.toLocaleLowerCase('pt-BR').split('.').pop()
  const path = `${organizationId}/${leadId}/${crypto.randomUUID()}.${extension}`
  const { error: uploadError } = await supabase.storage.from('invoices').upload(path, file, { contentType: file.type, upsert: false })
  if (uploadError) return { error: 'Não foi possível armazenar a fatura. Verifique o bucket privado e tente novamente.' }

  const fields = parsed.data
  const { data, error: invoiceError } = await supabase.from('invoices').insert({
    organization_id: organizationId, lead_id: leadId, storage_path: path, original_filename: file.name.slice(0, 255), mime_type: file.type,
    provider: fields.provider, state: fields.state, customer_type: fields.customerType, amount: fields.amount, consumption_kwh: fields.consumptionKwh,
    reference_date: fields.referenceDate, created_by: user.id,
  }).select('id').single()
  if (invoiceError || !data) {
    await supabase.storage.from('invoices').remove([path])
    return { error: 'Não foi possível salvar os dados da fatura.' }
  }
  const invoice = data as unknown as { id: string }

  const { error: activityError } = await supabase.from('lead_activities').insert({ organization_id: organizationId, lead_id: leadId, user_id: user.id, type: 'FATURA_ADICIONADA', metadata: { invoice_id: invoice.id } })
  if (activityError) {
    await supabase.from('invoices').delete().eq('id', invoice.id).eq('organization_id', organizationId)
    await supabase.storage.from('invoices').remove([path])
    return { error: 'A fatura não pôde ser registrada no histórico.' }
  }

  revalidatePath(`/leads/${leadId}`)
  revalidatePath(`/leads/${leadId}/fatura`)
  revalidatePath('/dashboard')
  return { success: 'Fatura salva com segurança. Já é possível calcular a simulação.' }
}

export async function registerPublicIntakeInvoice(_state: InvoiceActionState, formData: FormData): Promise<InvoiceActionState> {
  const submissionId = String(formData.get('submissionId') ?? '')
  if (!/^[0-9a-f-]{36}$/i.test(submissionId)) return { error: 'Esta entrada não está disponível.' }
  const parsed = invoiceSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Confira os dados da fatura.' }

  const { supabase, organizationId } = await getCurrentContext()
  const { data: intake } = await supabase.from('public_intake_submissions').select('lead_id')
    .eq('id', submissionId).eq('organization_id', organizationId).maybeSingle()
  if (!intake) return { error: 'Esta entrada não está disponível neste workspace.' }
  const leadId = intake.lead_id as string
  const fields = parsed.data
  const { data, error } = await supabase.rpc('register_public_intake_invoice', {
    p_submission_id: submissionId,
    p_provider: fields.provider,
    p_state: fields.state,
    p_customer_type: fields.customerType as CustomerType,
    p_amount: fields.amount,
    p_consumption_kwh: fields.consumptionKwh,
    p_reference_date: fields.referenceDate,
  })
  if (error || !data) return { error: 'Não foi possível registrar os dados da fatura. Verifique se o arquivo foi recebido.' }
  revalidatePath(`/leads/${leadId}`)
  revalidatePath(`/leads/${leadId}/fatura`)
  revalidatePath(`/leads/${leadId}/simulacao`)
  revalidatePath('/dashboard')
  return { success: 'Dados da fatura registrados. Agora você pode preparar a simulação.' }
}
