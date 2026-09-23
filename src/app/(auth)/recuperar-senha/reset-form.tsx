'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { BrandLogo } from '@/components/brand-logo'
import { requestPasswordResetAction, type AuthFormState } from '../actions'

const initialState: AuthFormState = {}

export function ResetForm() {
  const [state, action, pending] = useActionState(requestPasswordResetAction, initialState)
  return (
    <div className="auth-wrap">
      <section className="auth-art" aria-label="Prospect Energy"><div className="brand"><BrandLogo /></div><div className="auth-art-copy"><h1>Retome o controle da sua prospecção.</h1><p>Vamos enviar um link seguro para você recuperar o acesso.</p></div></section>
      <section className="auth-panel"><form className="auth-form" action={action}><div className="eyebrow">Recuperação de acesso</div><h2>Esqueceu sua senha?</h2><p>Informe seu e-mail e enviaremos as instruções.</p><div className="auth-fields"><label className="field"><span className="label">E-mail</span><input className="input" name="email" type="email" autoComplete="email" required /></label>{state.error && <div className="alert" role="alert">{state.error}</div>}{state.success && <div className="notice" role="status">{state.success}</div>}<button className="btn btn-primary" disabled={pending}>{pending ? 'Enviando…' : 'Enviar link de recuperação'}</button></div><div className="auth-footer"><Link className="auth-link" href="/login">← Voltar para entrar</Link></div></form></section>
    </div>
  )
}
