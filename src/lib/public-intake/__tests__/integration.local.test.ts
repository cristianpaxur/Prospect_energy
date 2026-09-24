import { randomUUID } from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { afterAll, describe, expect, it } from 'vitest'
import type { Database } from '@/lib/supabase/database'
import { PUBLIC_CONSENT_TEXT, PUBLIC_CONSENT_VERSION } from '@/lib/validations/public-intake'

const supabaseUrl = process.env.PUBLIC_INTAKE_TEST_URL
const anonKey = process.env.PUBLIC_INTAKE_TEST_ANON_KEY
const localSuite = supabaseUrl && anonKey ? describe : describe.skip

function makeClient() {
  if (!supabaseUrl || !anonKey) throw new Error('Set PUBLIC_INTAKE_TEST_URL and PUBLIC_INTAKE_TEST_ANON_KEY.')
  return createClient<Database>(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false, storageKey: `sb-intake-${randomUUID()}` },
  })
}

async function readMembership(client: SupabaseClient<Database>) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const result = await client.from('organization_members').select('organization_id').single()
    if (result.error?.code !== 'PGRST303') return result
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  return client.from('organization_members').select('organization_id').single()
}

const clients: SupabaseClient<Database>[] = []
afterAll(async () => {
  await Promise.all(clients.map((client) => client.auth.signOut()))
})

localSuite('public intake against local Supabase', () => {
  it('requires consent, creates one tenant-scoped lead, accepts a private file and keeps other workspaces isolated', async () => {
    const ownerA = makeClient()
    const ownerB = makeClient()
    const visitor = makeClient()
    clients.push(ownerA, ownerB, visitor)

    const unique = randomUUID()
    const password = `Growth-${unique}-Aa1!`
    const [signupA, signupB] = await Promise.all([
      ownerA.auth.signUp({ email: `growth-a-${unique}@example.test`, password }),
      ownerB.auth.signUp({ email: `growth-b-${unique}@example.test`, password }),
    ])
    expect(signupA.error).toBeNull()
    expect(signupB.error).toBeNull()
    expect(signupA.data.session).not.toBeNull()
    expect(signupB.data.session).not.toBeNull()

    expect((await ownerA.auth.getSession()).data.session?.user.id).toBe(signupA.data.user?.id)
    expect((await ownerB.auth.getSession()).data.session?.user.id).toBe(signupB.data.user?.id)
    const [membershipResponseA, membershipResponseB] = await Promise.all([
      readMembership(ownerA),
      readMembership(ownerB),
    ])
    expect(membershipResponseA.error).toBeNull()
    expect(membershipResponseB.error).toBeNull()
    const membershipA = membershipResponseA.data
    const membershipB = membershipResponseB.data
    expect(membershipA?.organization_id).toBeTruthy()
    expect(membershipB?.organization_id).toBeTruthy()
    expect(membershipA?.organization_id).not.toBe(membershipB?.organization_id)

    const organizationA = membershipA!.organization_id as string
    const { data: enabledLink, error: linkError } = await ownerA.rpc('manage_public_intake_link', { p_organization_id: organizationA, p_operation: 'enable' })
    expect(linkError).toBeNull()
    const code = enabledLink?.[0]?.out_code as string
    expect(code).toMatch(/^[A-Za-z0-9_-]{32}$/)

    const linkInfo = await visitor.rpc('public_link_details', { p_code: code })
    expect(linkInfo.error).toBeNull()
    expect(linkInfo.data).toHaveLength(1)

    const idempotencyKey = randomUUID()
    const pdf = new Blob(['%PDF-1.4\npublic intake test\n%%EOF'], { type: 'application/pdf' })
    const startArgs = {
      p_code: code,
      p_company_name: 'Mercado de Teste',
      p_phone: '(11) 98765-4321',
      p_city: 'Campinas',
      p_email: `financeiro-${unique}@example.test`,
      p_consent: true,
      p_consent_version: PUBLIC_CONSENT_VERSION,
      p_consent_text: PUBLIC_CONSENT_TEXT,
      p_file_name: 'conta.pdf',
      p_mime_type: 'application/pdf',
      p_file_size: pdf.size,
      p_idempotency_key: idempotencyKey,
    }

    const deniedConsent = await visitor.rpc('begin_public_intake', { ...startArgs, p_consent: false })
    expect(deniedConsent.error).not.toBeNull()

    const [firstStart, retryStart] = await Promise.all([
      visitor.rpc('begin_public_intake', startArgs),
      visitor.rpc('begin_public_intake', startArgs),
    ])
    expect(firstStart.error).toBeNull()
    expect(retryStart.error).toBeNull()
    const started = firstStart.data?.[0] as { out_submission_id: string; out_upload_path: string } | undefined
    expect(started).toBeTruthy()
    expect(retryStart.data?.[0]?.out_submission_id).toBe(started?.out_submission_id)
    expect(retryStart.data?.[0]?.out_upload_path).toBe(started?.out_upload_path)

    const invalidMime = await visitor.rpc('begin_public_intake', {
      ...startArgs,
      p_idempotency_key: randomUUID(),
      p_file_name: 'conta.pdf',
      p_mime_type: 'image/png',
    })
    expect(invalidMime.error).not.toBeNull()

    const oversized = await visitor.rpc('begin_public_intake', {
      ...startArgs,
      p_idempotency_key: randomUUID(),
      p_file_size: 10 * 1024 * 1024 + 1,
    })
    expect(oversized.error).not.toBeNull()

    const { error: uploadError } = await visitor.storage.from('invoices').upload(started!.out_upload_path, pdf, {
      contentType: 'application/pdf',
      upsert: false,
    })
    expect(uploadError).toBeNull()

    const { data: anonymousLeadRead, error: anonymousLeadError } = await visitor.from('leads').select('id')
    expect(anonymousLeadError).toBeNull()
    expect(anonymousLeadRead).toEqual([])
    const { data: anonymousSubmissionRead, error: anonymousSubmissionError } = await visitor.from('public_intake_submissions').select('id')
    expect(anonymousSubmissionError).not.toBeNull()
    expect(anonymousSubmissionRead).toBeNull()

    const finish = await visitor.rpc('finish_public_intake', {
      p_submission_id: started!.out_submission_id,
      p_upload_path: started!.out_upload_path,
    })
    expect(finish.error).toBeNull()
    expect(finish.data).toBe('RECEBIDO')
    const repeatedFinish = await visitor.rpc('finish_public_intake', {
      p_submission_id: started!.out_submission_id,
      p_upload_path: started!.out_upload_path,
    })
    expect(repeatedFinish.data).toBe('RECEBIDO')

    const { data: createdLeadResult, error: createdLeadError } = await ownerA.from('leads')
      .select('id,source,pipeline_status,phone,email,city')
      .eq('source', 'PUBLIC_LINK')
      .eq('city', 'Campinas')
      .single()
    expect(createdLeadError).toBeNull()
    const createdLead = createdLeadResult as unknown as { id: string; source: string; pipeline_status: string; phone: string; email: string; city: string } | null
    expect(createdLead).toMatchObject({ source: 'PUBLIC_LINK', pipeline_status: 'NOVO', city: 'Campinas' })

    const { data: submission, error: submissionError } = await ownerA.from('public_intake_submissions')
      .select('consent_at,consent_version,consent_text,upload_state')
      .eq('id', started!.out_submission_id)
      .single()
    expect(submissionError).toBeNull()
    expect(submission).toMatchObject({ consent_version: PUBLIC_CONSENT_VERSION, consent_text: PUBLIC_CONSENT_TEXT, upload_state: 'RECEBIDO' })
    expect(submission?.consent_at).toBeTruthy()

    const [{ data: createdTask }, { data: createdActivity }] = await Promise.all([
      ownerA.from('tasks').select('id').eq('lead_id', createdLead!.id).eq('type', 'FOLLOW_UP'),
      ownerA.from('lead_activities').select('id').eq('lead_id', createdLead!.id).eq('type', 'LEAD_CRIADO'),
    ])
    expect(createdTask).toHaveLength(1)
    expect(createdActivity).toHaveLength(1)

    const crossTenantReview = await ownerB.rpc('review_public_intake', { p_submission_id: started!.out_submission_id })
    expect(crossTenantReview.error).not.toBeNull()
    const review = await ownerA.rpc('review_public_intake', { p_submission_id: started!.out_submission_id })
    expect(review.error).toBeNull()
    expect(review.data).toBe(true)

    const { data: crossTenantLead } = await ownerB.from('leads').select('id').eq('id', createdLead!.id)
    const { data: crossTenantSubmission } = await ownerB.from('public_intake_submissions').select('id').eq('id', started!.out_submission_id)
    expect(crossTenantLead).toEqual([])
    expect(crossTenantSubmission).toEqual([])
    expect((await visitor.storage.from('invoices').download(started!.out_upload_path)).error).not.toBeNull()
    expect((await ownerB.storage.from('invoices').download(started!.out_upload_path)).error).not.toBeNull()

    const registerInvoice = {
      p_submission_id: started!.out_submission_id,
      p_provider: 'CPFL',
      p_state: 'SP',
      p_customer_type: 'COMERCIAL' as const,
      p_amount: 3850,
      p_consumption_kwh: 2912,
      p_reference_date: '2026-09-01',
    }
    const crossTenantInvoice = await ownerB.rpc('register_public_intake_invoice', registerInvoice)
    expect(crossTenantInvoice.error).not.toBeNull()
    const invoiceResult = await ownerA.rpc('register_public_intake_invoice', registerInvoice)
    expect(invoiceResult.error).toBeNull()
    expect(invoiceResult.data).toBeTruthy()
    const duplicateInvoiceResult = await ownerA.rpc('register_public_intake_invoice', registerInvoice)
    expect(duplicateInvoiceResult.data).toBe(invoiceResult.data)
    const { data: storedInvoices } = await ownerA.from('invoices').select('id').eq('lead_id', createdLead!.id)
    expect(storedInvoices).toHaveLength(1)

    const crossTenantLinkManagement = await ownerB.rpc('manage_public_intake_link', { p_organization_id: organizationA, p_operation: 'rotate' })
    expect(crossTenantLinkManagement.error).not.toBeNull()
    const { data: rotatedLink, error: rotateError } = await ownerA.rpc('manage_public_intake_link', { p_organization_id: organizationA, p_operation: 'rotate' })
    expect(rotateError).toBeNull()
    const rotatedCode = rotatedLink?.[0]?.out_code as string
    expect(rotatedCode).toMatch(/^[A-Za-z0-9_-]{32}$/)
    expect(rotatedCode).not.toBe(code)
    expect((await visitor.rpc('public_link_details', { p_code: code! })).data).toHaveLength(0)
    expect((await visitor.rpc('public_link_details', { p_code: rotatedCode! })).data).toHaveLength(1)
    const { error: disableError } = await ownerA.rpc('manage_public_intake_link', { p_organization_id: organizationA, p_operation: 'disable' })
    expect(disableError).toBeNull()
    expect((await visitor.rpc('public_link_details', { p_code: rotatedCode! })).data).toHaveLength(0)
  })
})
