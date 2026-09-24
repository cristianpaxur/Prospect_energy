import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PUBLIC_CONSENT_TEXT } from '@/lib/validations/public-intake'
import { PublicIntakeForm } from '../public-intake-form'

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), upload: vi.fn() }))

vi.mock('@/lib/supabase/public', () => ({
  createPublicClient: () => ({
    rpc: mocks.rpc,
    storage: { from: () => ({ upload: mocks.upload }) },
  }),
}))

function renderForm() {
  return render(<PublicIntakeForm code="public-link-code" organizationName="Workspace Campinas" />)
}

function fillForm(consent = true) {
  fireEvent.change(screen.getByLabelText('Empresa'), { target: { value: 'Mercado Central' } })
  fireEvent.change(screen.getByLabelText('Telefone'), { target: { value: '(11) 98765-4321' } })
  fireEvent.change(screen.getByLabelText('Cidade'), { target: { value: 'Campinas' } })
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'contato@mercado.example' } })
  fireEvent.change(screen.getByLabelText(/Fatura de energia/), {
    target: { files: [new File(['%PDF-1.4 test'], 'conta.pdf', { type: 'application/pdf' })] },
  })
  if (consent) fireEvent.click(screen.getByRole('checkbox'))
}

describe('public intake form', () => {
  beforeEach(() => {
    mocks.rpc.mockReset()
    mocks.upload.mockReset()
  })

  afterEach(() => cleanup())

  it('requires consent before creating an opportunity', async () => {
    renderForm()
    fillForm(false)
    fireEvent.submit(screen.getByRole('form', { name: 'Captação pública' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/autorize/i)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it('uploads the invoice directly and confirms only after the public RPC completes', async () => {
    mocks.rpc.mockImplementation(async (name: string) => name === 'begin_public_intake'
      ? { data: [{ out_submission_id: 'submission-1', out_upload_path: 'org/lead/file.pdf' }], error: null }
      : { data: 'RECEBIDO', error: null })
    mocks.upload.mockResolvedValue({ error: null })

    renderForm()
    fillForm()
    fireEvent.submit(screen.getByRole('form', { name: 'Captação pública' }))

    expect(await screen.findByRole('status')).toHaveTextContent(/recebemos sua solicitação/i)
    expect(mocks.rpc).toHaveBeenCalledWith('begin_public_intake', expect.objectContaining({
      p_code: 'public-link-code',
      p_company_name: 'Mercado Central',
      p_consent: true,
      p_consent_text: PUBLIC_CONSENT_TEXT,
      p_file_name: 'conta.pdf',
      p_mime_type: 'application/pdf',
    }))
    expect(mocks.upload).toHaveBeenCalledWith('org/lead/file.pdf', expect.any(File), expect.objectContaining({ upsert: false }))
    expect(mocks.rpc).toHaveBeenLastCalledWith('finish_public_intake', {
      p_submission_id: 'submission-1',
      p_upload_path: 'org/lead/file.pdf',
    })
  })

  it('retries a failed upload using the same opportunity and idempotency key', async () => {
    let finishCalls = 0
    mocks.rpc.mockImplementation(async (name: string) => {
      if (name === 'begin_public_intake') return { data: [{ out_submission_id: 'submission-1', out_upload_path: 'org/lead/file.pdf' }], error: null }
      finishCalls += 1
      return finishCalls === 1 ? { data: null, error: { message: 'File not uploaded yet' } } : { data: 'RECEBIDO', error: null }
    })
    mocks.upload.mockResolvedValueOnce({ error: { message: 'Storage unavailable' } }).mockResolvedValueOnce({ error: null })

    renderForm()
    fillForm()
    const form = screen.getByRole('form', { name: 'Captação pública' })
    fireEvent.submit(form)
    expect(await screen.findByRole('alert')).toHaveTextContent(/tente novamente/i)
    expect(screen.getByLabelText('Empresa')).toHaveProperty('readOnly', true)
    expect(screen.getByRole('checkbox')).toBeDisabled()
    fireEvent.submit(form)

    expect(await screen.findByRole('status')).toHaveTextContent(/recebemos sua solicitação/i)
    expect(mocks.rpc.mock.calls.filter(([name]) => name === 'begin_public_intake')).toHaveLength(1)
    await waitFor(() => expect(mocks.upload).toHaveBeenCalledTimes(2))
  })
})
