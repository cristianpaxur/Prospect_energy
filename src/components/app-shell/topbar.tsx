import Link from 'next/link'
import { Bell, Search } from 'lucide-react'
import { BrandLogo } from '@/components/brand-logo'

export function Topbar({ name }: { name: string }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'PE'
  return <header className="topbar"><Link className="topbar-brand" href="/dashboard" aria-label="Prospect Energy"><span className="topbar-brand-mark"><BrandLogo alt="" /></span><span>Prospect Energy</span></Link><div className="top-search"><Search size={15} /><span>Buscar empresas, leads...</span></div><div className="topbar-spacer" /><button className="top-icon" aria-label="Notificações" type="button"><Bell size={17} /></button><span className="avatar" aria-label={name}>{initials}</span></header>
}
