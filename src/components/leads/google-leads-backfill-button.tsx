'use client'

import { useState, useTransition } from 'react'
import { LoaderCircle, RefreshCw } from 'lucide-react'
import { fillIncompleteGoogleLeadsAction } from '@/app/(app)/leads/actions'

export function GoogleLeadsBackfillButton({ count }: { count: number }) {
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState('')
  const [error, setError] = useState(false)

  if (count < 1) return null

  function fillLeads() {
    setMessage('')
    setError(false)
    startTransition(async () => {
      try {
        const result = await fillIncompleteGoogleLeadsAction()
        if ('error' in result && result.error) {
          setError(true)
          setMessage(result.error)
          return
        }
        setMessage(`${result.updated} lead${result.updated === 1 ? '' : 's'} atualizado${result.updated === 1 ? '' : 's'}${result.failed ? ` · ${result.failed} não foi${result.failed === 1 ? '' : 'ram'} atualizado${result.failed === 1 ? '' : 's'}` : ''}.`)
      } catch {
        setError(true)
        setMessage('Não foi possível preencher os leads agora. Tente novamente.')
      }
    })
  }

  return <div className="notice" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
    <div><strong>{count} lead{count === 1 ? ' antigo precisa' : 's antigos precisam'} de nome e dados no CRM.</strong><div className="small">A ação faz até {count} consulta{count === 1 ? '' : 's'} ao Google uma vez; depois a lista usa os dados salvos.</div>{message && <div className="small" role={error ? 'alert' : 'status'}>{message}</div>}</div>
    <button className="btn btn-secondary" type="button" onClick={fillLeads} disabled={pending}>
      {pending ? <LoaderCircle size={15} className="animate-spin" /> : <RefreshCw size={15} />}
      {pending ? 'Preenchendo CRM…' : 'Preencher dados no CRM'}
    </button>
  </div>
}
