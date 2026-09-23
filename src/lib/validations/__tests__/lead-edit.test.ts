import { describe, expect, it } from 'vitest'
import { leadEditSchema } from '../lead-edit'

describe('lead edit validation', () => {
  it('normalizes user-entered CRM fields and rejects an invalid email', () => {
    const valid = { name: ' Loja Central ', category: 'Mercado', address: '', city: 'Santos', state: 'sp', phone: '', email: '', website: '', openHours: '' }
    expect(leadEditSchema.safeParse(valid).data).toMatchObject({ name: 'Loja Central', state: 'SP', openHours: null })
    expect(leadEditSchema.safeParse({ ...valid, email: 'not-email' }).success).toBe(false)
  })
})
