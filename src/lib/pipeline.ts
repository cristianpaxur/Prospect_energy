import type { LeadCardData, PipelineStatus } from '@/types/domain'

export const PIPELINE_ORDER: Exclude<PipelineStatus, 'PERDIDO'>[] = [
  'NOVO', 'CONTATO_REALIZADO', 'INTERESSADO', 'AGUARDANDO_FATURA', 'ANALISE', 'PROPOSTA', 'FECHADO',
]

export function groupLeadsByStatus<T extends { pipeline_status: PipelineStatus }>(leads: T[]) {
  const result = Object.fromEntries((['PERDIDO', ...PIPELINE_ORDER] as PipelineStatus[]).map((status) => [status, []])) as unknown as Record<PipelineStatus, T[]>
  for (const lead of leads) result[lead.pipeline_status].push(lead)
  return result
}

export function toLeadCardData(row: LeadCardData): LeadCardData {
  return row
}
