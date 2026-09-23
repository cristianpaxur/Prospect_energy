import { describe, expect, it } from 'vitest'
import * as quickAdd from '../quick-add'
import { buildQuickAddRecord, buildQuickImportInput } from '../quick-add'
import { quickImportProspectSchema } from '@/lib/validations/prospect'

const business = {
  placeId: 'ChIJ123',
  name: 'Academia Central',
  category: 'Academia',
  address: 'Rua A, 10, Santos - SP',
  city: 'Santos',
  state: 'sp',
  phone: '(13) 3333-1111',
  website: 'https://academia.example',
  openHours: 14,
}

describe('quick prospect add', () => {
  it('puts the search result business details in the one-click import payload', () => {
    const payload = buildQuickImportInput(business)

    expect(payload).toEqual({ ...business, state: 'SP' })
    expect(quickImportProspectSchema.safeParse(payload).success).toBe(true)
  })

  it('creates a complete CRM row instead of the Lead sem nome placeholder', () => {
    const record = buildQuickAddRecord(business)

    expect(record).toEqual({
      placeId: 'ChIJ123',
      name: 'Academia Central',
      category: 'Academia',
      address: 'Rua A, 10, Santos - SP',
      city: 'Santos',
      state: 'SP',
      phone: '(13) 3333-1111',
      email: '',
      website: 'https://academia.example',
      openHours: 14,
    })
  })

  it('fills only blank CRM fields when backfilling a saved lead from its Place ID', () => {
    const mergeGooglePlaceData = Reflect.get(quickAdd, 'mergeGooglePlaceData') as (
      current: { name: string; address: string | null; phone: string | null; website: string | null; openHours: number | null },
      google: { name: string; address: string; phone: string; website: string; openHours: number | null },
    ) => { name: string; address: string; phone: string; website: string; openHours: number | null }

    expect(typeof mergeGooglePlaceData).toBe('function')
    expect(mergeGooglePlaceData(
      { name: 'Lead sem nome', address: null, phone: null, website: null, openHours: null },
      { name: 'Academia Central', address: 'Rua A, 10', phone: '(13) 3333-1111', website: 'https://academia.example', openHours: null },
    )).toEqual({ name: 'Academia Central', address: 'Rua A, 10', phone: '(13) 3333-1111', website: 'https://academia.example', openHours: null })

    expect(mergeGooglePlaceData(
      { name: 'Nome digitado', address: 'Endereço cadastrado', phone: null, website: 'https://crm.example', openHours: 8 },
      { name: 'Nome do Google', address: 'Rua Google', phone: '13999990000', website: 'https://google.example', openHours: 12 },
    )).toEqual({ name: 'Nome digitado', address: 'Endereço cadastrado', phone: '13999990000', website: 'https://crm.example', openHours: 8 })
  })
})
