import { notFound } from 'next/navigation'
import { getCurrentContext } from '@/lib/auth/context'

export async function getLeads(query = '') {
  const { supabase, organizationId } = await getCurrentContext()
  let request = supabase.from('leads').select('id,name,category,city,state,phone,email,website,address,open_hours,score,pipeline_status,created_at,updated_at,external_place_id').eq('organization_id', organizationId).order('updated_at', { ascending: false }).limit(100)
  if (query.trim()) request = request.or(`name.ilike.%${query.trim()}%,city.ilike.%${query.trim()}%,category.ilike.%${query.trim()}%`)
  const { data } = await request
  return (data ?? []) as unknown as LeadRow[]
}

export type LeadRow = {
  id: string; name: string; category: string; city: string; state: string; phone: string | null; email: string | null; website: string | null; address: string | null;
  open_hours: number | null; score: number; pipeline_status: string; created_at: string; updated_at: string; external_place_id?: string | null
}

export async function getLeadDetail(leadId: string) {
  const { supabase, organizationId } = await getCurrentContext()
  const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).eq('organization_id', organizationId).maybeSingle()
  if (!lead) notFound()

  const [{ data: notes }, { data: activities }, { data: tasks }, { data: invoices }, { data: simulations }] = await Promise.all([
    supabase.from('lead_notes').select('id,content,user_id,created_at').eq('lead_id', leadId).eq('organization_id', organizationId).order('created_at', { ascending: false }),
    supabase.from('lead_activities').select('id,type,metadata,user_id,created_at').eq('lead_id', leadId).eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(100),
    supabase.from('tasks').select('id,type,description,due_at,completed_at,created_at').eq('lead_id', leadId).eq('organization_id', organizationId).order('due_at', { ascending: true }),
    supabase.from('invoices').select('id,storage_path,original_filename,mime_type,provider,state,customer_type,amount,consumption_kwh,reference_date,created_at').eq('lead_id', leadId).eq('organization_id', organizationId).order('created_at', { ascending: false }),
    supabase.from('simulations').select('id,current_amount,discount_percentage,estimated_monthly_savings,estimated_annual_savings,estimated_new_amount,eligibility_status,created_at').eq('lead_id', leadId).eq('organization_id', organizationId).order('created_at', { ascending: false }),
  ])
  return {
    lead: lead as unknown as LeadRow,
    notes: (notes ?? []) as unknown as { id: string; content: string; user_id: string; created_at: string }[],
    activities: (activities ?? []) as unknown as { id: string; type: string; metadata: Record<string, unknown>; created_at: string }[],
    tasks: (tasks ?? []) as unknown as { id: string; type: string; description: string; due_at: string; completed_at: string | null; created_at: string }[],
    invoices: (invoices ?? []) as unknown as { id: string; storage_path: string; original_filename: string; mime_type: string; provider: string; state: string; customer_type: string; amount: number; consumption_kwh: number; reference_date: string; created_at: string }[],
    simulations: (simulations ?? []) as unknown as { id: string; current_amount: number; discount_percentage: number | null; estimated_monthly_savings: number | null; estimated_annual_savings: number | null; estimated_new_amount: number | null; eligibility_status: string; created_at: string }[],
  }
}
