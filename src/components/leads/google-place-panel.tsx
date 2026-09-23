'use client'

import Image from 'next/image'
import { LoaderCircle, MapPin, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { useGooglePlace } from '@/components/leads/google-place-provider'

const googleLogo = 'https://storage.googleapis.com/geo-devrel-public-buckets/powered_by_google_on_white.png'

export function GooglePlacePanel() {
  const { enabled, preview, loading, error, refresh } = useGooglePlace()
  const [photoFailed, setPhotoFailed] = useState(false)

  if (!enabled) return null

  return <section className="card card-pad stack" aria-label="Dados ao vivo do Google">
    <div className="card-head" style={{ padding: 0 }}>
      <div><h2 className="card-title">Dados e foto de capa</h2><p className="card-copy">Os dados salvos no CRM aparecem sem nova consulta; consulte o Google ao vivo quando precisar.</p></div>
      <Image src={googleLogo} alt="Powered by Google" width={120} height={17} unoptimized style={{ width: 120, height: 'auto' }} />
    </div>
    <div className="small muted">A consulta ao vivo e a foto podem gerar cobranças da API do Google Maps Platform. Os dados importados são salvos no CRM.</div>
    <button type="button" className="btn btn-secondary" onClick={() => { setPhotoFailed(false); void refresh() }} disabled={loading}>
      {loading ? <LoaderCircle size={15} className="animate-spin" /> : <RefreshCw size={15} />}
      {loading ? 'Consultando o Google…' : preview ? 'Atualizar ficha ao vivo' : 'Carregar ficha e foto do Google'}
    </button>
    {loading && <div className="notice" role="status"><LoaderCircle size={15} className="animate-spin" /> Carregando nome, contato e foto da empresa…</div>}
    {error && <div className="alert" role="alert"><span>{error}</span><button type="button" className="btn btn-secondary" onClick={() => void refresh()} disabled={loading}>Tentar novamente</button></div>}
    {preview && <div className="stack" aria-live="polite">
      {preview.photoUrl && !photoFailed ? <div style={{ overflow: 'hidden', borderRadius: 9, border: '1px solid #e6ecee', background: '#f4f7f7' }}>
        <Image src={preview.photoUrl} alt={preview.name ? `Foto de capa de ${preview.name}` : 'Foto de capa do local'} width={1600} height={900} unoptimized onError={() => setPhotoFailed(true)} style={{ display: 'block', width: '100%', height: 'auto', maxHeight: 290, objectFit: 'cover' }} />
        <div className="small" style={{ padding: '9px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>{preview.photoAuthors.length ? <>Foto por {preview.photoAuthors.map((author, index) => <span key={`${author.name}-${index}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>{index ? ', ' : ''}{author.uri ? <a className="auth-link" href={author.uri.startsWith('//') ? `https:${author.uri}` : author.uri} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>{author.photoUri && <Image src={author.photoUri.startsWith('//') ? `https:${author.photoUri}` : author.photoUri} alt="" width={20} height={20} unoptimized style={{ borderRadius: '50%' }} />}{author.name}</a> : author.name}</span>)}</> : 'Foto do Google Maps'}</span>
          {preview.photoGoogleMapsUri && <a className="auth-link" href={preview.photoGoogleMapsUri} target="_blank" rel="noreferrer">Ver esta foto no Google Maps</a>}
        </div>
      </div> : <div className="empty-state" style={{ minHeight: 95, padding: 16 }}><div><span className="empty-icon"><MapPin size={18} /></span><p className="empty-copy">{photoFailed ? 'A foto expirou ou não pôde ser carregada. Atualize a ficha para buscar outra.' : 'O Google não disponibilizou uma foto de capa para este local.'}</p></div></div>}
      <div><h3 className="card-title" style={{ marginBottom: 4 }}>{preview.name ?? 'Nome não disponível'}</h3>{preview.rating !== null && <p className="small muted" style={{ margin: 0 }}>★ {preview.rating.toFixed(1)} · avaliação do Google</p>}</div>
      <div className="field-grid" style={{ gridTemplateColumns: 'repeat(2,minmax(0,1fr))' }}>
        <div><span className="label">Endereço do Google</span><div className="small">{preview.address || 'Não disponível'}</div></div>
        <div><span className="label">Telefone do Google</span><div className="small">{preview.phone || 'Não disponível'}</div></div>
        <div><span className="label">Site do Google</span><div className="small">{preview.website ? <a className="auth-link" href={preview.website} target="_blank" rel="noreferrer">Abrir site</a> : 'Não disponível'}</div></div>
        <div><span className="label">Origem</span><div className="small">{preview.googleMapsUri ? <a className="auth-link" href={preview.googleMapsUri} target="_blank" rel="noreferrer">Abrir local no Maps</a> : 'Google Maps'}</div></div>
      </div>
      <p className="small muted" style={{ margin: 0 }}>Esses dados podem mudar. Edite os campos do CRM separadamente para salvar informações fornecidas por você.</p>
    </div>}
  </section>
}
