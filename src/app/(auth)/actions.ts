'use server'

import { redirect } from 'next/navigation'
import { createClient, hasSupabaseEnv } from '@/lib/supabase/server'
import { loginSchema, resetPasswordSchema, signUpSchema, updatePasswordSchema } from '@/lib/validations/auth'

export type AuthFormState = { error?: string; success?: string }

function messageFromError(message: string) {
  if (message.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.'
  if (message.includes('User already registered')) return 'Este e-mail já possui uma conta.'
  if (message.includes('Email not confirmed')) return 'Confirme seu e-mail antes de entrar.'
  return message
}

export async function signInAction(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const fields = loginSchema.safeParse(Object.fromEntries(formData))
  if (!fields.success) return { error: fields.error.issues[0]?.message ?? 'Confira seus dados.' }
  if (!hasSupabaseEnv()) return { error: 'Configure o Supabase nas variáveis de ambiente para entrar.' }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(fields.data)
  if (error) return { error: messageFromError(error.message) }
  redirect('/dashboard')
}

export async function signUpAction(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const fields = signUpSchema.safeParse(Object.fromEntries(formData))
  if (!fields.success) return { error: fields.error.issues[0]?.message ?? 'Confira seus dados.' }
  if (!hasSupabaseEnv()) return { error: 'Configure o Supabase nas variáveis de ambiente para criar a conta.' }

  const supabase = await createClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const { data, error } = await supabase.auth.signUp({
    email: fields.data.email,
    password: fields.data.password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/confirm`,
      data: { name: fields.data.name, phone: fields.data.phone, city: fields.data.city, state: fields.data.state },
    },
  })

  if (error) return { error: messageFromError(error.message) }
  if (data.session) redirect('/dashboard')
  return { success: 'Conta criada. Acesse seu e-mail para confirmar o cadastro e entrar.' }
}

export async function requestPasswordResetAction(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const fields = resetPasswordSchema.safeParse(Object.fromEntries(formData))
  if (!fields.success) return { error: fields.error.issues[0]?.message ?? 'Informe um e-mail válido.' }
  if (!hasSupabaseEnv()) return { error: 'Configure o Supabase para recuperar a senha.' }

  const supabase = await createClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const { error } = await supabase.auth.resetPasswordForEmail(fields.data.email, {
    redirectTo: `${siteUrl}/auth/confirm?next=/redefinir-senha`,
  })
  if (error) return { error: messageFromError(error.message) }
  return { success: 'Se este e-mail estiver cadastrado, você receberá um link para redefinir a senha.' }
}

export async function updatePasswordAction(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const fields = updatePasswordSchema.safeParse(Object.fromEntries(formData))
  if (!fields.success) return { error: fields.error.issues[0]?.message ?? 'Informe uma senha válida.' }
  if (!hasSupabaseEnv()) return { error: 'Configure o Supabase para redefinir a senha.' }
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'O link expirou. Solicite uma nova recuperação de senha.' }
  const { error } = await supabase.auth.updateUser({ password: fields.data.password })
  if (error) return { error: messageFromError(error.message) }
  await supabase.auth.signOut()
  redirect('/login?senha=atualizada')
}

export async function signOutAction() {
  if (hasSupabaseEnv()) {
    const supabase = await createClient()
    await supabase.auth.signOut()
  }
  redirect('/login')
}
