import { NextResponse } from 'next/server'
import { getCurrentContext } from '@/lib/auth/context'
import { getGooglePlaceDetails } from '@/lib/google-places'
import { buildGooglePlacePreview, isPhotoNameForPlace, signGooglePhotoRequest } from '@/lib/prospect/place-preview'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: leadId } = await params
  const { supabase, organizationId } = await getCurrentContext()
  const { data: lead } = await supabase.from('leads').select('external_place_id').eq('id', leadId).eq('organization_id', organizationId).maybeSingle()
  const placeId = typeof lead?.external_place_id === 'string' ? lead.external_place_id : null
  if (!placeId) return NextResponse.json({ error: 'Esta oportunidade não está vinculada a um local do Google.' }, { status: 404, headers: { 'Cache-Control': 'private, no-store' } })

  try {
    const details = await getGooglePlaceDetails(placeId)
    if (details.id !== placeId) return NextResponse.json({ error: 'O local não pôde ser confirmado pelo Google.' }, { status: 502, headers: { 'Cache-Control': 'private, no-store' } })
    const preview = buildGooglePlacePreview(details, leadId)
    const photoName = details.photos?.find((photo) => photo.name && photo.googleMapsUri && isPhotoNameForPlace(placeId, photo.name))?.name
    if (preview.photoUrl && photoName) {
      const secret = process.env.GOOGLE_MAPS_API_KEY
      if (!secret) throw new Error('Google Places não está configurado.')
      preview.photoUrl += `&signature=${signGooglePhotoRequest(leadId, placeId, photoName, secret)}`
    }
    return NextResponse.json(preview, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } })
  } catch {
    return NextResponse.json({ error: 'Não foi possível carregar os dados do Google agora.' }, { status: 502, headers: { 'Cache-Control': 'private, no-store' } })
  }
}
