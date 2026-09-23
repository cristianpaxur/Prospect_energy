import { describe, expect, it } from 'vitest'
import { signUpSchema } from '../auth'

describe('signUpSchema', () => {
  it('requires the operational profile fields and a secure password', () => {
    expect(signUpSchema.safeParse({
      name: 'Cristian Paxur', email: 'cristian@example.com', phone: '13999999999',
      city: 'Santos', state: 'SP', password: 'segura123',
    }).success).toBe(true)
    expect(signUpSchema.safeParse({ name: '', email: 'invalido', password: '123' }).success).toBe(false)
  })

  it('normalizes the state code', () => {
    expect(signUpSchema.parse({ name: 'Jo Silva', email: 'jo@example.com', phone: '13999999999', city: 'Santos', state: 'sp', password: 'segura123' }).state).toBe('SP')
  })
})
