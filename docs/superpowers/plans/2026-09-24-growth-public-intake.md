# Growth Public Intake Implementation Plan

> **For agentic workers:** Execute inline in this task, one task at a time, following the approved spec and test-first steps.

**Goal:** Let a public energy customer submit consent and a private invoice to the correct licensed workspace, where the lead is reviewed, simulated and followed up.

**Architecture:** Keep the Next.js App Router and existing Supabase client patterns. Use opaque organization links, narrowly scoped public RPCs, an upload path capability checked by Storage RLS, then reuse authenticated CRM, invoice and simulation flows. Do not use `service_role` in the app.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase Postgres/Auth/Storage, Zod, Vitest, Supabase CLI local stack.

**Spec:** `docs/superpowers/specs/2026-09-24-growth-public-intake-design.md`

**Baseline finding:** `npm test` currently fails one unrelated test in `src/components/leads/__tests__/google-place-auto-load.test.tsx:59` because the same phone appears in both the header summary and detail panel. The other 38 baseline tests pass. Keep this separate from Growth implementation unless a minimal assertion update is needed for a full green suite.

## Global Constraints

- Preserve the current lead stages, Google Places behavior, private `invoices` bucket and authenticated invoice upload.
- Public upload accepts PDF, JPG or PNG up to 10 MB and streams from browser to Supabase Storage.
- Public functions return minimal data and use `SECURITY DEFINER` only with locked search path, narrow grants and organization derived from the opaque link.
- Never return a lead ID or private record to an unauthenticated visitor.
- Require consent and retain its timestamp, text and version.
- Do not add OCR, payment, ads, WhatsApp API, autonomous AI or formal proposal generation.

---

### Task 1: Public intake validation and upload state rules

**Files:**
- Create: `src/lib/validations/public-intake.ts`
- Test: `src/lib/validations/__tests__/public-intake.test.ts`

**Interfaces:**
- `publicIntakeSchema` parses `companyName`, `phone`, `city`, `email`, and literal consent `true`.
- `validatePublicInvoiceFile(file)` returns a user-facing error or `null` for non-empty PDF/JPG/PNG up to 10 MiB with matching extension and MIME.

- [x] Write tests for valid/invalid consent, required company/contact, invalid email, file extension/MIME mismatch, zero bytes and over 10 MiB.
- [x] Run the validation tests and confirm they fail before implementation.
- [x] Implement the Zod schema and file checks.
- [x] Run the validation tests and confirm all tests pass.

### Task 2: Tenant-safe links, submissions and upload authorization

**Files:**
- Create: `supabase/migrations/20260924000100_public_intake.sql`
- Create: `supabase/config.toml` (local integration-test configuration)
- Modify: `src/lib/supabase/database.ts`
- Create: `supabase/tests/public_intake_rls.test.sql`

**Interfaces:**
- `public_intake_links`: organization-owned opaque `code`, `active`, optional expiration and revocation timestamps.
- `public_intake_submissions`: organization, link, lead, consent text/version/time, unique upload path, expiry/state, review fields and optional invoice association; composite tenant foreign keys.
- `public_link_details(code)` returns only active public organization display name.
- `begin_public_intake(code, contact fields, consent version/text, filename, MIME, size)` atomically inserts a `PUBLIC_LINK` lead, activity, owner follow-up task, submission and one-time upload path; quota is 20 per hour and 100 per day per link with the link row locked while counting.
- `finish_public_intake(submission id, upload path)` verifies the exact Storage object metadata, expires after 30 minutes and idempotently marks it `RECEBIDO`.
- Storage insert policy for `anon` checks the exact unexpired pending path; no anonymous read/update/delete policy.
- Authenticated members can read and mark only their organization's submissions; only the owner can manage its public link.

- [x] Add pgTAP schema and grant assertions, plus a JavaScript local integration test for consent, storage upload, completion, idempotency and cross-organization denial.
- [x] Add a minimal Supabase CLI config for the existing migrations and local test ports; verify the pgTAP contract fails before the migration.
- [x] Add the migration with explicit grants/revokes, fixed `search_path`, row locks for quota, compound foreign keys and minimal RPC results.
- [x] Update database RPC types for the new functions.
- [x] Run `supabase db reset` and `supabase test db`; confirm 8 SQL assertions pass against actual Postgres and Storage schema.

### Task 3: Manage and share one link per organization

**Files:**
- Modify: `src/app/(app)/configuracoes/page.tsx`
- Modify: `src/app/(app)/configuracoes/actions.ts`
- Create: `src/components/settings/public-intake-link-form.tsx`

**Interfaces:**
- Server link query returns only the current organization code and status.
- Owner action creates or rotates a cryptographically random 192-bit code, or disables the link in one transaction; all operations use the current session and owner check.
- Settings displays a copyable absolute URL built from the browser's current origin and the active/disabled state.

- [x] Implement owner-scoped transactional link actions and settings with copy/status feedback.
- [x] Verify enable, rotation, revocation and cross-organization management against local Supabase.

### Task 4: Public form and direct private upload

**Files:**
- Create: `src/app/captar/[codigo]/page.tsx`
- Create: `src/components/public-intake/public-intake-form.tsx`
- Create: `src/lib/supabase/public.ts`
- Completion uses an inline state in the public form.
- Test: `src/components/public-intake/__tests__/public-intake-form.test.tsx`

**Interfaces:**
- `createPublicClient()` uses only the public Supabase URL and anon key and never reads or writes the licensed-user auth cookies.
- Dynamic route awaits `params`, requests `public_link_details`, and renders generic unavailable copy when the link is invalid.
- Form validates, calls `begin_public_intake`, uploads directly using `storage.from('invoices').upload(path, file, { upsert: false })`, then calls `finish_public_intake`; a retry reuses the returned submission and path within the same session.
- Completion is shown only when finalization succeeds. All visible errors preserve entered fields and avoid exposing identifiers or private data.

- [x] Write component tests for unchecked consent, successful direct upload flow and retry without a second `begin` call.
- [x] Implement the public client, dynamic page and form using the locally installed Next.js App Router conventions.
- [x] Run component tests and confirm local anonymous file upload and unauthenticated download/list denial.

### Task 5: Dashboard inbox and source visibility

**Files:**
- Modify: `src/lib/dashboard/queries.ts`
- Modify: `src/lib/dashboard/summary.ts`
- Modify: `src/app/(app)/dashboard/page.tsx`
- Modify: `src/lib/leads/queries.ts`
- Modify: `src/app/(app)/leads/page.tsx`
- Modify: `src/components/leads/lead-header.tsx`
- Test: `src/lib/dashboard/__tests__/summary.test.ts`

**Interfaces:**
- Dashboard summary includes pending public intake count and up to six most recent submissions scoped by the existing organization context.
- Lead rows include `source`; public link records display “Link público” in the CRM list and lead detail.

- [x] Add a summary test for the pending public intake count and list.
- [x] Implement tenant-filtered queries and the dashboard inbox; preserve existing KPIs and empty states.
- [x] Run dashboard tests and typecheck.

### Task 6: Manual review, invoice reuse and task completion

**Files:**
- Modify: `src/lib/leads/queries.ts`
- Modify: `src/app/(app)/leads/actions.ts`
- Modify: `src/app/(app)/leads/[id]/page.tsx`
- Modify: `src/app/(app)/leads/[id]/fatura/page.tsx`
- Modify: `src/app/(app)/leads/[id]/fatura/actions.ts`
- Modify: `src/components/invoices/invoice-upload-form.tsx` or add a separate public-invoice review form

**Interfaces:**
- Authenticated member action marks submission reviewed by `(submission id, organization_id)` only.
- Invoice review form accepts the existing invoice schema, creates one `invoices` row against the submitted path and records one `FATURA_ADICIONADA` activity; repeated submission returns the existing invoice.
- Pending upload state offers manual follow-up; received invoice uses the current signed-URL display and simulation route.

- [x] Exercise review isolation, invoice metadata validation, one-time invoice association and follow-up state in the local integration test.
- [x] Implement organization-scoped review actions and forms, reusing existing invoice validation, simulation and task completion.
- [x] Run the local review/invoice integration test plus existing invoice/simulation unit tests.

### Task 7: End-to-end security and regression verification

**Files:**
- Modify: `docs/supabase-setup.md`
- Modify: `docs/acceptance-checklist.md`
- All feature tests and current project tests

- [x] Run `npx supabase db reset` and `npx supabase test db` for actual RLS and Storage policy evidence.
- [x] Run a Supabase JavaScript integration test against the local URL to upload a file anonymously, finalize consent/opportunity, and prove a second authenticated organization cannot select or download it.
- [x] Run `npm test` (47 passed, 1 local Supabase integration test skipped in the environment-free unit run; the dedicated integration command passes separately).
- [x] Run focused ESLint on feature files. Full `npm run lint` still reports violations in untouched task/stage components.
- [x] Run `npm run typecheck`.
- [x] Run `npm run build`.
- [x] Review the full diff for workspace ID trust, anonymous read grants, bucket privacy, Places changes, consent retention, repeated submissions and generated artifacts.
- [x] Document required migration deployment, public-link operation and manual cleanup; public launch is blocked until controller identity and privacy retention text are completed.

## Self-review

- Public capture, per-tenant link management, upload, dashboard visibility, manual review, existing simulation and follow-up each have explicit tasks.
- Consent is required and persisted with text/version/time in Task 2 and exercised in Tasks 1, 2 and 4.
- Cross-organization policy tests run against local Postgres/Storage, not mocks alone.
- No payment, OCR, WhatsApp API, AI automation, Places writes or pipeline redesign are in scope.
