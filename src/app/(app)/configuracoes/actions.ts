'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentContext } from '@/lib/auth/context'
import { eligibilityRuleSchema, organizationSchema, profileSchema, templateSchema } from '@/lib/validations/settings'

export type SettingsActionState = { error?: string; success?: string }

async function ownerContext() {
  const context = await getCurrentContext()
  const { data, error } = await context.supabase.rpc('is_organization_owner', { p_organization_id: context.organizationId })
  if (error || !data) throw new Error('Somente o responsável pelo workspace pode alterar estas configurações.')
  return context
}

function parseFields(formData: FormData) {
  return Object.fromEntries(formData.entries())
}

export async function updateProfile(_state: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  const result = profileSchema.safeParse(parseFields(formData))
  if (!result.success) return { error: result.error.issues[0]?.message ?? 'Confira os dados do perfil.' }

  const { supabase, user } = await ownerContext()
  if (result.data.email !== user.email) {
    const { error } = await supabase.auth.updateUser({ email: result.data.email })
    if (error) return { error: `O perfil não foi salvo: ${error.message}` }
  }

  const { error } = await supabase.from('profiles').update({
    full_name: result.data.fullName,
    phone: result.data.phone,
    city: result.data.city,
    state: result.data.state,
  }).eq('id', user.id)
  if (error) return { error: 'Não foi possível salvar seu perfil agora.' }
  revalidatePath('/configuracoes')
  return { success: result.data.email !== user.email ? 'Perfil atualizado. Confirme a troca do e-mail pelo link enviado.' : 'Perfil atualizado.' }
}

export async function updateOrganization(_state: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  const result = organizationSchema.safeParse(parseFields(formData))
  if (!result.success) return { error: result.error.issues[0]?.message ?? 'Informe o nome do workspace.' }
  const { supabase, organizationId } = await ownerContext()
  const { error } = await supabase.from('organizations').update({ name: result.data.name }).eq('id', organizationId)
  if (error) return { error: 'Não foi possível atualizar a organização.' }
  revalidatePath('/configuracoes')
  revalidatePath('/dashboard')
  return { success: 'Organização atualizada.' }
}

export async function saveTemplate(_state: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  const result = templateSchema.safeParse(parseFields(formData))
  if (!result.success) return { error: result.error.issues[0]?.message ?? 'Confira a mensagem.' }
  const { supabase, organizationId } = await ownerContext()
  const { error } = await supabase.from('message_templates').upsert({
    organization_id: organizationId,
    template_key: result.data.templateKey,
    title: result.data.title,
    content: result.data.content,
  }, { onConflict: 'organization_id,template_key' })
  if (error) return { error: 'Não foi possível salvar a mensagem.' }
  revalidatePath('/configuracoes')
  return { success: 'Mensagem salva.' }
}

export async function saveEligibilityRule(_state: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  const result = eligibilityRuleSchema.safeParse(parseFields(formData))
  if (!result.success) return { error: result.error.issues[0]?.message ?? 'Confira os critérios da regra.' }
  const { supabase, organizationId } = await ownerContext()
  const { ruleId, ...rule } = result.data
  const payload = {
    organization_id: organizationId,
    provider: rule.provider,
    state: rule.state,
    customer_type: rule.customerType,
    minimum_amount: rule.minimumAmount,
    maximum_amount: rule.maximumAmount,
    discount_percentage: rule.discountPercentage,
    active: rule.active,
  }
  const query = ruleId
    ? supabase.from('eligibility_rules').update(payload).eq('id', ruleId).eq('organization_id', organizationId)
    : supabase.from('eligibility_rules').insert(payload)
  const { error } = await query
  if (error) return { error: 'Não foi possível salvar a regra de simulação.' }
  revalidatePath('/configuracoes')
  return { success: 'Regra de simulação salva.' }
}

export async function managePublicIntakeLink(_state: SettingsActionState, formData: FormData): Promise<SettingsActionState & { publicLink?: { code: string | null; active: boolean } }> {
  const previousLink = (_state as SettingsActionState & { publicLink?: { code: string | null; active: boolean } }).publicLink
  const operation = String(formData.get('operation') ?? '')
  if (!['enable', 'rotate', 'disable'].includes(operation)) return { publicLink: previousLink, error: 'Operação de link inválida.' }
  const { supabase, organizationId } = await ownerContext()
  const { data, error } = await supabase.rpc('manage_public_intake_link', {
    p_organization_id: organizationId,
    p_operation: operation,
  })
  if (error || !data?.[0]) return { publicLink: previousLink, error: 'Não foi possível atualizar o link público. Tente novamente.' }
  revalidatePath('/configuracoes')
  revalidatePath('/dashboard')
  const publicLink = { code: data[0].out_code as string | null, active: data[0].out_active as boolean }
  return {
    publicLink,
    success: operation === 'disable' ? 'Link público desativado.' : operation === 'rotate' ? 'Novo link criado. O anterior foi desativado.' : 'Formulário público ativado.',
  }
}
