'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { GooglePlacePreview } from '@/lib/prospect/place-preview'

type GooglePlaceContextValue = {
  enabled: boolean
  preview: GooglePlacePreview | null
  loading: boolean
  error: string
  refresh: () => Promise<void>
}

const GooglePlaceContext = createContext<GooglePlaceContextValue>({
  enabled: false,
  preview: null,
  loading: false,
  error: '',
  refresh: async () => {},
})

// Only coalesce concurrent requests (e.g. React Strict Mode); never retain a completed response.
const pendingRequests = new Map<string, Promise<GooglePlacePreview>>()

function fetchGooglePlace(leadId: string): Promise<GooglePlacePreview> {
  const endpoint = `/api/leads/${encodeURIComponent(leadId)}/google-place`
  const existing = pendingRequests.get(endpoint)
  if (existing) return existing

  const request = fetch(endpoint, { cache: 'no-store' }).then(async (response) => {
    const result = await response.json() as unknown
    if (!response.ok) {
      const apiError = result && typeof result === 'object' && 'error' in result && typeof result.error === 'string' ? result.error : ''
      throw new Error(apiError || 'Não foi possível consultar os dados do Google.')
    }
    return result as GooglePlacePreview
  })
  pendingRequests.set(endpoint, request)
  void request.finally(() => {
    if (pendingRequests.get(endpoint) === request) pendingRequests.delete(endpoint)
  }).catch(() => {})
  return request
}

export function GooglePlaceProvider({ leadId, enabled, autoLoad = true, children }: { leadId: string; enabled: boolean; autoLoad?: boolean; children: ReactNode }) {
  const [state, setState] = useState(() => ({ leadId, enabled, autoLoad, preview: null as GooglePlacePreview | null, loading: enabled && autoLoad, error: '' }))
  const isCurrentLead = state.leadId === leadId && state.enabled === enabled && state.autoLoad === autoLoad
  const preview = isCurrentLead ? state.preview : null
  const loading = enabled && (isCurrentLead ? state.loading : autoLoad)
  const error = isCurrentLead ? state.error : ''

  const refresh = useCallback(async () => {
    if (!enabled) return
    setState({ leadId, enabled, autoLoad, preview, loading: true, error: '' })
    try {
      const result = await fetchGooglePlace(leadId)
      setState({ leadId, enabled, autoLoad, preview: result, loading: false, error: '' })
    } catch (cause) {
      setState({ leadId, enabled, autoLoad, preview, loading: false, error: cause instanceof Error ? cause.message : 'Não foi possível consultar os dados do Google.' })
    }
  }, [autoLoad, enabled, leadId, preview])

  useEffect(() => {
    if (!enabled || !autoLoad) return

    let active = true
    void fetchGooglePlace(leadId).then((result) => {
      if (active) setState({ leadId, enabled, autoLoad, preview: result, loading: false, error: '' })
    }).catch((cause: unknown) => {
      if (active) setState({ leadId, enabled, autoLoad, preview: null, loading: false, error: cause instanceof Error ? cause.message : 'Não foi possível consultar os dados do Google.' })
    })
    return () => { active = false }
  }, [autoLoad, enabled, leadId])

  return <GooglePlaceContext.Provider value={{ enabled, preview, loading, error, refresh }}>{children}</GooglePlaceContext.Provider>
}

export function useGooglePlace() {
  return useContext(GooglePlaceContext)
}
