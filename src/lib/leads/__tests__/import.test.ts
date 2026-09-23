import { describe, expect, it } from 'vitest'
import { buildLeadFingerprint, createImportService } from '../import'
import { importProspectsSchema } from '@/lib/validations/prospect'

describe('lead import', () => {
  it('normalizes name and address for duplicate matching', () => {
    expect(buildLeadFingerprint({ name: ' Academia Centro ', address: 'Rua A, 10' })).toBe('academia centro|rua a 10')
  })

  it('reports an existing place as skipped', async () => {
    const importer = createImportService({ createOnce: async () => false })
    const result = await importer([{ placeId: 'ChIJ1', name: 'Academia Centro', address: 'Rua A, 10', category: 'Academia', city: 'Santos', state: 'SP', phone: '', email: '', website: '', openHours: null }])
    expect(result).toEqual({ created: 0, skipped: 1 })
  })

  it('stores only the stable Google Place ID as the duplicate fingerprint', () => {
    expect(buildLeadFingerprint({ placeId: 'ChIJ1', name: 'Any name', address: 'Any address' })).toBe('place:ChIJ1')
  })

  it('rejects Google Places content from the persistent CRM import payload', () => {
    const result = importProspectsSchema.safeParse([{
      placeId: 'ChIJ1', name: 'Digitado pelo licenciado', category: 'Academia', address: 'Rua informada manualmente', city: 'Santos', state: 'SP',
      phone: '', email: '', website: '', openHours: null, rating: 4.8,
    }])
    expect(result.success).toBe(false)
  })
})
