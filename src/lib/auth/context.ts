import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function getCurrentContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: membership }] = await Promise.all([
    supabase.from('profiles').select('full_name,phone,city,state').eq('id', user.id).maybeSingle(),
    supabase.from('organization_members').select('organization_id').eq('user_id', user.id).limit(1).maybeSingle(),
  ])

  if (!membership?.organization_id) redirect('/login?erro=workspace')
  const { data: organization } = await supabase.from('organizations').select('name').eq('id', membership.organization_id).maybeSingle()

  return {
    supabase,
    user,
    profile: (profile as { full_name: string; phone: string; city: string; state: string } | null) ?? { full_name: user.email ?? 'Licenciado', phone: '', city: '', state: '' },
    organizationId: membership.organization_id as string,
    organizationName: (organization?.name as string | undefined) ?? 'Meu workspace',
  }
}
