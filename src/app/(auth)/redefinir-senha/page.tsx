import type { Metadata } from 'next'
import { UpdatePasswordForm } from './update-password-form'

export const metadata: Metadata = { title: 'Redefinir senha' }
export const dynamic = 'force-dynamic'

export default function UpdatePasswordPage() {
  return <UpdatePasswordForm />
}
