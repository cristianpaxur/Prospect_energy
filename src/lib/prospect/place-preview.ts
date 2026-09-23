import { createHmac, timingSafeEqual } from 'node:crypto'

export type GoogleAuthorAttribution = { displayName?: string; uri?: string; photoUri?: string }

export type GooglePlaceDetails = {
  id?: string
  displayName?: { text?: string }
  formattedAddress?: string
  nationalPhoneNumber?: string
  websiteUri?: string
  rating?: number
  googleMapsUri?: string
  photos?: { name?: string; googleMapsUri?: string; authorAttributions?: GoogleAuthorAttribution[] }[]
}

export type GooglePlacePreview = {
  name: string | null
  address: string | null
  phone: string | null
  website: string | null
  rating: number | null
  googleMapsUri: string | null
  photoUrl: string | null
  photoGoogleMapsUri: string | null
  photoAuthors: { name: string; uri: string | null; photoUri: string | null }[]
}

export function isPhotoNameForPlace(placeId: string, photoName: string) {
  const prefix = `places/${placeId}/photos/`
  if (!photoName.startsWith(prefix)) return false
  const photoId = photoName.slice(prefix.length)
  return /^[A-Za-z0-9_-]+$/.test(photoId)
}

export function buildGooglePlacePreview(place: GooglePlaceDetails, leadId: string) {
  const photo = place.photos?.find((candidate) => candidate.name && candidate.googleMapsUri && isPhotoNameForPlace(place.id ?? '', candidate.name))
  const photoAuthors = (photo?.authorAttributions ?? []).flatMap((author) => {
    const name = author.displayName?.trim()
    if (!name) return []
    return [{ name, uri: author.uri ?? null, photoUri: author.photoUri ?? null }]
  })

  const preview: GooglePlacePreview = {
    name: place.displayName?.text?.trim() || null,
    address: place.formattedAddress ?? null,
    phone: place.nationalPhoneNumber ?? null,
    website: place.websiteUri ?? null,
    rating: place.rating ?? null,
    googleMapsUri: place.googleMapsUri ?? null,
    photoUrl: photo ? `/api/leads/${encodeURIComponent(leadId)}/google-place/photo?name=${encodeURIComponent(photo.name!)}` : null,
    photoGoogleMapsUri: photo?.googleMapsUri ?? null,
    photoAuthors,
  }
  return preview
}

export function signGooglePhotoRequest(leadId: string, placeId: string, photoName: string, secret: string) {
  return createHmac('sha256', secret).update(`${leadId}\n${placeId}\n${photoName}`).digest('base64url')
}

export function verifyGooglePhotoRequest(leadId: string, placeId: string, photoName: string, signature: string, secret: string) {
  const expected = Buffer.from(signGooglePhotoRequest(leadId, placeId, photoName, secret))
  const received = Buffer.from(signature)
  return expected.length === received.length && timingSafeEqual(expected, received)
}
