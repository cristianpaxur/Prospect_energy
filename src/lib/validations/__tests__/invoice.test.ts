import { describe, expect, it } from 'vitest'
import { invoiceSchema, validateInvoiceFile } from '../invoice'

describe('invoice validation', () => {
  it('parses localized money and consumption fields', () => {
    expect(invoiceSchema.safeParse({ amount: '3.850,00', consumptionKwh: '2912', provider: 'CPFL', state: 'sp', customerType: 'COMERCIAL', referenceDate: '2026-09-01' }).data)
      .toMatchObject({ amount: 3850, consumptionKwh: 2912, state: 'SP' })
  })

  it('accepts supported files up to 10 MB and rejects unsupported or oversized files', () => {
    expect(validateInvoiceFile({ type: 'application/pdf', size: 1000, name: 'fatura.pdf' })).toBeNull()
    expect(validateInvoiceFile({ type: 'text/plain', size: 1000, name: 'fatura.txt' })).toMatch(/PDF|JPG|PNG/)
    expect(validateInvoiceFile({ type: 'application/pdf', size: 10 * 1024 * 1024 + 1, name: 'fatura.pdf' })).toMatch(/10 MB/)
  })
})
