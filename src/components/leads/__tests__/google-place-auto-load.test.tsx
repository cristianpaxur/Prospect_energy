import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LeadHeader } from '../lead-header'
import { GooglePlacePanel } from '../google-place-panel'
import { GooglePlaceProvider } from '../google-place-provider'
import { QuickActions } from '../quick-actions'
import type { LeadRow } from '@/lib/leads/queries'

vi.mock('@/app/(app)/leads/actions', () => ({ recordContactAction: vi.fn() }))

const placePreview = {
  name: 'Trend The Wellness Club - Gonzaga',
  address: 'Av. Mal. Deodoro, 92 - Gonzaga, Santos - SP',
  phone: '(13) 98111-7870',
  website: 'https://trend.example',
  rating: 4.7,
  googleMapsUri: 'https://maps.google.com/?cid=123',
  photoUrl: '/api/leads/lead-42/google-place/photo?name=places%2Fplace-123%2Fphotos%2Fphoto-token',
  photoGoogleMapsUri: 'https://maps.google.com/photo/123',
  photoAuthors: [{ name: 'Google Maps contributor', uri: 'https://maps.google.com/contrib/123', photoUri: null }],
}

const lead = {
  id: 'lead-42',
  name: 'Lead sem nome',
  category: 'Academia',
  city: 'Santos',
  state: 'SP',
  phone: null,
  email: null,
  website: null,
  address: null,
  open_hours: null,
  score: 30,
  pipeline_status: 'NOVO',
  created_at: '2026-09-22T12:00:00.000Z',
  updated_at: '2026-09-22T12:00:00.000Z',
  external_place_id: 'place-123',
} satisfies LeadRow

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Google place data on the lead page', () => {
  it('loads the company details automatically and exposes them to the lead fiche without a click', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(placePreview), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    render(<GooglePlaceProvider leadId="lead-42" enabled>
      <LeadHeader lead={lead} />
      <GooglePlacePanel />
      <QuickActions lead={{ id: lead.id, name: lead.name, phone: lead.phone, email: lead.email, website: lead.website, address: lead.address }} licenseeName="Cristian" licenseeCity="Santos" defaultMessage="Olá, {{nome_empresa}}!" />
    </GooglePlaceProvider>)

    expect(await screen.findByRole('heading', { level: 1, name: placePreview.name })).toBeTruthy()
    expect(screen.getAllByText(placePreview.address)).toHaveLength(2)
    expect(screen.getAllByText(placePreview.phone)).toHaveLength(2)
    expect(screen.getByRole('img', { name: `Foto de capa de ${placePreview.name}` })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Ver esta foto no Google Maps' })).toBeTruthy()
    expect(await screen.findByDisplayValue(`Olá, ${placePreview.name}!`)).toBeTruthy()
    expect((screen.getByRole('button', { name: /WhatsApp/ }) as HTMLButtonElement).disabled).toBe(false)
    expect(fetchMock).toHaveBeenCalledWith('/api/leads/lead-42/google-place', { cache: 'no-store' })
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('button', { name: 'Carregar ficha e foto do Google' })).toBeNull()
  })

  it('does not query Google on lead-page load when CRM data is already persisted', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(placePreview), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    render(<GooglePlaceProvider leadId="lead-42" enabled autoLoad={false}>
      <LeadHeader lead={lead} />
      <GooglePlacePanel />
    </GooglePlaceProvider>)

    expect(screen.getByRole('heading', { level: 1, name: 'Lead sem nome' })).toBeTruthy()
    expect(await screen.findByRole('button', { name: 'Carregar ficha e foto do Google' })).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Carregar ficha e foto do Google' }))
    expect(await screen.findByRole('heading', { level: 1, name: placePreview.name })).toBeTruthy()
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
  })
})
