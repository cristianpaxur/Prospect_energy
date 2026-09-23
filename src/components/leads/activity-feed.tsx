const activityLabels: Record<string, string> = {
  LEAD_CRIADO: 'Lead adicionado ao CRM', STATUS_ALTERADO: 'Etapa do pipeline alterada', WHATSAPP_ABERTO: 'WhatsApp aberto',
  LIGACAO_INICIADA: 'Ligação iniciada', EMAIL_ABERTO: 'E-mail aberto', SITE_ABERTO: 'Site visitado', MAPA_ABERTO: 'Localização aberta',
  FATURA_ADICIONADA: 'Fatura adicionada', SIMULACAO_REALIZADA: 'Simulação calculada',
}

export function ActivityFeed({ activities }: { activities: { id: string; type: string; metadata: Record<string, unknown>; created_at: string }[] }) {
  return <div className="stack">{activities.length ? activities.map((activity) => <div key={activity.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}><span className="task-dot" style={{ marginTop: 5 }} /><div><div style={{ fontSize: 12, color: '#354950', fontWeight: 600 }}>{activityLabels[activity.type] ?? activity.type}</div><div className="small muted" style={{ marginTop: 4 }}>{new Date(activity.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}{activity.type === 'STATUS_ALTERADO' && typeof activity.metadata.from === 'string' && typeof activity.metadata.to === 'string' ? ` · ${activity.metadata.from} → ${activity.metadata.to}` : ''}</div></div></div>) : <p className="small muted">As atividades do lead aparecerão aqui.</p>}</div>
}
