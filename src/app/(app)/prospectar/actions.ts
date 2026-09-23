'use server'

import { getCurrentContext } from '@/lib/auth/context'
import { scoreLead } from '@/lib/domain/lead-score'
import { buildLeadFingerprint, createImportService } from '@/lib/leads/import'
import { buildQuickAddRecord } from '@/lib/prospect/quick-add'
import { importProspectsSchema, quickImportProspectSchema } from '@/lib/validations/prospect'

export async function importProspectsAction(input: unknown) {
  const parsed = importProspectsSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Selecione empresas válidas para adicionar.' }
  const { supabase, organizationId } = await getCurrentContext()

  const importer = createImportService({
    createOnce: async (lead) => {
      const score = scoreLead({ category: lead.category, hasPhone: Boolean(lead.phone), hasWebsite: Boolean(lead.website), openHours: lead.openHours })
      const { data, error } = await supabase.rpc('create_lead_with_activity', {
        p_organization_id: organizationId,
        p_lead: {
          external_place_id: lead.placeId,
          fingerprint: lead.fingerprint,
          name: lead.name,
          category: lead.category,
          phone: lead.phone || null,
          email: lead.email || null,
          website: lead.website || null,
          address: lead.address || null,
          city: lead.city,
          state: lead.state,
          open_hours: lead.openHours,
          score,
        },
      })
      if (error) throw new Error('Não foi possível adicionar as empresas ao CRM.')
      return Boolean(data?.[0]?.was_created)
    },
  })

  try {
    return await importer(parsed.data)
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Não foi possível adicionar as empresas ao CRM.' }
  }
}

export async function quickImportProspectAction(input: unknown) {
  const parsed = quickImportProspectSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Confira os dados da empresa.' }

  const { supabase, organizationId } = await getCurrentContext()
  const lead = buildQuickAddRecord(parsed.data)
  const score = scoreLead({ category: lead.category, hasPhone: Boolean(lead.phone), hasWebsite: Boolean(lead.website), openHours: lead.openHours })
  const { data, error } = await supabase.rpc('create_lead_with_activity', {
    p_organization_id: organizationId,
    p_lead: {
      external_place_id: lead.placeId,
      fingerprint: buildLeadFingerprint({ ...lead, placeId: lead.placeId }),
      name: lead.name,
      category: lead.category,
      phone: lead.phone || null,
      email: null,
      website: lead.website || null,
      address: lead.address || null,
      city: lead.city,
      state: lead.state,
      open_hours: lead.openHours,
      score,
    },
  })
  if (error) return { error: 'Não foi possível adicionar essa empresa ao CRM.' }

  const createdLeadId = data?.[0]?.out_lead_id
  if (typeof createdLeadId === 'string' && createdLeadId) return { leadId: createdLeadId, created: true }

  const { data: existing } = await supabase.from('leads').select('id').eq('organization_id', organizationId).eq('external_place_id', lead.placeId).maybeSingle()
  const existingId = typeof existing?.id === 'string' ? existing.id : null
  if (!existingId) return { error: 'A empresa já existe, mas não foi possível abrir o cadastro.' }
  return { leadId: existingId, created: false }
}
