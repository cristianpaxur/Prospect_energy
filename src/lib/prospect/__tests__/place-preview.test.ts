import { describe, expect, it } from 'vitest'
import { buildGooglePlacePreview, isPhotoNameForPlace, signGooglePhotoRequest, verifyGooglePhotoRequest } from '../place-preview'

describe('live Google place preview', () => {
  it('keeps the Google name, contacts, photo reference and attributions in a transient display model', () => {
    const preview = buildGooglePlacePreview({
      id: 'ChIJ123',
      displayName: { text: 'Academia Central' },
      formattedAddress: 'Rua A, 10, Santos - SP',
      nationalPhoneNumber: '+55 13 3333-1111',
      websiteUri: 'https://academia.example',
      rating: 4.7,
      googleMapsUri: 'https://maps.google.com/?cid=123',
      photos: [{
        name: 'places/ChIJ123/photos/PHOTO_TOKEN',
        googleMapsUri: 'https://maps.google.com/photo/123',
        authorAttributions: [{ displayName: 'Maria Silva', uri: 'https://maps.google.com/contrib/123', photoUri: 'https://example/avatar.jpg' }],
      }],
    }, 'lead-1')

    expect(preview).toEqual({
      name: 'Academia Central',
      address: 'Rua A, 10, Santos - SP',
      phone: '+55 13 3333-1111',
      website: 'https://academia.example',
      rating: 4.7,
      googleMapsUri: 'https://maps.google.com/?cid=123',
      photoUrl: '/api/leads/lead-1/google-place/photo?name=places%2FChIJ123%2Fphotos%2FPHOTO_TOKEN',
      photoGoogleMapsUri: 'https://maps.google.com/photo/123',
      photoAuthors: [{ name: 'Maria Silva', uri: 'https://maps.google.com/contrib/123', photoUri: 'https://example/avatar.jpg' }],
    })
  })

  it('omits the cover image when Google has no photo and rejects photo references for a different place', () => {
    expect(buildGooglePlacePreview({ id: 'ChIJ123' }, 'lead-1').photoUrl).toBeNull()
    expect(isPhotoNameForPlace('ChIJ123', 'places/OTHER/photos/TOKEN')).toBe(false)
    expect(isPhotoNameForPlace('ChIJ123', 'places/ChIJ123/photos/TOKEN')).toBe(true)
  })

  it('signs a photo proxy request for the exact lead, place and photo without exposing the API key', () => {
    const signature = signGooglePhotoRequest('lead-1', 'ChIJ123', 'places/ChIJ123/photos/TOKEN', 'private-google-key')

    expect(verifyGooglePhotoRequest('lead-1', 'ChIJ123', 'places/ChIJ123/photos/TOKEN', signature, 'private-google-key')).toBe(true)
    expect(verifyGooglePhotoRequest('lead-2', 'ChIJ123', 'places/ChIJ123/photos/TOKEN', signature, 'private-google-key')).toBe(false)
    expect(verifyGooglePhotoRequest('lead-1', 'ChIJ123', 'places/ChIJ123/photos/OTHER', signature, 'private-google-key')).toBe(false)
  })
})
