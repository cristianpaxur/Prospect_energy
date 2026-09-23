'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { LockKeyhole, Mail } from 'lucide-react'
import { BrandLogo } from '@/components/brand-logo'
import { signInAction, type AuthFormState } from '../actions'

const initialState: AuthFormState = {}

export function LoginForm({ configurationError }: { configurationError?: string }) {
  const [state, action, pending] = useActionState(signInAction, initialState)
  return (
    <div className="auth-wrap">
      <section className="auth-art" aria-label="Prospect Energy">
        <div className="brand"><BrandLogo /></div>
        <div className="auth-art-copy"><h1>Mais negócios.<br />Mais economia.<br />Um futuro mais verde.</h1><p>Encontre empresas, organize oportunidades e transforme contas de energia em novos clientes.</p></div>
        <div className="small" style={{ color: 'rgb(255 255 255 / 66%)' }}>Prospect Energy · Plataforma comercial</div>
      </section>
      <section className="auth-panel">
        <form className="auth-form" action={action}>
          <div className="eyebrow">Bem-vindo de volta</div>
          <h2>Acesse sua conta</h2>
          <p>Entre para continuar sua prospecção.</p>
          {configurationError && <div className="alert" role="alert">Configure as variáveis do Supabase para conectar sua conta.</div>}
          <div className="auth-fields">
            <label className="field"><span className="label">E-mail</span><span style={{ position: 'relative' }}><Mail size={15} style={{ position: 'absolute', left: 11, top: 12, color: '#849198' }} /><input className="input" style={{ paddingLeft: 34 }} name="email" type="email" autoComplete="email" placeholder="voce@empresa.com.br" required /></span></label>
            <label className="field"><span className="label">Senha</span><span style={{ position: 'relative' }}><LockKeyhole size={15} style={{ position: 'absolute', left: 11, top: 12, color: '#849198' }} /><input className="input" style={{ paddingLeft: 34 }} name="password" type="password" autoComplete="current-password" placeholder="Sua senha" required /></span></label>
            <div style={{ textAlign: 'right', marginTop: -6 }}><Link className="auth-link small" href="/recuperar-senha">Esqueci minha senha</Link></div>
            {state.error && <div className="alert" role="alert">{state.error}</div>}
            <button className="btn btn-primary" type="submit" disabled={pending}>{pending ? 'Entrando…' : 'Entrar na plataforma'} <span aria-hidden="true">→</span></button>
          </div>
          <div className="auth-footer">Ainda não tem uma conta? <Link className="auth-link" href="/cadastro">Criar conta</Link></div>
        </form>
      </section>
    </div>
  )
}
