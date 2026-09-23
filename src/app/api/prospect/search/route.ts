import { NextResponse, type NextRequest } from 'next/server'
import { createClient, hasSupabaseEnv } from '@/lib/supabase/server'
import { searchBusinesses } from '@/lib/google-places'
import { prospectSearchRequestSchema } from '@/lib/validations/prospect'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: 'Configure o Supabase para pesquisar empresas.' }, { status: 503 })
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sua sessão expirou. Entre novamente.' }, { status: 401 })

  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'O formulário de pesquisa está inválido.' }, { status: 400 }) }
  const requestData = prospectSearchRequestSchema.safeParse(body)
  if (!requestData.success) return NextResponse.json({ error: requestData.error.issues[0]?.message ?? 'Confira os filtros da pesquisa.' }, { status: 400 })
  if (!process.env.GOOGLE_MAPS_API_KEY) return NextResponse.json({ error: 'Configure GOOGLE_MAPS_API_KEY para pesquisar empresas.' }, { status: 503 })

  const { data: membership, error: membershipError } = await supabase.from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()
  if (membershipError) return NextResponse.json({ error: 'Não foi possível identificar sua organização.' }, { status: 500 })
  if (!membership?.organization_id) return NextResponse.json({ error: 'Sua organização não está disponível.' }, { status: 403 })

  try {
    const { pageToken, ...filters } = requestData.data
    const page = await searchBusinesses(filters, pageToken)
    const pagePlaceIds = page.businesses.map((business) => business.placeId)
    let existingPlaceIds = new Set<string>()

    if (pagePlaceIds.length) {
      const { data: existingLeads, error: leadsError } = await supabase.from('leads')
        .select('external_place_id')
        .eq('organization_id', membership.organization_id)
        .in('external_place_id', pagePlaceIds)
      if (leadsError) return NextResponse.json({ error: 'Não foi possível filtrar empresas já cadastradas.' }, { status: 500 })
      existingPlaceIds = new Set((existingLeads ?? []).flatMap((lead) => typeof lead.external_place_id === 'string' ? [lead.external_place_id] : []))
    }

    return NextResponse.json({
      businesses: page.businesses.filter((business) => !existingPlaceIds.has(business.placeId)),
      nextPageToken: page.nextPageToken,
      skippedExistingCount: existingPlaceIds.size,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível pesquisar empresas agora.'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
