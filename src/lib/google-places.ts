import 'server-only'
import type { ProspectFilters } from '@/lib/validations/prospect'
import { toProspectBusiness, type GooglePlace, type ProspectBusiness } from '@/lib/prospect/place-mapper'
import type { GooglePlaceDetails } from '@/lib/prospect/place-preview'

const placeTypes: Record<ProspectFilters['category'], string | undefined> = {
  Academia: 'gym', Mercado: 'supermarket', Padaria: 'bakery', Restaurante: 'restaurant',
  Hotel: 'hotel', Farmácia: 'pharmacy', Clínica: 'medical_clinic', Loja: 'store', Outros: undefined,
}

type GoogleResponse<T> = { status?: string; results?: T[]; places?: T[]; error_message?: string }

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(12000), cache: 'no-store' })
  const data = await response.json() as T
  if (!response.ok) throw new Error(`Google Maps respondeu com HTTP ${response.status}.`)
  return data
}

async function geocodeCity(city: string, state: string, key: string) {
  const query = new URLSearchParams({ address: `${city}, ${state}, Brasil`, components: 'country:BR', key })
  const data = await fetchJson<GoogleResponse<{ geometry?: { location?: { lat?: number; lng?: number } } }>>(`https://maps.googleapis.com/maps/api/geocode/json?${query}`)
  const coordinates = data.results?.[0]?.geometry?.location
  if (data.status !== 'OK' || coordinates?.lat === undefined || coordinates.lng === undefined) {
    throw new Error(data.error_message || 'Não foi possível localizar essa cidade. Confira cidade e estado.')
  }
  return { latitude: coordinates.lat, longitude: coordinates.lng }
}

function distanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const radians = (degrees: number) => degrees * Math.PI / 180
  const dLat = radians(b.latitude - a.latitude)
  const dLng = radians(b.longitude - a.longitude)
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value))
}

export async function searchBusinesses(filters: ProspectFilters): Promise<ProspectBusiness[]> {
  const key = process.env.GOOGLE_MAPS_API_KEY
  if (!key) throw new Error('Configure GOOGLE_MAPS_API_KEY para pesquisar empresas.')
  const center = await geocodeCity(filters.city, filters.state, key)
  const textQuery = `${filters.category === 'Outros' ? 'empresas' : filters.category} em ${filters.city}, ${filters.state}, Brasil`
  const body = {
    textQuery,
    languageCode: 'pt-BR',
    regionCode: 'BR',
    pageSize: 20,
    maxResultCount: 20,
    includedType: placeTypes[filters.category],
    strictTypeFiltering: Boolean(placeTypes[filters.category]),
    openNow: filters.openNow || undefined,
    minRating: filters.minRating,
    locationBias: { circle: { center: { latitude: center.latitude, longitude: center.longitude }, radius: filters.radiusKm * 1000 } },
  }
  const fieldMask = [
    'places.id', 'places.displayName', 'places.formattedAddress', 'places.location', 'places.rating', 'places.userRatingCount', 'places.googleMapsUri',
    'places.nationalPhoneNumber', 'places.websiteUri', 'places.regularOpeningHours', 'places.types',
  ].join(',')

  const result = await fetchJson<GoogleResponse<GooglePlace>>('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': fieldMask },
    body: JSON.stringify(body),
  })

  return (result.places ?? []).filter((place) => place.id && place.location?.latitude !== undefined && place.location.longitude !== undefined)
    .map((place) => toProspectBusiness(place, { city: filters.city, state: filters.state }))
    .filter((place) => distanceKm(center, { latitude: place.latitude!, longitude: place.longitude! }) <= filters.radiusKm)
    .filter((place) => !filters.hasPhone || place.hasPhone)
    .filter((place) => !filters.hasWebsite || place.hasWebsite)
    .filter((place) => filters.minRating === undefined || (place.rating ?? 0) >= filters.minRating)
}

export async function getGooglePlaceDetails(placeId: string) {
  const key = process.env.GOOGLE_MAPS_API_KEY
  if (!key) throw new Error('Google Places não está configurado.')
  const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`
  return fetchJson<GooglePlaceDetails>(url, {
    headers: {
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'id,displayName,formattedAddress,nationalPhoneNumber,websiteUri,rating,googleMapsUri,photos.name,photos.googleMapsUri,photos.authorAttributions',
    },
  })
}

export async function getGooglePlaceCrmDetails(placeId: string) {
  const key = process.env.GOOGLE_MAPS_API_KEY
  if (!key) throw new Error('Google Places não está configurado.')
  const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`
  return fetchJson<GooglePlaceDetails>(url, {
    headers: {
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'id,displayName,formattedAddress,nationalPhoneNumber,websiteUri',
    },
  })
}

export async function getGooglePlacePhoto(photoName: string) {
  const key = process.env.GOOGLE_MAPS_API_KEY
  if (!key) throw new Error('Google Places não está configurado.')
  const query = new URLSearchParams({ maxHeightPx: '900', maxWidthPx: '1600', key })
  const url = `https://places.googleapis.com/v1/${photoName}/media?${query}`
  return fetch(url, { signal: AbortSignal.timeout(12000), cache: 'no-store', redirect: 'follow' })
}
