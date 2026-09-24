'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentContext } from '@/lib/auth/context'
import { getGooglePlaceCrmDetails } from '@/lib/google-places'
import { contactActionSchema, noteSchema, taskSchema } from '@/lib/validations/lead'
import { leadEditSchema } from '@/lib/validations/lead-edit'
import { scoreLead } from '@/lib/domain/lead-score'
import { mergeGooglePlaceData } from '@/lib/prospect/quick-add'

export type LeadActionState = { error?: string; success?: string }

type IncompleteGoogleLead = {
  id: string
  external_place_id: string
  name: string
  category: string
  address: string | null
  phone: string | null
  website: string | null
  open_hours: number | null
}

function isIncompleteGoogleLead(value: unknown): value is IncompleteGoogleLead {
  if (!value || typeof value !== 'object') return false
  const lead = value as Record<string, unknown>
  return typeof lead.id === 'string'
    && typeof lead.external_place_id === 'string'
    && typeof lead.name === 'string'
    && typeof lead.category === 'string'
    && (lead.address === null || typeof lead.address === 'string')
    && (lead.phone === null || typeof lead.phone === 'string')
    && (lead.website === null || typeof lead.website === 'string')
    && (lead.open_hours === null || typeof lead.open_hours === 'number')
}

export async function updateLead(_state: LeadActionState, formData: FormData): Promise<LeadActionState> {
  const leadId = String(formData.get('leadId') ?? '')
  const parsed = leadEditSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Confira os dados da empresa.' }
  const { supabase, organizationId } = await getCurrentContext()
  const { data: existing } = await supabase.from('leads').select('id').eq('id', leadId).eq('organization_id', organizationId).maybeSingle()
  if (!existing) return { error: 'Este lead não está disponível.' }
  const fields = parsed.data
  const score = scoreLead({ category: fields.category, hasPhone: Boolean(fields.phone), hasWebsite: Boolean(fields.website), openHours: fields.openHours })
  const { error } = await supabase.from('leads').update({ name: fields.name, category: fields.category, address: fields.address, city: fields.city, state: fields.state, phone: fields.phone, email: fields.email, website: fields.website, open_hours: fields.openHours, score }).eq('id', leadId).eq('organization_id', organizationId)
  if (error) return { error: 'Não foi possível atualizar a empresa agora.' }
  revalidatePath(`/leads/${leadId}`)
  revalidatePath('/leads')
  revalidatePath('/pipeline')
  return { success: 'Dados da empresa atualizados.' }
}

export async function fillIncompleteGoogleLeadsAction() {
  const { supabase, organizationId } = await getCurrentContext()
  const { data: leads, error } = await supabase.from('leads')
    .select('id,external_place_id,name,category,address,city,state,phone,website,open_hours')
    .eq('organization_id', organizationId)
    .eq('name', 'Lead sem nome')
    .not('external_place_id', 'is', null)
    .limit(20)

  if (error) return { error: 'Não foi possível listar os leads que precisam de dados.' }

  let updated = 0
  let failed = 0
  const incompleteLeads = Array.isArray(leads) ? (leads as unknown[]).filter(isIncompleteGoogleLead) : []
  for (const lead of incompleteLeads) {
    if (!lead.external_place_id) { failed += 1; continue }
    try {
      const place = await getGooglePlaceCrmDetails(lead.external_place_id)
      if (place.id !== lead.external_place_id || !place.displayName?.text?.trim()) { failed += 1; continue }

      const crmFields = mergeGooglePlaceData({
        name: lead.name,
        address: lead.address,
        phone: lead.phone,
        website: lead.website,
        openHours: lead.open_hours,
      }, {
        name: place.displayName.text,
        address: place.formattedAddress ?? '',
        phone: place.nationalPhoneNumber ?? '',
        website: place.websiteUri ?? '',
        openHours: null,
      })
      const score = scoreLead({ category: lead.category, hasPhone: Boolean(crmFields.phone), hasWebsite: Boolean(crmFields.website), openHours: crmFields.openHours })
      const result = await supabase.from('leads').update({
        name: crmFields.name,
        address: crmFields.address || null,
        phone: crmFields.phone || null,
        website: crmFields.website || null,
        open_hours: crmFields.openHours,
        score,
      }).eq('id', lead.id).eq('organization_id', organizationId).eq('name', 'Lead sem nome')
      if (result.error) failed += 1
      else updated += 1
    } catch {
      failed += 1
    }
  }

  if (updated > 0) {
    revalidatePath('/leads')
    revalidatePath('/pipeline')
  }
  return { updated, failed }
}

export async function createNote(_state: LeadActionState, formData: FormData): Promise<LeadActionState> {
  const leadId = String(formData.get('leadId') ?? '')
  const parsed = noteSchema.safeParse({ content: formData.get('content') })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Escreva uma anotação.' }
  const { supabase, organizationId, user } = await getCurrentContext()
  const { data: lead } = await supabase.from('leads').select('id').eq('id', leadId).eq('organization_id', organizationId).maybeSingle()
  if (!lead) return { error: 'Este lead não está disponível.' }
  const { error } = await supabase.from('lead_notes').insert({ organization_id: organizationId, lead_id: leadId, user_id: user.id, content: parsed.data.content })
  if (error) return { error: 'Não foi possível salvar a anotação.' }
  revalidatePath(`/leads/${leadId}`)
  return { success: 'Anotação adicionada.' }
}

export async function createTask(_state: LeadActionState, formData: FormData): Promise<LeadActionState> {
  const leadId = String(formData.get('leadId') ?? '')
  const parsed = taskSchema.safeParse({ type: formData.get('type'), dueDate: formData.get('dueDate'), dueTime: formData.get('dueTime'), description: formData.get('description') })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Confira a próxima ação.' }
  const { supabase, organizationId, user } = await getCurrentContext()
  const { data: lead } = await supabase.from('leads').select('id').eq('id', leadId).eq('organization_id', organizationId).maybeSingle()
  if (!lead) return { error: 'Este lead não está disponível.' }
  const dueAt = new Date(`${parsed.data.dueDate}T${parsed.data.dueTime}:00-03:00`)
  if (Number.isNaN(dueAt.getTime())) return { error: 'Informe uma data e um horário válidos.' }
  const { error } = await supabase.from('tasks').insert({ organization_id: organizationId, lead_id: leadId, user_id: user.id, type: parsed.data.type, description: parsed.data.description, due_at: dueAt.toISOString() })
  if (error) return { error: 'Não foi possível criar o lembrete.' }
  revalidatePath(`/leads/${leadId}`)
  revalidatePath('/dashboard')
  return { success: 'Próxima ação criada.' }
}

export async function completeTask(taskId: string, leadId: string) {
  const { supabase, organizationId } = await getCurrentContext()
  const { error } = await supabase.from('tasks').update({ completed_at: new Date().toISOString() }).eq('id', taskId).eq('lead_id', leadId).eq('organization_id', organizationId)
  if (error) return { error: 'Não foi possível concluir a tarefa.' }
  revalidatePath(`/leads/${leadId}`)
  revalidatePath('/dashboard')
  return { success: true }
}

export async function recordContactAction(leadId: string, action: string) {
  const parsed = contactActionSchema.safeParse(action)
  if (!parsed.success) return { error: 'Ação de contato inválida.' }
  const { supabase, organizationId, user } = await getCurrentContext()
  const { data: lead } = await supabase.from('leads').select('id').eq('id', leadId).eq('organization_id', organizationId).maybeSingle()
  if (!lead) return { error: 'Este lead não está disponível.' }
  const { error } = await supabase.from('lead_activities').insert({ organization_id: organizationId, lead_id: leadId, user_id: user.id, type: parsed.data, metadata: {} })
  if (error) return { error: 'Não foi possível registrar a atividade.' }
  revalidatePath(`/leads/${leadId}`)
  revalidatePath('/dashboard')
  return { success: true }
}

async function getPublicIntakeSubmission(formData: FormData) {
  const submissionId = String(formData.get('submissionId') ?? '')
  if (!/^[0-9a-f-]{36}$/i.test(submissionId)) return null
  const context = await getCurrentContext()
  const { data } = await context.supabase.from('public_intake_submissions')
    .select('id,lead_id').eq('id', submissionId).eq('organization_id', context.organizationId).maybeSingle()
  if (!data) return null
  return { ...context, submissionId: data.id as string, leadId: data.lead_id as string }
}

export async function reconcilePublicIntakeUpload(formData: FormData) {
  const intake = await getPublicIntakeSubmission(formData)
  if (!intake) return
  await intake.supabase.rpc('reconcile_public_intake_upload', { p_submission_id: intake.submissionId })
  revalidatePath('/dashboard')
  revalidatePath(`/leads/${intake.leadId}`)
  revalidatePath(`/leads/${intake.leadId}/fatura`)
}

export async function reviewPublicIntake(formData: FormData) {
  const intake = await getPublicIntakeSubmission(formData)
  if (!intake) return
  await intake.supabase.rpc('review_public_intake', { p_submission_id: intake.submissionId })
  revalidatePath('/dashboard')
  revalidatePath(`/leads/${intake.leadId}`)
}
