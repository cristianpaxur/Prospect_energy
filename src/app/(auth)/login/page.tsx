import type { Metadata } from 'next'
import { LoginForm } from './login-form'
import { hasSupabaseEnv } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Entrar' }
export const dynamic = 'force-dynamic'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const params = await searchParams
  return <LoginForm configurationError={params.erro === 'supabase' || !hasSupabaseEnv() ? 'supabase' : undefined} />
}
