export type GooglePlace = {
  id?: string
  displayName?: { text?: string }
  formattedAddress?: string
  nationalPhoneNumber?: string
  websiteUri?: string
  googleMapsUri?: string
  rating?: number
  userRatingCount?: number
  location?: { latitude?: number; longitude?: number }
  regularOpeningHours?: { periods?: { open?: { day?: number; hour?: number; minute?: number }; close?: { day?: number; hour?: number; minute?: number } }[] }
  types?: string[]
}

export type ProspectBusiness = {
  placeId: string
  name: string
  category: string
  address: string
  city: string
  state: string
  latitude: number | null
  longitude: number | null
  rating: number | null
  reviewCount: number | null
  phone: string | null
  website: string | null
  hasPhone: boolean
  hasWebsite: boolean
  openHours: number | null
  googleMapsUri: string | null
}

const typeLabels: Record<string, string> = {
  gym: 'Academia', fitness_centre: 'Academia', health: 'Clínica', doctor: 'Clínica', hospital: 'Clínica',
  supermarket: 'Mercado', grocery_store: 'Mercado', bakery: 'Padaria', restaurant: 'Restaurante',
  hotel: 'Hotel', pharmacy: 'Farmácia', store: 'Loja', department_store: 'Loja',
}

function categoryFromTypes(types: string[] | undefined) {
  for (const type of types ?? []) if (typeLabels[type]) return typeLabels[type]
  return 'Outros'
}

function durationHours(open: GooglePlace['regularOpeningHours']) {
  const periods = open?.periods ?? []
  const durations = periods.flatMap((period) => {
    if (!period.open || !period.close) return []
    const start = (period.open.day ?? 0) * 24 + (period.open.hour ?? 0) + (period.open.minute ?? 0) / 60
    let end = (period.close.day ?? period.open.day ?? 0) * 24 + (period.close.hour ?? 0) + (period.close.minute ?? 0) / 60
    while (end < start) end += 24
    return [end - start]
  })
  return durations.length ? Math.round((durations.reduce((sum, value) => sum + value, 0) / new Set(periods.map((period) => period.open?.day).filter((day) => day !== undefined)).size) * 10) / 10 : null
}

export function toProspectBusiness(place: GooglePlace, location: { city: string; state: string }): ProspectBusiness {
  const category = categoryFromTypes(place.types)
  const phone = place.nationalPhoneNumber?.trim() || null
  const website = place.websiteUri?.trim() || null
  const openHours = durationHours(place.regularOpeningHours)
  return {
    placeId: place.id ?? '',
    name: place.displayName?.text?.trim() || 'Empresa sem nome',
    category,
    address: place.formattedAddress ?? '',
    city: location.city,
    state: location.state.toUpperCase(),
    latitude: place.location?.latitude ?? null,
    longitude: place.location?.longitude ?? null,
    rating: place.rating ?? null,
    reviewCount: place.userRatingCount ?? null,
    phone,
    website,
    hasPhone: Boolean(phone),
    hasWebsite: Boolean(website),
    openHours,
    googleMapsUri: place.googleMapsUri ?? null,
  }
}
