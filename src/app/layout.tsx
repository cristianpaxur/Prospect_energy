import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Prospect Energy', template: '%s | Prospect Energy' },
  description: 'Encontre empresas, acompanhe oportunidades e simule economia de energia.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
