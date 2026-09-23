'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentContext } from '@/lib/auth/context'
import { PIPELINE_ORDER } from '@/lib/pipeline'
import type { PipelineStatus } from '@/types/domain'

export async function moveLeadAction(leadId: string, toStatus: string) {
  if (!PIPELINE_ORDER.includes(toStatus as Exclude<PipelineStatus, 'PERDIDO'>) && toStatus !== 'PERDIDO') return { error: 'Etapa de pipeline inválida.' }
  const { supabase } = await getCurrentContext()
  const { error } = await supabase.rpc('move_lead', { p_lead_id: leadId, p_to_status: toStatus as PipelineStatus })
  if (error) return { error: error.message.includes('sem permissão') ? 'Este lead não está disponível.' : 'Não foi possível mover o lead.' }
  revalidatePath('/pipeline')
  revalidatePath('/dashboard')
  revalidatePath(`/leads/${leadId}`)
  return { success: true }
}
