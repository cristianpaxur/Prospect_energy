import type { ReactNode } from 'react'

export function KpiCard({ label, value, note, icon }: { label: string; value: string; note: string; icon: ReactNode }) {
  return <section className="card kpi-card"><div className="kpi-head"><span>{label}</span><span className="kpi-icon">{icon}</span></div><div className="kpi-value">{value}</div><div className="kpi-foot">{note}</div></section>
}
