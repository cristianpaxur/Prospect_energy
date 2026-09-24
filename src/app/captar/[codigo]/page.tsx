import type { Metadata } from 'next'
import { createPublicClient } from '@/lib/supabase/public'
import { PublicIntakeForm } from '@/components/public-intake/public-intake-form'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Solicitar análise de energia',
  robots: { index: false, follow: false },
}

export default async function PublicIntakePage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params
  let organizationName: string | null = null

  if (/^[A-Za-z0-9_-]{32,128}$/.test(codigo)) {
    try {
      const { data, error } = await createPublicClient().rpc('public_link_details', { p_code: codigo })
      if (!error) organizationName = data?.[0]?.organization_name ?? null
    } catch {
      organizationName = null
    }
  }

  return <main className="page-content" style={{ maxWidth: 720, margin: '40px auto' }}>
    <div className="page-heading"><div><div className="eyebrow">Prospect Energy · Growth</div><h1 className="page-title">{organizationName ? `Análise de energia para ${organizationName}` : 'Solicitação de análise'}</h1><p className="page-subtitle">{organizationName ? 'Envie os dados da empresa e a fatura para o licenciado preparar uma análise.' : 'Este link não está disponível. Peça um link atualizado ao seu contato.'}</p></div></div>
    {organizationName ? <section className="card card-pad stack"><PublicIntakeForm code={codigo} organizationName={organizationName} /></section> : <section className="card card-pad"><p className="card-copy">O link pode ter sido desativado ou digitado incorretamente.</p></section>}
  </main>
}
