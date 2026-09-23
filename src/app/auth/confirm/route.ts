import { NextResponse, type NextRequest } from 'next/server'
import { createClient, hasSupabaseEnv } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  if (!hasSupabaseEnv()) return NextResponse.redirect(new URL('/login?erro=supabase', request.url))

  const code = request.nextUrl.searchParams.get('code')
  const tokenHash = request.nextUrl.searchParams.get('token_hash')
  const type = request.nextUrl.searchParams.get('type')
  const next = request.nextUrl.searchParams.get('next')
  const destination = next?.startsWith('/') && !next.startsWith('//') ? next : '/dashboard'
  const supabase = await createClient()
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(new URL(destination, request.url))
  }
  if (tokenHash && type && ['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email'].includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as 'signup' | 'invite' | 'magiclink' | 'recovery' | 'email_change' | 'email' })
    if (!error) return NextResponse.redirect(new URL(destination, request.url))
  }

  return NextResponse.redirect(new URL('/login?erro=confirmacao', request.url))
}
