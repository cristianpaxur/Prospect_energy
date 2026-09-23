import { z } from 'zod'
import { parseBRL } from '@/lib/domain/money'

function parseLocalizedNumber(value: unknown): unknown {
  if (typeof value === 'number') return value
  if (typeof value !== 'string') return value
  const normalized = value.trim().replace(/\s/g, '').replace(/\./g, '').replace(',', '.')
  return normalized ? Number(normalized) : value
}

export const invoiceSchema = z.object({
  amount: z.preprocess((value) => typeof value === 'string' ? parseBRL(value) : value, z.number().positive('Informe um valor de fatura maior que zero.')),
  consumptionKwh: z.preprocess(parseLocalizedNumber, z.number().positive('Informe o consumo em kWh.')),
  provider: z.string().trim().min(2, 'Informe a distribuidora.').max(100),
  state: z.string().trim().length(2, 'Informe a UF com duas letras.').transform((value) => value.toUpperCase()),
  customerType: z.enum(['RESIDENCIAL', 'COMERCIAL', 'RURAL', 'INDUSTRIAL', 'OUTRO']),
  referenceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe o mês de referência.').refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), 'Informe uma data válida.'),
})

export type InvoiceFields = z.infer<typeof invoiceSchema>

export function validateInvoiceFile(file: { type: string; size: number; name: string }) {
  if (file.size <= 0) return 'Selecione um arquivo válido.'
  if (file.size > 10 * 1024 * 1024) return 'O arquivo deve ter no máximo 10 MB.'
  const extension = file.name.toLocaleLowerCase('pt-BR').split('.').pop()
  const allowed = new Map([['application/pdf', 'pdf'], ['image/jpeg', 'jpg'], ['image/png', 'png']])
  const expected = allowed.get(file.type)
  if (!expected || (expected === 'jpg' ? !['jpg', 'jpeg'].includes(extension ?? '') : extension !== expected)) return 'Envie somente arquivos PDF, JPG ou PNG.'
  return null
}
