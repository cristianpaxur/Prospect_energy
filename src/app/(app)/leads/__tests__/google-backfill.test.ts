import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as leadActions from '../actions'

const mocks = vi.hoisted(() => ({
  getCurrentContext: vi.fn(),
  getGooglePlaceCrmDetails: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/auth/context', () => ({ getCurrentContext: mocks.getCurrentContext }))
vi.mock('@/lib/google-places', () => ({ getGooglePlaceCrmDetails: mocks.getGooglePlaceCrmDetails }))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))

describe('existing Google lead backfill', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches details once for each unnamed lead and saves the fields into its CRM row', async () => {
    const pendingLeads = [
      { id: 'lead-1', external_place_id: 'place-1', name: 'Lead sem nome', category: 'Academia', city: 'Santos', state: 'SP', address: null, phone: null, website: null, open_hours: null },
      { id: 'lead-2', external_place_id: 'place-2', name: 'Lead sem nome', category: 'Academia', city: 'Santos', state: 'SP', address: null, phone: null, website: null, open_hours: null },
    ]
    const saved: Array<{ values: Record<string, unknown>; filters: string[] }> = []
    const builder = {
      filters: [] as string[],
      updateValues: {} as Record<string, unknown>,
      select: vi.fn(() => builder),
      update: vi.fn((values: Record<string, unknown>) => { builder.updateValues = values; saved.push({ values, filters: builder.filters }); return builder }),
      eq: vi.fn((column: string) => { builder.filters.push(column); return builder }),
      not: vi.fn(() => builder),
      limit: vi.fn(async () => ({ data: pendingLeads, error: null })),
      then: (resolve: (result: { data: null; error: null }) => unknown) => Promise.resolve({ data: null, error: null }).then(resolve),
    }
    const supabase = { from: vi.fn(() => builder) }
    mocks.getCurrentContext.mockResolvedValue({ supabase, organizationId: 'org-1' })
    mocks.getGooglePlaceCrmDetails.mockImplementation(async (placeId: string) => ({
      id: placeId,
      displayName: { text: `Empresa ${placeId}` },
      formattedAddress: `Rua ${placeId}, Santos - SP`,
      nationalPhoneNumber: '(13) 3333-1111',
      websiteUri: 'https://empresa.example',
    }))

    const backfill = Reflect.get(leadActions, 'fillIncompleteGoogleLeadsAction') as () => Promise<{ updated: number; failed: number }>
    expect(typeof backfill).toBe('function')
    const result = await backfill()

    expect(result).toEqual({ updated: 2, failed: 0 })
    expect(mocks.getGooglePlaceCrmDetails).toHaveBeenCalledTimes(2)
    expect(saved.map(({ values }) => values)).toEqual([
      expect.objectContaining({ name: 'Empresa place-1', address: 'Rua place-1, Santos - SP', phone: '(13) 3333-1111', website: 'https://empresa.example' }),
      expect.objectContaining({ name: 'Empresa place-2', address: 'Rua place-2, Santos - SP', phone: '(13) 3333-1111', website: 'https://empresa.example' }),
    ])
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/leads')
  })
})
