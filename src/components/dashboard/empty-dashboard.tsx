import Link from 'next/link'
import { Search, Sparkles } from 'lucide-react'

export function EmptyDashboard() {
  return <section className="card empty-state"><div><span className="empty-icon"><Sparkles size={21} /></span><h2 className="empty-title">Seu próximo cliente começa com uma busca</h2><p className="empty-copy">Encontre empresas da sua região, adicione ao CRM e acompanhe cada oportunidade até a simulação.</p><Link className="btn btn-primary" href="/prospectar"><Search size={15} /> Prospectar empresas</Link></div></section>
}
