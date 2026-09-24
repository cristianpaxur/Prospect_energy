'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { createPublicClient } from '@/lib/supabase/public'
import {
  PUBLIC_CONSENT_TEXT,
  PUBLIC_CONSENT_VERSION,
  publicIntakeSchema,
  validatePublicInvoiceFile,
} from '@/lib/validations/public-intake'

type UploadAttempt = {
  submissionId: string
  uploadPath: string
  fileName: string
  mimeType: string
  fileSize: number
}

const consentLead = PUBLIC_CONSENT_TEXT.replace('Li a política de privacidade.', '')

export function PublicIntakeForm({ code, organizationName }: { code: string; organizationName: string }) {
  const [publicClient] = useState(createPublicClient)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [complete, setComplete] = useState(false)
  const [attempt, setAttempt] = useState<UploadAttempt | null>(null)
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || complete) return
    setError(null)

    const form = event.currentTarget
    const formData = new FormData(form)
    const parsed = publicIntakeSchema.safeParse({
      companyName: formData.get('companyName'),
      phone: formData.get('phone'),
      city: formData.get('city'),
      email: formData.get('email'),
      consent: Boolean(attempt) || formData.get('consent') === 'on',
    })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Confira os dados antes de continuar.')
      return
    }

    const file = form.querySelector<HTMLInputElement>('input[name="file"]')?.files?.[0] ?? null
    if (!file) {
      setError('Selecione a fatura em PDF, JPG ou PNG.')
      return
    }
    const fileError = validatePublicInvoiceFile(file)
    if (fileError) {
      setError(fileError)
      return
    }
    if (attempt && (attempt.fileName !== file.name || attempt.mimeType !== file.type || attempt.fileSize !== file.size)) {
      setError('Selecione o mesmo arquivo da tentativa anterior para continuar o envio.')
      return
    }

    setPending(true)
    try {
      let currentAttempt = attempt
      if (currentAttempt) {
        const finished = await publicClient.rpc('finish_public_intake', {
          p_submission_id: currentAttempt.submissionId,
          p_upload_path: currentAttempt.uploadPath,
        })
        if (!finished.error && finished.data === 'RECEBIDO') {
          setComplete(true)
          return
        }
      } else {
        const requestKey = idempotencyKey ?? globalThis.crypto.randomUUID()
        setIdempotencyKey(requestKey)
        const started = await publicClient.rpc('begin_public_intake', {
          p_code: code,
          p_company_name: parsed.data.companyName,
          p_phone: parsed.data.phone,
          p_city: parsed.data.city,
          p_email: parsed.data.email,
          p_consent: parsed.data.consent,
          p_consent_version: PUBLIC_CONSENT_VERSION,
          p_consent_text: PUBLIC_CONSENT_TEXT,
          p_file_name: file.name,
          p_mime_type: file.type,
          p_file_size: file.size,
          p_idempotency_key: requestKey,
        })
        const result = started.data?.[0]
        if (started.error || !result) {
          setError('Não foi possível iniciar o envio. Confira os dados e tente novamente.')
          return
        }
        currentAttempt = {
          submissionId: result.out_submission_id,
          uploadPath: result.out_upload_path,
          fileName: file.name,
          mimeType: file.type,
          fileSize: file.size,
        }
        setAttempt(currentAttempt)
      }

      const { error: uploadError } = await publicClient.storage.from('invoices').upload(currentAttempt.uploadPath, file, {
        contentType: file.type,
        upsert: false,
      })
      if (uploadError) {
        setError('Não foi possível enviar a fatura. Verifique sua conexão e tente novamente.')
        return
      }

      const finished = await publicClient.rpc('finish_public_intake', {
        p_submission_id: currentAttempt.submissionId,
        p_upload_path: currentAttempt.uploadPath,
      })
      if (finished.error || finished.data !== 'RECEBIDO') {
        setError('A fatura foi enviada, mas ainda não foi confirmada. Tente novamente para concluir.')
        return
      }
      setComplete(true)
    } catch {
      setError('Não foi possível concluir o envio agora. Confira sua conexão e tente novamente.')
    } finally {
      setPending(false)
    }
  }

  if (complete) {
    return <div className="notice" role="status">Recebemos sua solicitação para {organizationName}. O licenciado vai revisar as informações e poderá entrar em contato.</div>
  }

  return <form className="stack" aria-label="Captação pública" onSubmit={submit}>
    <label className="field"><span className="label">Empresa</span><input className="input" name="companyName" autoComplete="organization" maxLength={160} required readOnly={Boolean(attempt)} /></label>
    <div className="field-grid" style={{ gridTemplateColumns: 'repeat(2,minmax(0,1fr))' }}>
      <label className="field"><span className="label">Telefone</span><input className="input" name="phone" type="tel" autoComplete="tel" maxLength={32} required readOnly={Boolean(attempt)} /></label>
      <label className="field"><span className="label">Cidade</span><input className="input" name="city" autoComplete="address-level2" maxLength={120} required readOnly={Boolean(attempt)} /></label>
      <label className="field" style={{ gridColumn: '1 / -1' }}><span className="label">E-mail</span><input className="input" name="email" type="email" autoComplete="email" maxLength={254} required readOnly={Boolean(attempt)} /></label>
    </div>
    <label className="field"><span className="label">Fatura de energia</span><input className="input" name="file" type="file" accept="application/pdf,image/jpeg,image/png" required /><span className="company-address">PDF, JPG ou PNG · até 10 MB · arquivo privado</span></label>
    <div className="small muted" style={{ display: 'flex', alignItems: 'flex-start', gap: 9, lineHeight: 1.55 }}>
      <input id="public-intake-consent" type="checkbox" name="consent" required disabled={Boolean(attempt)} aria-describedby="public-intake-consent-help" style={{ marginTop: 2 }} />
      <div id="public-intake-consent-help"><label htmlFor="public-intake-consent">{consentLead}</label><Link className="auth-link" href="/privacidade">Li a política de privacidade</Link>.</div>
    </div>
    <p className="small muted">A simulação depende da revisão dos dados e não representa promessa de economia ou elegibilidade.</p>
    {attempt && <p className="small muted">Sua solicitação já foi registrada. A retentativa conclui o envio da fatura com os dados informados.</p>}
    {error && <div className="alert" role="alert">{error}</div>}
    <button className="btn btn-primary" type="submit" disabled={pending}>{pending ? 'Enviando com segurança…' : attempt ? 'Tentar novamente' : 'Enviar fatura e solicitar análise'}</button>
  </form>
}
