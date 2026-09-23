import { NextResponse, type NextRequest } from 'next/server'
import { createClient, hasSupabaseEnv } from '@/lib/supabase/server'
import { searchBusinesses } from '@/lib/google-places'
import { prospectFiltersSchema } from '@/lib/validations/prospect'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: 'Configure o Supabase para pesquisar empresas.' }, { status: 503 })
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sua sessão expirou. Entre novamente.' }, { status: 401 })

  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'O formulário de pesquisa está inválido.' }, { status: 400 }) }
  const filters = prospectFiltersSchema.safeParse(body)
  if (!filters.success) return NextResponse.json({ error: filters.error.issues[0]?.message ?? 'Confira os filtros da pesquisa.' }, { status: 400 })
  if (!process.env.GOOGLE_MAPS_API_KEY) return NextResponse.json({ error: 'Configure GOOGLE_MAPS_API_KEY para pesquisar empresas.' }, { status: 503 })

  try {
    return NextResponse.json({ businesses: await searchBusinesses(filters.data) })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível pesquisar empresas agora.'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
