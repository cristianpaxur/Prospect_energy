import type { Metadata } from 'next'
import { ProspectSearch } from '@/components/prospect/prospect-search'
import { getCurrentContext } from '@/lib/auth/context'

export const metadata: Metadata = { title: 'Prospectar empresas' }

export default async function ProspectingPage() {
  const { profile } = await getCurrentContext()
  return <main className="page-content"><div className="page-heading"><div><div className="eyebrow">Descubra novas oportunidades</div><h1 className="page-title">Prospectar empresas</h1><p className="page-subtitle">Encontre empresas da sua região e adicione as oportunidades ao seu pipeline.</p></div></div><ProspectSearch initialCity={profile.city} initialState={profile.state} /></main>
}
