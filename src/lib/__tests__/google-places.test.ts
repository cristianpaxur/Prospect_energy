import { afterEach, describe, expect, it, vi } from 'vitest'
import * as googlePlaces from '../google-places'
import { toProspectBusiness } from '../prospect/place-mapper'

vi.mock('server-only', () => ({}))

afterEach(() => vi.unstubAllGlobals())

describe('Google Places mapper', () => {
  it('maps the provider payload into the application business shape', () => {
    expect(toProspectBusiness({
      id: 'ChIJ1',
      displayName: { text: 'Academia Centro' },
      rating: 4.7,
      userRatingCount: 312,
      nationalPhoneNumber: '(13) 3222-1111',
      websiteUri: 'https://academiacentro.example', googleMapsUri: 'https://maps.google.com/?cid=1',
      formattedAddress: 'Rua A, 10, Santos - SP',
      location: { latitude: -23.96, longitude: -46.33 },
      regularOpeningHours: { periods: [{ open: { day: 1, hour: 8 }, close: { day: 1, hour: 22 } }] },
      types: ['gym'],
    }, { city: 'Santos', state: 'SP' })).toMatchObject({
      placeId: 'ChIJ1', name: 'Academia Centro', category: 'Academia', rating: 4.7, hasPhone: true, openHours: 14, googleMapsUri: 'https://maps.google.com/?cid=1',
    })
  })

  it('requests only the fields needed to backfill the CRM, without photo or rating fields', async () => {
    const getGooglePlaceCrmDetails = Reflect.get(googlePlaces, 'getGooglePlaceCrmDetails') as (placeId: string) => Promise<unknown>
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'ChIJ123', displayName: { text: 'Academia Central' } }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const previousApiKey = process.env.GOOGLE_MAPS_API_KEY
    process.env.GOOGLE_MAPS_API_KEY = 'test-key'

    try {
      await getGooglePlaceCrmDetails('ChIJ123')
      expect(fetchMock).toHaveBeenCalledWith('https://places.googleapis.com/v1/places/ChIJ123', expect.objectContaining({
        cache: 'no-store',
        headers: expect.objectContaining({
          'X-Goog-Api-Key': 'test-key',
          'X-Goog-FieldMask': 'id,displayName,formattedAddress,nationalPhoneNumber,websiteUri',
        }),
      }))
    } finally {
      if (previousApiKey === undefined) delete process.env.GOOGLE_MAPS_API_KEY
      else process.env.GOOGLE_MAPS_API_KEY = previousApiKey
    }
  })
})
