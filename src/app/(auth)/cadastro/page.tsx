import type { Metadata } from 'next'
import { SignupForm } from './signup-form'

export const metadata: Metadata = { title: 'Criar conta' }
export const dynamic = 'force-dynamic'

export default function SignupPage() {
  return <SignupForm />
}
