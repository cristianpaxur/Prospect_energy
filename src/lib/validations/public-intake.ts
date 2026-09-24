import { z } from 'zod'

export const PUBLIC_INVOICE_MAX_BYTES = 10 * 1024 * 1024
export const PUBLIC_CONSENT_VERSION = 'growth-public-intake-v1'
export const PUBLIC_CONSENT_TEXT = 'Autorizo o licenciado desta página a entrar em contato comigo sobre energia e a usar esta fatura para preparar uma estimativa. Li a política de privacidade.'

export const publicIntakeSchema = z.object({
  companyName: z.string().trim().min(2, 'Informe o nome da empresa.').max(160, 'O nome deve ter até 160 caracteres.'),
  phone: z.string().trim().min(10, 'Informe um telefone válido.').max(32, 'O telefone deve ter até 32 caracteres.')
    .regex(/^\+?[\d\s().-]+$/, 'Informe um telefone válido.')
    .refine((value) => value.replace(/\D/g, '').length >= 10, 'Informe um telefone com DDD.'),
  city: z.string().trim().min(2, 'Informe a cidade.').max(120, 'A cidade deve ter até 120 caracteres.'),
  email: z.string().trim().email('Informe um e-mail válido.').max(254, 'O e-mail deve ter até 254 caracteres.'),
  consent: z.literal(true, { error: 'Autorize o contato e o tratamento da fatura para continuar.' }),
})

const invoiceMimeByExtension: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
}

export function validatePublicInvoiceFile(file: { name: string; type: string; size: number }) {
  if (!file.name.trim() || file.size <= 0) return 'Selecione um arquivo válido.'
  if (file.size > PUBLIC_INVOICE_MAX_BYTES) return 'O arquivo deve ter no máximo 10 MB.'

  const extension = file.name.toLocaleLowerCase('pt-BR').split('.').pop() ?? ''
  if (invoiceMimeByExtension[extension] !== file.type) return 'Envie somente arquivos PDF, JPG ou PNG.'
  return null
}

export type PublicIntakeFields = z.infer<typeof publicIntakeSchema>
