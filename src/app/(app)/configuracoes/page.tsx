import type { Metadata } from 'next'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ProfileForm, OrganizationForm, RuleForm, TemplatesForm, type RuleRow, type TemplateRow } from '@/components/settings/settings-forms'
import { getCurrentContext } from '@/lib/auth/context'

export const metadata: Metadata = { title: 'Configurações' }

export default async function SettingsPage() {
  const { supabase, organizationId, organizationName, profile, user } = await getCurrentContext()
  const [{ data: rules }, { data: templates }] = await Promise.all([
    supabase.from('eligibility_rules').select('id,provider,state,customer_type,minimum_amount,maximum_amount,discount_percentage,active').eq('organization_id', organizationId).order('created_at'),
    supabase.from('message_templates').select('template_key,title,content').eq('organization_id', organizationId).order('template_key'),
  ])

  return <main className="page-content"><div className="page-heading"><div><div className="eyebrow">Seu workspace</div><h1 className="page-title">Configurações</h1><p className="page-subtitle">Mantenha seu perfil e as regras comerciais atualizados.</p></div></div>
    <div className="two-column"><div className="stack">
      <Card><CardHeader><div><h2 className="card-title">Perfil</h2><p className="card-copy">Seus dados de contato e localização</p></div></CardHeader><CardContent><ProfileForm profile={profile} email={user.email ?? ''} /></CardContent></Card>
      <Card><CardHeader><div><h2 className="card-title">Organização</h2><p className="card-copy">O espaço privado dos seus leads</p></div></CardHeader><CardContent><OrganizationForm name={organizationName} /></CardContent></Card>
      <Card><CardHeader><div><h2 className="card-title">Regras de simulação</h2><p className="card-copy">Critérios usados para estimar economia</p></div></CardHeader><CardContent><RuleForm rules={(rules ?? []) as unknown as RuleRow[]} /></CardContent></Card>
    </div><div className="stack"><Card><CardHeader><div><h2 className="card-title">Mensagens de WhatsApp</h2><p className="card-copy">Revise o texto antes de abrir o WhatsApp</p></div></CardHeader><CardContent><TemplatesForm templates={(templates ?? []) as unknown as TemplateRow[]} /></CardContent></Card></div></div>
  </main>
}
