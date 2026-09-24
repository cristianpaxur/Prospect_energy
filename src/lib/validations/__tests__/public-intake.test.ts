import { describe, expect, it } from 'vitest'
import { publicIntakeSchema, validatePublicInvoiceFile } from '../public-intake'

describe('public intake validation', () => {
  const validForm = {
    companyName: 'Mercado Central',
    phone: '(11) 98765-4321',
    city: 'Campinas',
    email: 'contato@mercadocentral.com.br',
    consent: true,
  }

  it('accepts the required contact details and explicit consent', () => {
    expect(publicIntakeSchema.safeParse(validForm).success).toBe(true)
  })

  it('rejects an unchecked consent box and missing contact details', () => {
    expect(publicIntakeSchema.safeParse({ ...validForm, consent: false }).success).toBe(false)
    expect(publicIntakeSchema.safeParse({ ...validForm, companyName: '', email: 'inválido' }).success).toBe(false)
  })

  it('allows supported invoice files up to 10 MiB with matching extension and MIME', () => {
    expect(validatePublicInvoiceFile({ name: 'conta.pdf', type: 'application/pdf', size: 10 * 1024 * 1024 })).toBeNull()
    expect(validatePublicInvoiceFile({ name: 'conta.jpeg', type: 'image/jpeg', size: 1024 })).toBeNull()
    expect(validatePublicInvoiceFile({ name: 'conta.png', type: 'image/png', size: 1024 })).toBeNull()
  })

  it('rejects empty, oversized or mismatched files', () => {
    expect(validatePublicInvoiceFile({ name: 'conta.pdf', type: 'application/pdf', size: 0 })).not.toBeNull()
    expect(validatePublicInvoiceFile({ name: 'conta.pdf', type: 'application/pdf', size: 10 * 1024 * 1024 + 1 })).not.toBeNull()
    expect(validatePublicInvoiceFile({ name: 'conta.pdf', type: 'image/png', size: 1024 })).not.toBeNull()
    expect(validatePublicInvoiceFile({ name: 'conta.exe', type: 'application/octet-stream', size: 1024 })).not.toBeNull()
  })
})
