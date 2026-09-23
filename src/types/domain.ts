import type { CustomerType, EligibilityStatus, PipelineStatus } from '@/lib/supabase/database'
export type { PipelineStatus } from '@/lib/supabase/database'

export type Potential = 'BAIXO' | 'MEDIO' | 'ALTO' | 'MUITO_ALTO'
export type ScoreInput = { category: string; hasPhone: boolean; hasWebsite: boolean; openHours: number | null }
export type InvoiceInput = { amount: number; provider: string; state: string; customerType: CustomerType }
export type EligibilityRule = {
  id?: string
  provider: string
  state: string
  customerType: CustomerType
  minimumAmount: number | null
  maximumAmount: number | null
  discountPercentage: number
  active: boolean
}
export type SimulationResult = {
  status: EligibilityStatus
  discountPercentage: number | null
  monthlySavings: number | null
  annualSavings: number | null
  newAmount: number | null
}
export type LeadCardData = { id: string; name: string; category: string; city: string; state: string; score: number; pipeline_status: PipelineStatus; created_at: string }
