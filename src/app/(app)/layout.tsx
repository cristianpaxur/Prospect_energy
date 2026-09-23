import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/app-shell/sidebar'
import { Topbar } from '@/components/app-shell/topbar'
import { getCurrentContext } from '@/lib/auth/context'
import { hasSupabaseEnv } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  if (!hasSupabaseEnv()) redirect('/login?erro=supabase')
  const { profile, organizationName } = await getCurrentContext()
  const name = profile.full_name || 'Licenciado Prospect Energy'

  return <div className="app-frame"><Sidebar name={name} organization={organizationName} /><div className="main-shell"><Topbar name={name} />{children}</div></div>
}
