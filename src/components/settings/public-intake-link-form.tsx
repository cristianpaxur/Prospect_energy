'use client'

import { useActionState, useState, useSyncExternalStore } from 'react'
import { Copy, ExternalLink, RefreshCw } from 'lucide-react'
import { managePublicIntakeLink, type SettingsActionState } from '@/app/(app)/configuracoes/actions'

type PublicLinkState = SettingsActionState & { publicLink?: { code: string | null; active: boolean } }

function subscribeToLocation() {
  return () => {}
}

function getBrowserOrigin() {
  return window.location.origin
}

function getServerOrigin() {
  return ''
}

export function PublicIntakeLinkForm({ initialLink, canManage }: { initialLink: { code: string; active: boolean } | null; canManage: boolean }) {
  const [state, formAction, pending] = useActionState<PublicLinkState, FormData>(managePublicIntakeLink, initialLink ? { publicLink: initialLink } : {})
  const [copied, setCopied] = useState(false)
  const [copyFailed, setCopyFailed] = useState(false)
  const origin = useSyncExternalStore(subscribeToLocation, getBrowserOrigin, getServerOrigin)
  const hasActiveLink = Boolean(state.publicLink?.active && state.publicLink.code)
  const link = hasActiveLink && origin
    ? `${origin}/captar/${state.publicLink?.code}`
    : null

  async function copyLink() {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setCopyFailed(false)
    } catch {
      setCopied(false)
      setCopyFailed(true)
    }
  }

  return <div className="stack" style={{ width: '100%' }}>
    <div className="task-row" style={{ justifyContent: 'space-between', borderBottom: '1px solid #edf0f1', paddingBottom: 12 }}>
      <span><span className={`badge ${hasActiveLink ? 'badge-success' : 'badge-warning'}`}>{hasActiveLink ? 'Ativo' : 'Desativado'}</span><span className="small muted" style={{ marginLeft: 9 }}>{hasActiveLink ? 'Receba oportunidades por este formulário.' : 'Ative para receber novas solicitações.'}</span></span>
      {link && <a className="btn btn-ghost" href={link} target="_blank" rel="noreferrer" aria-label="Abrir formulário público"><ExternalLink size={15} /></a>}
    </div>
    {link && <div className="field-grid" style={{ gridTemplateColumns: 'minmax(0,1fr) auto' }}>
      <input className="input" aria-label="Link público" value={link} readOnly onFocus={(event) => event.currentTarget.select()} />
      <button type="button" className="btn btn-secondary" onClick={copyLink}><Copy size={14} /> {copied ? 'Copiado' : 'Copiar link'}</button>
    </div>}
    {copyFailed && <p className="small muted" role="status">Não foi possível copiar automaticamente. Selecione o link para copiá-lo.</p>}
    {state.error && <p role="alert" className="small" style={{ color: '#a52b2b' }}>{state.error}</p>}
    {state.success && <p role="status" className="small" style={{ color: '#08764b' }}>{state.success}</p>}
    {canManage ? <form action={formAction} className="field-grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))' }}>
      {hasActiveLink
        ? <><button className="btn btn-secondary" type="submit" name="operation" value="rotate" disabled={pending}><RefreshCw size={14} /> Gerar novo link</button><button className="btn btn-ghost" type="submit" name="operation" value="disable" disabled={pending}>Desativar link</button></>
        : <button className="btn btn-primary" type="submit" name="operation" value="enable" disabled={pending}>{pending ? 'Ativando…' : 'Ativar formulário público'}</button>}
    </form> : <p className="small muted">Somente o responsável pelo workspace pode alterar o link.</p>}
  </div>
}
