'use client'

import { useState, useTransition } from 'react'
import { Clipboard, Mail, MapPin, MessageCircle, Phone, Globe, PencilLine } from 'lucide-react'
import { recordContactAction } from '@/app/(app)/leads/actions'
import { Button } from '@/components/ui/button'
import { useGooglePlace } from '@/components/leads/google-place-provider'
import { renderTemplate, whatsappUrl } from '@/lib/messages'

export function QuickActions({ lead, licenseeName, licenseeCity, defaultMessage }: { lead: { id: string; name: string; phone: string | null; email: string | null; website: string | null; address: string | null }; licenseeName: string; licenseeCity: string; defaultMessage: string }) {
  const { preview } = useGooglePlace()
  const displayName = preview?.name || lead.name
  const phone = lead.phone || preview?.phone || null
  const website = lead.website || preview?.website || null
  const address = lead.address || preview?.address || null
  const generatedMessage = renderTemplate(defaultMessage, { nome_licenciado: licenseeName, nome_empresa: displayName, cidade: licenseeCity })
  const [message, setMessage] = useState(generatedMessage)
  const [messageEdited, setMessageEdited] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [, startTransition] = useTransition()

  function openExternal(url: string, action: string) {
    startTransition(() => { void recordContactAction(lead.id, action) })
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  async function copyData() {
    const text = [displayName, phone, lead.email, address, website].filter(Boolean).join('\n')
    await navigator.clipboard.writeText(text)
    setFeedback('Dados copiados.')
  }

  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || displayName)}`
  return <div className="stack quick-actions-stack">
    {(phone || lead.email) && <div className="lead-contact-details" aria-label="Dados de contato"><span>{phone || 'Telefone não informado'}</span>{lead.email && <span>{lead.email}</span>}</div>}
    <Button className="quick-action-whatsapp" type="button" size="lg" onClick={() => phone && openExternal(whatsappUrl(phone, messageEdited ? message : generatedMessage), 'WHATSAPP_ABERTO')} disabled={!phone}><MessageCircle size={17} /> Abrir conversa no WhatsApp</Button>
    <details className="quick-action-message"><summary><PencilLine size={14} /> Personalizar mensagem</summary><div className="quick-action-message-content"><label className="field"><span className="label">Mensagem que será aberta no WhatsApp</span><textarea className="textarea" value={messageEdited ? message : generatedMessage} onChange={(event) => { setMessage(event.target.value); setMessageEdited(true) }} /></label></div></details>
    <details className="quick-action-details"><summary>Outras formas de contato</summary><div className="grid quick-action-secondary-grid">
      <Button variant="secondary" type="button" onClick={() => phone && openExternal(`tel:${phone}`, 'LIGACAO_INICIADA')} disabled={!phone}><Phone size={15} /> Ligar</Button>
      <Button variant="secondary" type="button" onClick={() => lead.email && openExternal(`mailto:${lead.email}`, 'EMAIL_ABERTO')} disabled={!lead.email}><Mail size={15} /> E-mail</Button>
      <Button variant="secondary" type="button" onClick={() => void copyData()}><Clipboard size={15} /> Copiar dados</Button>
      <Button variant="secondary" type="button" onClick={() => website && openExternal(website, 'SITE_ABERTO')} disabled={!website}><Globe size={15} /> Abrir site</Button>
      <Button variant="secondary" type="button" onClick={() => openExternal(mapUrl, 'MAPA_ABERTO')}><MapPin size={15} /> Ver localização</Button>
    </div></details>
    {feedback && <span className="notice" role="status">{feedback}</span>}{!phone ? <p className="small muted" style={{ margin: 0 }}>Cadastre um telefone da empresa para habilitar WhatsApp e ligação.</p> : (!lead.email || !website) && <p className="small muted" style={{ margin: 0 }}>Algumas ações ficam disponíveis quando a empresa fornece e-mail ou site.</p>}</div>
}
