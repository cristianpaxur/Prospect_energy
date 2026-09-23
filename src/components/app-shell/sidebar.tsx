'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Building2, ClipboardList, House, Search, Settings2, Users } from 'lucide-react'
import { signOutAction } from '@/app/(auth)/actions'
import { BrandLogo } from '@/components/brand-logo'

const nav = [
  { href: '/dashboard', label: 'Início', icon: House },
  { href: '/prospectar', label: 'Prospectar', icon: Search },
  { href: '/pipeline', label: 'Pipeline', icon: ClipboardList },
  { href: '/leads', label: 'Leads', icon: Building2 },
  { href: '/configuracoes', label: 'Configurações', icon: Settings2 },
]

export function Sidebar({ name, organization }: { name: string; organization: string }) {
  const pathname = usePathname()
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'PE'

  return (
    <>
      <aside className="sidebar">
        <Link className="brand" href="/dashboard"><BrandLogo /></Link>
        <nav className="nav-group" aria-label="Navegação principal">
          {nav.map(({ href, label, icon: Icon }) => <Link key={href} className="nav-item" aria-current={pathname === href || (href !== '/dashboard' && pathname.startsWith(href)) ? 'page' : undefined} href={href}><span className="nav-icon"><Icon size={17} /></span>{label}</Link>)}
        </nav>
        <div className="sidebar-spacer" />
        <div className="user-mini"><span className="avatar">{initials}</span><div style={{ minWidth: 0 }}><div className="user-mini-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div><div className="user-mini-sub" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{organization}</div></div></div>
        <form action={signOutAction} style={{ padding: '0 12px 13px' }}><button className="nav-item" type="submit" style={{ width: '100%', border: 0, background: 'transparent', cursor: 'pointer', textAlign: 'left' }}><Users size={17} /> Sair da conta</button></form>
      </aside>
      <nav className="mobile-bar" aria-label="Navegação principal para celular">
        {nav.map(({ href, label, icon: Icon }, index) => <Link key={href} className="nav-item" aria-current={pathname === href || (href !== '/dashboard' && pathname.startsWith(href)) ? 'page' : undefined} href={index === 4 ? '/configuracoes' : href}><span className="nav-icon"><Icon size={17} /></span>{index === 4 ? 'Ajustes' : label}</Link>)}
      </nav>
    </>
  )
}
