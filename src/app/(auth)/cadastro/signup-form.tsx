'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { BrandLogo } from '@/components/brand-logo'
import { signUpAction, type AuthFormState } from '../actions'

const initialState: AuthFormState = {}

export function SignupForm() {
  const [state, action, pending] = useActionState(signUpAction, initialState)
  return (
    <div className="auth-wrap">
      <section className="auth-art" aria-label="Prospect Energy">
        <div className="brand"><BrandLogo /></div>
        <div className="auth-art-copy"><h1>Comece a encontrar seus próximos clientes.</h1><p>Centralize sua prospecção e acompanhe cada oportunidade até a simulação de economia.</p></div>
        <div className="small" style={{ color: 'rgb(255 255 255 / 66%)' }}>Prospect Energy · Plataforma comercial</div>
      </section>
      <section className="auth-panel">
        <form className="auth-form" action={action}>
          <div className="eyebrow">Cadastro gratuito</div>
          <h2>Crie sua conta</h2>
          <p>Seu espaço de prospecção fica pronto em poucos minutos.</p>
          <div className="auth-fields">
            <label className="field"><span className="label">Nome completo</span><input className="input" name="name" autoComplete="name" placeholder="Seu nome" minLength={2} required /></label>
            <label className="field"><span className="label">E-mail</span><input className="input" name="email" type="email" autoComplete="email" placeholder="voce@empresa.com.br" required /></label>
            <div className="field-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <label className="field"><span className="label">WhatsApp</span><input className="input" name="phone" type="tel" autoComplete="tel" placeholder="(13) 99999-9999" minLength={10} required /></label>
              <label className="field"><span className="label">Cidade</span><input className="input" name="city" autoComplete="address-level2" placeholder="Santos" required /></label>
            </div>
            <label className="field"><span className="label">Estado</span><input className="input" name="state" autoComplete="address-level1" placeholder="SP" minLength={2} maxLength={2} required /></label>
            <label className="field"><span className="label">Senha</span><input className="input" name="password" type="password" autoComplete="new-password" placeholder="Mínimo de 8 caracteres" minLength={8} required /></label>
            {state.error && <div className="alert" role="alert">{state.error}</div>}
            {state.success && <div className="notice" role="status">{state.success}</div>}
            <button className="btn btn-primary" type="submit" disabled={pending}>{pending ? 'Criando conta…' : 'Criar minha conta'} <span aria-hidden="true">→</span></button>
          </div>
          <div className="auth-footer">Ao criar sua conta, você concorda com nossos <Link className="auth-link" href="/termos">Termos</Link> e leu nossa <Link className="auth-link" href="/privacidade">Política de Privacidade</Link>.<br />Já possui conta? <Link className="auth-link" href="/login">Entrar</Link></div>
        </form>
      </section>
    </div>
  )
}
