import type { Metadata } from 'next'
import { ResetForm } from './reset-form'

export const metadata: Metadata = { title: 'Recuperar senha' }
export const dynamic = 'force-dynamic'

export default function RecoverPasswordPage() {
  return <ResetForm />
}
