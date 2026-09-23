import { NextResponse } from 'next/server'
import { getCurrentContext } from '@/lib/auth/context'
import { getGooglePlacePhoto } from '@/lib/google-places'
import { isPhotoNameForPlace, verifyGooglePhotoRequest } from '@/lib/prospect/place-preview'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: leadId } = await params
  const url = new URL(request.url)
  const photoName = url.searchParams.get('name') ?? ''
  const signature = url.searchParams.get('signature') ?? ''
  const { supabase, organizationId } = await getCurrentContext()
  const { data: lead } = await supabase.from('leads').select('external_place_id').eq('id', leadId).eq('organization_id', organizationId).maybeSingle()
  const placeId = typeof lead?.external_place_id === 'string' ? lead.external_place_id : null
  const key = process.env.GOOGLE_MAPS_API_KEY

  if (!placeId || !key || !isPhotoNameForPlace(placeId, photoName) || !verifyGooglePhotoRequest(leadId, placeId, photoName, signature, key)) {
    return NextResponse.json({ error: 'A foto solicitada não é válida para este lead.' }, { status: 403, headers: { 'Cache-Control': 'private, no-store' } })
  }

  try {
    const upstream = await getGooglePlacePhoto(photoName)
    const contentType = upstream.headers.get('content-type') ?? ''
    if (!upstream.ok || !/^image\/(jpeg|png|gif|webp)$/i.test(contentType) || !upstream.body) {
      return NextResponse.json({ error: 'Não foi possível carregar a foto do Google.' }, { status: 502, headers: { 'Cache-Control': 'private, no-store' } })
    }
    return new Response(upstream.body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Não foi possível carregar a foto do Google agora.' }, { status: 502, headers: { 'Cache-Control': 'private, no-store' } })
  }
}
