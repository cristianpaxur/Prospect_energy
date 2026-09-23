'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { BrandLogo } from '@/components/brand-logo'
import { updatePasswordAction, type AuthFormState } from '../actions'

export function UpdatePasswordForm() {
  const [state, action, pending] = useActionState(updatePasswordAction, {} as AuthFormState)
  return <div className="auth-wrap"><section className="auth-art" aria-label="Prospect Energy"><div className="brand"><BrandLogo /></div><div className="auth-art-copy"><h1>Proteja sua conta.</h1><p>Escolha uma nova senha para continuar.</p></div></section><section className="auth-panel"><form className="auth-form" action={action}><div className="eyebrow">Recuperação de acesso</div><h2>Defina uma nova senha</h2><p>Use pelo menos 8 caracteres.</p><div className="auth-fields"><label className="field"><span className="label">Nova senha</span><input className="input" name="password" type="password" autoComplete="new-password" minLength={8} required /></label>{state.error && <div className="alert" role="alert">{state.error}</div>}<button className="btn btn-primary" disabled={pending}>{pending ? 'Salvando…' : 'Salvar nova senha'}</button><Link className="auth-link" href="/recuperar-senha">Solicitar outro link</Link></div></form></section></div>
}
