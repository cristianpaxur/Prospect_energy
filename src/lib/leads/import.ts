export type ImportLead = {
  placeId: string
  name: string
  category: string
  address: string
  city: string
  state: string
  phone: string
  email: string
  website: string
  openHours: number | null
  fingerprint: string
}
export type ImportResult = { created: number; skipped: number }

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ')
}

export function buildLeadFingerprint(input: { placeId?: string; name: string; address: string; city?: string; state?: string }) {
  if (input.placeId) return `place:${input.placeId}`
  return [input.name, input.address, input.city, input.state].map((value) => normalize(value ?? '')).filter(Boolean).join('|')
}

export function createImportService(repository: { createOnce: (lead: ImportLead) => Promise<boolean> }) {
  return async function importProspects(businesses: Omit<ImportLead, 'fingerprint'>[]): Promise<ImportResult> {
    let created = 0
    let skipped = 0
    const seen = new Set<string>()
    for (const business of businesses) {
      const fingerprint = buildLeadFingerprint(business)
      const dedupeKey = business.placeId || fingerprint
      if (seen.has(dedupeKey)) { skipped += 1; continue }
      seen.add(dedupeKey)
      const wasCreated = await repository.createOnce({ ...business, fingerprint })
      if (wasCreated) created += 1
      else skipped += 1
    }
    return { created, skipped }
  }
}
