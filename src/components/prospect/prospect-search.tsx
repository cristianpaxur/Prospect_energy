'use client'

import { useState, useTransition, type FormEvent } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, ChevronDown, LoaderCircle, MapPin, Plus, Search, Star } from 'lucide-react'
import { importProspectsAction, quickImportProspectAction } from '@/app/(app)/prospectar/actions'
import type { ProspectBusiness } from '@/lib/prospect/place-mapper'
import { buildQuickImportInput } from '@/lib/prospect/quick-add'
import type { ProspectFilters } from '@/lib/validations/prospect'

const categories = ['Academia', 'Mercado', 'Padaria', 'Restaurante', 'Hotel', 'Farmácia', 'Clínica', 'Loja', 'Outros']
const radii = [5, 10, 20, 30, 50]
type ManualLeadFields = { name: string; category: string; address: string; phone: string; email: string; website: string; openHours: string }
const crmFieldsFromBusiness = (business: ProspectBusiness): ManualLeadFields => ({ name: business.name, category: business.category, address: business.address, phone: business.phone ?? '', email: '', website: business.website ?? '', openHours: business.openHours?.toString() ?? '' })
const emptyLead = (): ManualLeadFields => ({ name: '', category: '', address: '', phone: '', email: '', website: '', openHours: '' })

export function ProspectSearch({ initialCity, initialState }: { initialCity: string; initialState: string }) {
  const [city, setCity] = useState(initialCity)
  const [state, setState] = useState(initialState || 'SP')
  const [category, setCategory] = useState('Academia')
  const [radiusKm, setRadiusKm] = useState(10)
  const [minRating, setMinRating] = useState('')
  const [hasPhone, setHasPhone] = useState(false)
  const [hasWebsite, setHasWebsite] = useState(false)
  const [openNow, setOpenNow] = useState(false)
  const [businesses, setBusinesses] = useState<ProspectBusiness[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [manualFields, setManualFields] = useState<Record<string, ManualLeadFields>>({})
  const [addedLeads, setAddedLeads] = useState<Record<string, string>>({})
  const [addingPlaceId, setAddingPlaceId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [isSearching, startSearch] = useTransition()
  const [isImporting, startImport] = useTransition()

  function search(event: FormEvent) {
    event.preventDefault()
    setError('')
    setFeedback('')
    setBusinesses([])
    setSelected([])
    setManualFields({})
    startSearch(async () => {
      const filters: ProspectFilters = { city, state, category: category as ProspectFilters['category'], radiusKm, minRating: minRating ? Number(minRating) : undefined, hasPhone, hasWebsite, openNow }
      try {
        const response = await fetch('/api/prospect/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(filters) })
        const result = await response.json() as { businesses?: ProspectBusiness[]; error?: string }
        if (!response.ok) throw new Error(result.error ?? 'Não foi possível concluir a busca.')
        setBusinesses(result.businesses ?? [])
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Não foi possível pesquisar empresas agora.')
      }
    })
  }

  function toggle(placeId: string) {
    if (selected.includes(placeId)) {
      setSelected(selected.filter((id) => id !== placeId))
      setManualFields((fields) => { const next = { ...fields }; delete next[placeId]; return next })
      return
    }
    setSelected([...selected, placeId])
    const business = businesses.find((item) => item.placeId === placeId)
    setManualFields((fields) => ({ ...fields, [placeId]: business ? crmFieldsFromBusiness(business) : { name: '', category: '', address: '', phone: '', email: '', website: '', openHours: '' } }))
  }

  function updateManualField(placeId: string, field: keyof ManualLeadFields, value: string) {
    setManualFields((current) => ({ ...current, [placeId]: { ...(current[placeId] ?? emptyLead()), [field]: value } }))
  }

  function importSelected(event: FormEvent) {
    event.preventDefault()
    const records = businesses.filter((business) => selected.includes(business.placeId)).map((business) => {
      const fields = manualFields[business.placeId] ?? crmFieldsFromBusiness(business)
      return { placeId: business.placeId, ...fields, openHours: fields.openHours || null, city: city.trim(), state: state.trim().toUpperCase() }
    })
    setError('')
    startImport(async () => {
      const result = await importProspectsAction(records)
      if ('error' in result) setError(result.error)
      else {
        setFeedback(`${result.created} empresa${result.created === 1 ? '' : 's'} adicionada${result.created === 1 ? '' : 's'} ao CRM${result.skipped ? ` · ${result.skipped} já estava${result.skipped === 1 ? '' : 'm'} cadastrada${result.skipped === 1 ? '' : 's'}` : ''}.`)
        setSelected([])
        setManualFields({})
      }
    })
  }

  function quickAdd(business: ProspectBusiness) {
    setError('')
    setAddingPlaceId(business.placeId)
    startImport(async () => {
      try {
      const result = await quickImportProspectAction(buildQuickImportInput({ placeId: business.placeId, name: business.name, category: business.category, city, state, address: business.address, phone: business.phone ?? '', website: business.website ?? '', openHours: business.openHours }))
        if (result.error) setError(result.error)
        else if (result.leadId) {
          setAddedLeads((current) => ({ ...current, [business.placeId]: result.leadId }))
          setFeedback(result.created ? 'Lead adicionado ao CRM.' : 'Esse local já estava no CRM.')
        } else setError('O cadastro foi criado, mas não foi possível abrir o lead.')
      } catch {
        setError('Não foi possível adicionar essa empresa ao CRM agora.')
      } finally {
        setAddingPlaceId(null)
      }
    })
  }

  const selectedCount = selected.length

  return <>
    <section className="card card-pad">
      <form onSubmit={search} className="stack">
        <div className="field-grid">
          <label className="field"><span className="label">Cidade</span><input className="input" value={city} onChange={(event) => setCity(event.target.value)} placeholder="Santos" required /></label>
          <label className="field"><span className="label">Estado</span><input className="input" value={state} onChange={(event) => setState(event.target.value.toUpperCase().slice(0, 2))} placeholder="SP" maxLength={2} required /></label>
          <label className="field"><span className="label">Segmento</span><span style={{ position: 'relative' }}><select className="select" value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={13} style={{ position: 'absolute', right: 12, top: 13, pointerEvents: 'none', color: '#76868b' }} /></span></label>
          <label className="field"><span className="label">Raio de busca</span><select className="select" value={radiusKm} onChange={(event) => setRadiusKm(Number(event.target.value))}>{radii.map((radius) => <option value={radius} key={radius}>{radius} km</option>)}</select></label>
          <label className="field"><span className="label">Avaliação mínima</span><select className="select" value={minRating} onChange={(event) => setMinRating(event.target.value)}><option value="">Qualquer avaliação</option><option value="3">3+ estrelas</option><option value="4">4+ estrelas</option><option value="4.5">4,5+ estrelas</option></select></label>
          <div className="field" style={{ alignContent: 'end' }}><button className="btn btn-primary" type="submit" disabled={isSearching}><Search size={15} />{isSearching ? 'Buscando…' : 'Buscar empresas'}</button></div>
        </div>
        <div className="divider" />
        <div className="small muted" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px 20px' }}><strong style={{ color: '#40545b' }}>Filtros adicionais</strong>
          <label style={{ display: 'flex', alignItems: 'center', gap: 7 }}><input type="checkbox" checked={hasPhone} onChange={(event) => setHasPhone(event.target.checked)} /> Apenas com telefone</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 7 }}><input type="checkbox" checked={hasWebsite} onChange={(event) => setHasWebsite(event.target.checked)} /> Apenas com site</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 7 }}><input type="checkbox" checked={openNow} onChange={(event) => setOpenNow(event.target.checked)} /> Abertas agora</label>
        </div>
      </form>
    </section>

    {error && <div className="alert section-gap" role="alert">{error}</div>}
    {feedback && <div className="notice section-gap" role="status">{feedback} {feedback.startsWith('0 empresas') ? null : <Link href="/pipeline" style={{ textDecoration: 'underline' }}>Ver pipeline</Link>}</div>}

    <section className="card section-gap">
      <div className="card-head"><div><h2 className="card-title">{businesses.length ? `${businesses.length} empresas encontradas` : 'Empresas da sua região'}</h2><p className="card-copy">Adicione direto pela linha ou selecione várias para preencher em lote.</p></div>{businesses.length > 0 && <Image src="https://storage.googleapis.com/geo-devrel-public-buckets/powered_by_google_on_white.png" alt="Powered by Google" width={120} height={17} unoptimized style={{ width: 120, height: 'auto' }} />}</div>
      {!businesses.length && !isSearching ? <div className="empty-state"><div><span className="empty-icon"><MapPin size={20} /></span><h3 className="empty-title">Encontre seu próximo cliente</h3><p className="empty-copy">Escolha uma cidade e segmento para pesquisar empresas reais no Google Maps.</p></div></div> : null}
      {isSearching && <div className="empty-state"><LoaderCircle size={22} className="animate-spin" color="#078251" /><p className="empty-copy">Pesquisando empresas na região…</p></div>}
      {businesses.length > 0 && <div className="table-wrap"><table className="table"><thead><tr><th><input type="checkbox" aria-label="Selecionar todos" checked={selected.length === businesses.length} onChange={(event) => { const selectedBusinesses = event.target.checked ? businesses : []; const ids = selectedBusinesses.map((business) => business.placeId); setSelected(ids); setManualFields(Object.fromEntries(selectedBusinesses.map((business) => [business.placeId, manualFields[business.placeId] ?? crmFieldsFromBusiness(business)]))) }} /></th><th>Empresa</th><th>Segmento</th><th>Avaliação</th><th>Contato exibido</th><th>Mapa</th><th>Ação</th></tr></thead><tbody>{businesses.map((business) => <tr key={business.placeId}><td><input type="checkbox" aria-label={`Selecionar ${business.name}`} checked={selected.includes(business.placeId)} onChange={() => toggle(business.placeId)} /></td><td><div className="company-name">{business.name}</div><div className="company-address">{business.address}</div></td><td>{business.category}</td><td>{business.rating ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Star size={13} fill="#f5ae37" color="#f5ae37" /> {business.rating.toFixed(1)} <span className="muted">({business.reviewCount ?? 0})</span></span> : '—'}</td><td><div>{business.phone ?? 'Sem telefone'}</div><div className="company-address">{business.website ? 'Site disponível' : 'Sem site'}</div></td><td>{business.googleMapsUri ? <a className="auth-link small" href={business.googleMapsUri} target="_blank" rel="noreferrer">Abrir Maps</a> : '—'}</td><td>{addedLeads[business.placeId] ? <Link className="auth-link small" href={`/leads/${addedLeads[business.placeId]}`}>No CRM · abrir</Link> : <button className="btn btn-secondary" type="button" onClick={() => quickAdd(business)} disabled={isImporting}><Plus size={13} />{addingPlaceId === business.placeId ? 'Adicionando…' : 'Adicionar'}</button>}</td></tr>)}</tbody></table></div>}
      {selectedCount > 0 && <form className="stack" onSubmit={importSelected} style={{ borderTop: '1px solid #edf0f1', padding: 16 }}><div><h3 className="card-title">Dados da empresa para o CRM</h3><p className="card-copy">Os campos vêm preenchidos pela busca e podem ser revisados antes de salvar.</p></div>{businesses.filter((business) => selected.includes(business.placeId)).map((business) => <div className="card card-pad stack" key={business.placeId}><div className="small muted">ID do local salvo para evitar duplicidade: {business.placeId}</div><div className="field-grid"><label className="field"><span className="label">Nome no CRM</span><input className="input" value={manualFields[business.placeId]?.name ?? ''} onChange={(event) => updateManualField(business.placeId, 'name', event.target.value)} placeholder="Digite o nome da empresa" required /></label><label className="field"><span className="label">Segmento</span><select className="select" value={manualFields[business.placeId]?.category ?? ''} onChange={(event) => updateManualField(business.placeId, 'category', event.target.value)} required><option value="">Selecione</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></label><label className="field"><span className="label">Telefone (opcional)</span><input className="input" value={manualFields[business.placeId]?.phone ?? ''} onChange={(event) => updateManualField(business.placeId, 'phone', event.target.value)} placeholder="(13) 99999-9999" /></label><label className="field"><span className="label">E-mail (opcional)</span><input className="input" type="email" value={manualFields[business.placeId]?.email ?? ''} onChange={(event) => updateManualField(business.placeId, 'email', event.target.value)} /></label><label className="field"><span className="label">Site (opcional)</span><input className="input" type="url" value={manualFields[business.placeId]?.website ?? ''} onChange={(event) => updateManualField(business.placeId, 'website', event.target.value)} placeholder="https://" /></label><label className="field"><span className="label">Endereço (opcional)</span><input className="input" value={manualFields[business.placeId]?.address ?? ''} onChange={(event) => updateManualField(business.placeId, 'address', event.target.value)} /></label><label className="field"><span className="label">Horas abertas por dia (opcional)</span><input className="input" type="number" min="0" max="24" step="0.5" value={manualFields[business.placeId]?.openHours ?? ''} onChange={(event) => updateManualField(business.placeId, 'openHours', event.target.value)} /></label></div></div>)}<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}><span className="small muted">{selectedCount} selecionada{selectedCount === 1 ? '' : 's'} · cidade/estado vêm dos filtros digitados acima</span><button className="btn btn-primary" type="submit" disabled={isImporting}>{isImporting ? <LoaderCircle size={15} className="animate-spin" /> : <Plus size={15} />}{isImporting ? 'Adicionando…' : 'Adicionar ao CRM'} <ArrowRight size={14} /></button></div></form>}
    </section>
  </>
}
