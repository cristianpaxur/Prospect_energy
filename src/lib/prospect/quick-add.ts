export type QuickAddInput = {
  placeId: string
  name: string
  category: string
  city: string
  state: string
  address: string
  phone: string
  website: string
  openHours: number | null
}

export function buildQuickImportInput(input: QuickAddInput) {
  return {
    placeId: input.placeId,
    name: input.name.trim(),
    category: input.category,
    city: input.city.trim(),
    state: input.state.trim().toUpperCase(),
    address: input.address.trim(),
    phone: input.phone.trim(),
    website: input.website.trim(),
    openHours: input.openHours,
  }
}

export function buildQuickAddRecord(input: QuickAddInput) {
  return {
    placeId: input.placeId,
    name: input.name.trim(),
    category: input.category,
    address: input.address.trim(),
    city: input.city.trim(),
    state: input.state.trim().toUpperCase(),
    phone: input.phone.trim(),
    email: '',
    website: input.website.trim(),
    openHours: input.openHours,
  }
}

export function mergeGooglePlaceData(
  current: { name: string; address: string | null; phone: string | null; website: string | null; openHours: number | null },
  google: { name: string; address: string; phone: string; website: string; openHours: number | null },
) {
  return {
    name: !current.name.trim() || /^lead sem nome$/i.test(current.name.trim()) ? google.name.trim() || current.name : current.name,
    address: current.address?.trim() || google.address.trim(),
    phone: current.phone?.trim() || google.phone.trim(),
    website: current.website?.trim() || google.website.trim(),
    openHours: current.openHours ?? google.openHours,
  }
}
