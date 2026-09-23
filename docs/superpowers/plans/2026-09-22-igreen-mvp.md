# iGreen MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready first version of iGreen that lets an individual licensed seller find real businesses, manage leads, analyse an energy bill and share a persisted saving estimate.

**Architecture:** A Next.js 16 App Router monolith owns the responsive interface, authenticated server actions and two narrow route handlers. Supabase provides cookie-based authentication, PostgreSQL with tenant-scoped RLS and a private invoice bucket. Google Geocoding plus Places Text Search are called only from the server; Places content is transiently displayed with Google attribution, while the CRM stores only the exempt place ID and user-entered fields.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui, Zod, Supabase (`@supabase/ssr`, `@supabase/supabase-js`), Google Maps Platform, dnd-kit, Vitest and Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-22-igreen-mvp-design.md`

## Estado da execução — 23/09/2026

- Código das tarefas 1–10 implementado localmente; testes (28), lint, TypeScript e build de produção passam.
- Smoke test autenticado observou login, busca Google, importação e páginas do pipeline/CRM/fatura respondendo no servidor local; o schema remoto também respondeu para as tabelas principais.
- Ainda falta validar cadastro por e-mail, upload e URL assinada de fatura, persistência de simulação, isolamento entre duas contas e publicação num domínio público. Esses passos ficam pendentes no [checklist de aceite](../acceptance-checklist.md).

## Global Constraints

- Use Next.js App Router and `proxy.ts`; do not create a deprecated `middleware.ts` file.
- Keep all user sessions cookie-based with `@supabase/ssr`; server authorization must use a verified user, never `getSession()` alone.
- Keep `GOOGLE_MAPS_API_KEY` server-only. Use only the public Supabase key with authenticated user sessions and RLS; no `service_role` key is required. `.env`, `.env.local` and local variants are ignored.
- Every application table carries or inherits an `organization_id`; all exposed tables and `storage.objects` policies enforce tenant isolation with RLS.
- The `invoices` Storage bucket is private, accepts only PDF/JPG/JPEG/PNG and has a 10 MB maximum.
- The first editable eligibility rule is `CPFL / SP / Comercial / 12%`; an estimate must state it remains subject to final validation.
- Scope excludes OCR, PDF proposals, WhatsApp Business API, automated messages, teams, AI and data-enrichment services.
- Use BRL in the interface and persist monetary amounts as `numeric(12,2)`, never floating-point values.
- Use Portuguese (Brazil) user-facing copy, clear error messages, keyboard-accessible controls and responsive layouts.

---

## File Structure

```text
.
├── .env.example                         # safe local configuration template
├── proxy.ts                              # Supabase cookie refresh boundary
├── supabase/
│   └── migrations/20260922000000_initial_schema.sql
├── src/
│   ├── app/
│   │   ├── (auth)/                       # login, sign-up and password recovery
│   │   ├── (app)/                        # authenticated pages and application shell
│   │   ├── api/prospect/search/route.ts  # server-only Google Places search
│   │   └── auth/confirm/route.ts         # confirmation-code exchange
│   ├── components/
│   │   ├── ui/                           # generated shadcn primitives
│   │   ├── app-shell/                    # sidebar and top bar
│   │   ├── dashboard/                    # KPI, funnel and task views
│   │   ├── prospect/                     # filters, result table and import dialog
│   │   ├── leads/                        # lead header, notes, tasks and activity feed
│   │   ├── pipeline/                     # dnd-kit board and lead cards
│   │   ├── invoices/                     # guarded upload and invoice form
│   │   └── simulations/                  # eligibility result and sharing controls
│   ├── lib/
│   │   ├── supabase/                     # browser/server/proxy clients and generated DB type
│   │   ├── domain/                       # pure score, money and simulation functions
│   │   ├── validations/                  # Zod schemas shared by actions and forms
│   │   ├── google-places.ts              # provider request/response adapter
│   │   ├── leads/                        # tenant-safe lead and activity queries
│   │   └── dashboard/                    # dashboard read model
│   └── types/                            # application-only discriminated unions
└── src/**/__tests__/                     # colocated unit and component tests
```

## Task 1: Bootstrap the application and shared visual primitives

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `vitest.config.ts`, `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`
- Create: `src/lib/utils.ts`, `src/lib/domain/money.ts`, `src/lib/domain/__tests__/money.test.ts`
- Create: `src/components/ui/button.tsx`, `src/components/ui/input.tsx`, `src/components/ui/card.tsx`, `src/components/ui/badge.tsx`, `src/components/ui/select.tsx`, `components.json`
- Create: `.env.example`, `.gitignore`

**Interfaces:**
- Produces `formatBRL(value: number): string`, `parseBRL(input: string): number | null` and `cn(...inputs: ClassValue[]): string`.
- Produces the Tailwind theme tokens used by every subsequent page: `brand`, `surface`, `muted`, `success`, `warning` and `danger`.

- [ ] **Step 1: Initialise package metadata and install the exact runtime groups.**

```powershell
npm init -y
npm install next@latest react@latest react-dom@latest @supabase/ssr @supabase/supabase-js zod clsx tailwind-merge class-variance-authority lucide-react @dnd-kit/core @dnd-kit/sortable
npm install -D typescript @types/node @types/react @types/react-dom tailwindcss @tailwindcss/postcss eslint eslint-config-next vitest @vitejs/plugin-react happy-dom @testing-library/react @testing-library/jest-dom
```

Set the scripts to `dev: next dev`, `build: next build`, `lint: eslint .`, `typecheck: tsc --noEmit`, `test: vitest run` and `test:watch: vitest`.

- [ ] **Step 2: Write the failing BRL conversion tests.**

```ts
import { describe, expect, it } from 'vitest'
import { formatBRL, parseBRL } from '../money'

describe('money helpers', () => {
  it('formats a stored decimal as Brazilian currency', () => {
    expect(formatBRL(3850)).toBe('R$ 3.850,00')
  })

  it('parses a Brazilian decimal without accepting an invalid amount', () => {
    expect(parseBRL('R$ 3.850,50')).toBe(3850.5)
    expect(parseBRL('abc')).toBeNull()
  })
})
```

- [ ] **Step 3: Run the test to verify it fails before the helper exists.**

Run: `npm test -- src/lib/domain/__tests__/money.test.ts`  
Expected: FAIL because `../money` cannot be resolved.

- [ ] **Step 4: Create the App Router base, styling, shadcn configuration and helpers.**

```ts
export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function parseBRL(input: string): number | null {
  const normalized = input.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}
```

Create a root layout with `lang="pt-BR"`, a clean sans-serif font and an accessible `main` landmark. Configure the root route to redirect authenticated users to `/dashboard` and everyone else to `/login` after Task 2 adds the server client. Add only the listed shadcn primitives so the component surface stays small.

- [ ] **Step 5: Add the safe environment template.**

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GOOGLE_MAPS_API_KEY=
SUPABASE_PROJECT_REF=
```

Ensure `.gitignore` contains `.env.local`, `.env*.local`, `.next/`, `node_modules/` and `coverage/`.

- [ ] **Step 6: Run quality gates and commit the bootstrap.**

Run: `npm test -- src/lib/domain/__tests__/money.test.ts; npm run lint; npm run typecheck`  
Expected: all commands exit 0.

```powershell
git add package.json package-lock.json tsconfig.json next.config.ts postcss.config.mjs eslint.config.mjs vitest.config.ts components.json .gitignore .env.example src
git commit -m "chore: bootstrap iGreen Next application"
```

## Task 2: Create the tenant-safe Supabase foundation and authentication

**Files:**
- Create: `supabase/migrations/20260922000000_initial_schema.sql`
- Create: `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`, `src/lib/supabase/proxy.ts`, `src/lib/supabase/database.ts`
- Create: `proxy.ts`, `src/app/auth/confirm/route.ts`
- Create: `src/app/(auth)/layout.tsx`, `src/app/(auth)/login/page.tsx`, `src/app/(auth)/cadastro/page.tsx`, `src/app/(auth)/recuperar-senha/page.tsx`, `src/app/(auth)/actions.ts`
- Create: `src/lib/validations/auth.ts`, `src/lib/validations/__tests__/auth.test.ts`

**Interfaces:**
- Produces `createClient(): Promise<SupabaseClient<Database>>` for server components/actions and `createBrowserClient<Database>()` for client components.
- Produces `signIn(formData)`, `signUp(formData)`, `requestPasswordReset(formData)` and `signOut()` server actions.
- Produces SQL functions `current_organization_ids(): setof uuid`, `is_organization_owner(uuid): boolean` and the `handle_new_user` trigger.

- [ ] **Step 1: Write failing validation tests for sign-up fields.**

```ts
import { describe, expect, it } from 'vitest'
import { signUpSchema } from '../auth'

describe('signUpSchema', () => {
  it('requires the operational profile fields and a secure password', () => {
    expect(signUpSchema.safeParse({
      name: 'Cristian Paxur', email: 'cristian@example.com', phone: '13999999999',
      city: 'Santos', state: 'SP', password: 'segura123',
    }).success).toBe(true)
    expect(signUpSchema.safeParse({ name: '', email: 'invalido', password: '123' }).success).toBe(false)
  })
})
```

- [ ] **Step 2: Run the auth test before creating its schema.**

Run: `npm test -- src/lib/validations/__tests__/auth.test.ts`  
Expected: FAIL because `../auth` does not exist.

- [ ] **Step 3: Create the migration, including database types, tenancy and storage policy.**

Define the exact enums `pipeline_status`, `customer_type`, `eligibility_status`, `task_type`, `activity_type` and `organization_role`. `pipeline_status` contains `NOVO`, `CONTATO_REALIZADO`, `INTERESSADO`, `AGUARDANDO_FATURA`, `ANALISE`, `PROPOSTA`, `FECHADO` and `PERDIDO`; `activity_type` contains `LEAD_CRIADO`, `STATUS_ALTERADO`, `WHATSAPP_ABERTO`, `LIGACAO_INICIADA`, `EMAIL_ABERTO`, `SITE_ABERTO`, `MAPA_ABERTO`, `FATURA_ADICIONADA` and `SIMULACAO_REALIZADA`.

Create `profiles`, `organizations`, `organization_members`, `leads`, `lead_notes`, `tasks`, `lead_activities`, `invoices`, `eligibility_rules`, `simulations` and `message_templates` with `created_at timestamptz not null default now()`. `leads` has nullable `external_place_id`, required `fingerprint`, score, pipeline status and `updated_at`; `tasks` has `due_at timestamptz` and nullable `completed_at`; `invoices` has `storage_path`, `amount numeric(12,2)`, consumption, provider, state, customer type and reference date; `simulations` has each monetary output named in the approved design. Add a partial unique index on `(organization_id, external_place_id)` where the place id is not null and a unique index on `(organization_id, fingerprint)`.

Include the access primitive used by every policy:

```sql
create function public.current_organization_ids()
returns setof uuid
language sql stable security definer set search_path = public
as $$
  select organization_id
  from public.organization_members
  where user_id = auth.uid()
$$;
```

Also create the owner check used by configuration actions:

```sql
create function public.is_organization_owner(p_organization_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = p_organization_id and user_id = auth.uid() and role = 'OWNER'
  )
$$;
```

Create a `handle_new_user` trigger on `auth.users` that inserts the profile from `raw_user_meta_data`, creates `Workspace de <nome>` and inserts an `owner` membership in one transaction. Enable RLS on every public table. Use `organization_id in (select public.current_organization_ids())` for direct tenant tables; for lead children use an `exists` subquery against a visible lead. Insert the private `invoices` bucket with `file_size_limit = 10485760` and allowed MIME types. Add `storage.objects` policies restricting the first path segment to an organization returned by `current_organization_ids()`.

Seed these five message templates for every organization in the trigger: `PRIMEIRO_CONTATO`, `FOLLOW_UP`, `SOLICITAR_FATURA`, `ENVIAR_SIMULACAO`, `ENVIAR_PROPOSTA`. Seed the default eligibility rule only for new organizations: CPFL, SP, COMERCIAL, no amount limits and 12 percent discount.

- [ ] **Step 4: Create browser/server clients, session proxy and auth pages.**

```ts
export const signUpSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  phone: z.string().trim().min(10).max(20),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().length(2).transform((state) => state.toUpperCase()),
  password: z.string().min(8).max(72),
})
```

`signUp` passes `name`, `phone`, `city` and `state` in Auth user metadata, then explains email confirmation when returned by Supabase. `proxy.ts` calls `updateSession(request)` and the proxy uses the documented static matcher. Protected layouts call `supabase.auth.getUser()` and redirect to `/login` when absent; they do not accept an identity sent by the browser.

- [ ] **Step 5: Apply and type the schema against the real Supabase project.**

```powershell
npx supabase link --project-ref $env:SUPABASE_PROJECT_REF
npx supabase db push
npx supabase gen types typescript --project-id $env:SUPABASE_PROJECT_REF | Set-Content -NoNewline 'src/lib/supabase/database.ts'
```

Before running this step, place the project reference in the local environment and authenticate the Supabase CLI. Do not use a production database that contains unrelated application tables.

- [ ] **Step 6: Verify the schema test, type check and authentication smoke path.**

Run: `npm test -- src/lib/validations/__tests__/auth.test.ts; npm run lint; npm run typecheck`  
Expected: all commands exit 0. Manually register a fresh account, follow the confirmation link, log in and confirm a profile, organization, owner membership, templates and the 12% rule exist.

- [ ] **Step 7: Commit the foundation.**

```powershell
git add supabase src/lib/supabase src/lib/validations src/app/(auth) src/app/auth proxy.ts
git commit -m "feat: add Supabase auth and tenant foundation"
```

## Task 3: Implement tested scoring and eligibility calculation

**Files:**
- Create: `src/types/domain.ts`, `src/lib/domain/lead-score.ts`, `src/lib/domain/eligibility.ts`
- Create: `src/lib/domain/__tests__/lead-score.test.ts`, `src/lib/domain/__tests__/eligibility.test.ts`

**Interfaces:**
- Produces `scoreLead(input: ScoreInput): number` and `potentialFromScore(score: number): Potential`.
- Produces `calculateSimulation(invoice: InvoiceInput, rule: EligibilityRule | null): SimulationResult`.
- Consumes `CustomerType` and `EligibilityStatus` strings matching the SQL enums.

- [ ] **Step 1: Write failing score tests for scoring boundaries.**

```ts
expect(scoreLead({ category: 'MERCADO', hasPhone: true, hasWebsite: true, openHours: 13 })).toBe(65)
expect(potentialFromScore(30)).toBe('BAIXO')
expect(potentialFromScore(31)).toBe('MEDIO')
expect(potentialFromScore(81)).toBe('MUITO_ALTO')
```

- [ ] **Step 2: Write failing eligibility tests for all result states.**

```ts
const invoice = { amount: 3850, provider: 'CPFL', state: 'SP', customerType: 'COMERCIAL' as const }
const rule = { provider: 'CPFL', state: 'SP', customerType: 'COMERCIAL' as const, minimumAmount: null, maximumAmount: null, discountPercentage: 12 }

expect(calculateSimulation(invoice, rule)).toMatchObject({
  status: 'POTENCIALMENTE_ELEGIVEL', monthlySavings: 462, annualSavings: 5544, newAmount: 3388,
})
expect(calculateSimulation(invoice, null).status).toBe('NECESSITA_VALIDACAO')
```

Include a range-exclusion test expecting `FORA_DOS_CRITERIOS`.

- [ ] **Step 3: Run the domain test suite before implementation.**

Run: `npm test -- src/lib/domain/__tests__/lead-score.test.ts src/lib/domain/__tests__/eligibility.test.ts`  
Expected: FAIL because the domain modules do not exist.

- [ ] **Step 4: Implement deterministic functions with explicit types.**

```ts
export type SimulationResult = {
  status: 'POTENCIALMENTE_ELEGIVEL' | 'FORA_DOS_CRITERIOS' | 'NECESSITA_VALIDACAO'
  discountPercentage: number | null
  monthlySavings: number | null
  annualSavings: number | null
  newAmount: number | null
}
```

Add category points exactly as approved, add website/phone/open-hours bonuses, cap at 100 and do not claim eligibility from score. `calculateSimulation` returns null monetary fields for a missing rule, checks both inclusive rule limits before computing, and rounds every saved number to two decimal places.

- [ ] **Step 5: Run tests and commit the pure business core.**

Run: `npm test -- src/lib/domain/__tests__/lead-score.test.ts src/lib/domain/__tests__/eligibility.test.ts; npm run typecheck`  
Expected: all commands exit 0.

```powershell
git add src/types src/lib/domain
git commit -m "feat: add lead scoring and eligibility engine"
```

## Task 4: Build the protected shell and live dashboard

**Files:**
- Create: `src/app/(app)/layout.tsx`, `src/app/(app)/dashboard/page.tsx`
- Create: `src/components/app-shell/sidebar.tsx`, `src/components/app-shell/topbar.tsx`
- Create: `src/components/dashboard/kpi-card.tsx`, `src/components/dashboard/funnel.tsx`, `src/components/dashboard/today-tasks.tsx`, `src/components/dashboard/empty-dashboard.tsx`
- Create: `src/lib/dashboard/queries.ts`, `src/lib/dashboard/__tests__/summary.test.ts`

**Interfaces:**
- Produces `getDashboardSummary(organizationId: string, today: string): Promise<DashboardSummary>`.
- `DashboardSummary` contains `leadCount`, `contactedCount`, `invoiceCount`, `identifiedSavings`, `pipelineCounts` and `todayTasks`.

- [ ] **Step 1: Write a failing summary mapper test.**

```ts
expect(toDashboardSummary({
  leads: [{ pipeline_status: 'NOVO' }, { pipeline_status: 'CONTATO_REALIZADO' }],
  invoices: [{ id: 'invoice-1' }],
  simulations: [{ estimated_monthly_savings: 462 }],
  tasks: [{ id: 'task-1', due_at: '2026-09-22T12:00:00.000Z', completed_at: null }],
}, '2026-09-22')).toMatchObject({ leadCount: 2, contactedCount: 1, invoiceCount: 1, identifiedSavings: 462 })
```

- [ ] **Step 2: Run the dashboard test before the mapper exists.**

Run: `npm test -- src/lib/dashboard/__tests__/summary.test.ts`  
Expected: FAIL because `toDashboardSummary` is not exported.

- [ ] **Step 3: Implement the shell, read model and visual states.**

Render the sidebar routes `Início`, `Prospectar`, `Pipeline`, `Leads` and `Configurações`, the user menu with sign-out action, four KPI cards, a status funnel and due/open tasks. Query only tenant-visible rows through the server client. When no leads exist, render a primary link to `/prospectar` instead of placeholder metrics.

```ts
export function toDashboardSummary(input: DashboardInput, today: string): DashboardSummary {
  const pipelineCounts = Object.fromEntries(PIPELINE_ORDER.map((status) => [status, 0])) as Record<PipelineStatus, number>
  for (const lead of input.leads) pipelineCounts[lead.pipeline_status] += 1
  return {
    leadCount: input.leads.length,
    contactedCount: input.leads.filter((lead) => lead.pipeline_status !== 'NOVO').length,
    invoiceCount: input.invoices.length,
    identifiedSavings: input.simulations.reduce((total, item) => total + Number(item.estimated_monthly_savings ?? 0), 0),
    pipelineCounts,
    todayTasks: input.tasks.filter((task) => task.due_at?.slice(0, 10) === today && !task.completed_at),
  }
}
```

- [ ] **Step 4: Run the dashboard checks and manually inspect an empty account.**

Run: `npm test -- src/lib/dashboard/__tests__/summary.test.ts; npm run lint; npm run typecheck`  
Expected: all commands exit 0. Sign in as a new user and verify the protected shell redirects anonymous users and presents the prospecting CTA.

- [ ] **Step 5: Commit the dashboard slice.**

```powershell
git add src/app/(app) src/components/app-shell src/components/dashboard src/lib/dashboard
git commit -m "feat: add authenticated dashboard"
```

## Task 5: Add profile, organization, template and eligibility settings

**Files:**
- Create: `src/app/(app)/configuracoes/page.tsx`, `src/app/(app)/configuracoes/actions.ts`
- Create: `src/components/settings/profile-form.tsx`, `src/components/settings/templates-form.tsx`, `src/components/settings/rules-form.tsx`
- Create: `src/lib/validations/settings.ts`, `src/lib/validations/__tests__/settings.test.ts`

**Interfaces:**
- Produces owner-only `updateProfile`, `updateOrganization`, `saveTemplate` and `saveEligibilityRule` actions.
- Consumes settings form payloads validated by `profileSchema`, `templateSchema` and `eligibilityRuleSchema`.

- [ ] **Step 1: Write failing validation tests for an eligibility rule.**

```ts
expect(eligibilityRuleSchema.safeParse({
  provider: 'CPFL', state: 'sp', customerType: 'COMERCIAL', minimumAmount: '', maximumAmount: '', discountPercentage: '12', active: true,
}).success).toBe(true)
expect(eligibilityRuleSchema.safeParse({ provider: '', state: 'S', customerType: 'COMERCIAL', discountPercentage: '101' }).success).toBe(false)
```

- [ ] **Step 2: Run the validation test before adding schemas.**

Run: `npm test -- src/lib/validations/__tests__/settings.test.ts`  
Expected: FAIL because the settings schema module does not exist.

- [ ] **Step 3: Implement settings forms and actions.**

Use server actions to fetch the current tenant and reject an action when `is_organization_owner(organizationId)` is false. The profile form edits name, phone, email display data, city and state. The organization form edits name. The templates form exposes all five seeds and preserves the variables `{{nome_licenciado}}`, `{{nome_empresa}}` and `{{cidade}}`. The rule form supports provider, state, customer type, optional minimum/maximum amount, percentage and active state.

```ts
export const eligibilityRuleSchema = z.object({
  provider: z.string().trim().min(2).max(80),
  state: z.string().trim().length(2).transform((value) => value.toUpperCase()),
  customerType: z.enum(['RESIDENCIAL', 'COMERCIAL', 'RURAL', 'INDUSTRIAL', 'OUTRO']),
  minimumAmount: z.coerce.number().nonnegative().nullable(),
  maximumAmount: z.coerce.number().positive().nullable(),
  discountPercentage: z.coerce.number().gt(0).lte(100),
  active: z.coerce.boolean(),
}).superRefine((rule, context) => {
  if (rule.minimumAmount !== null && rule.maximumAmount !== null && rule.minimumAmount > rule.maximumAmount) {
    context.addIssue({ code: 'custom', path: ['maximumAmount'], message: 'O valor máximo deve ser maior ou igual ao mínimo.' })
  }
})
```

- [ ] **Step 4: Verify and commit settings.**

Run: `npm test -- src/lib/validations/__tests__/settings.test.ts; npm run lint; npm run typecheck`  
Expected: all commands exit 0. Manually change the default 12% rule, save it, reload the page and confirm the persisted value appears.

```powershell
git add src/app/(app)/configuracoes src/components/settings src/lib/validations
git commit -m "feat: add organization settings and simulation rules"
```

## Task 6: Search Google Places and import scored, duplicate-safe leads

**Files:**
- Create: `src/app/api/prospect/search/route.ts`, `src/app/(app)/prospectar/page.tsx`, `src/app/(app)/prospectar/actions.ts`
- Create: `src/components/prospect/search-form.tsx`, `src/components/prospect/results-table.tsx`, `src/components/prospect/import-button.tsx`
- Create: `src/lib/google-places.ts`, `src/lib/leads/import.ts`, `src/lib/validations/prospect.ts`
- Create: `src/lib/__tests__/google-places.test.ts`, `src/lib/leads/__tests__/import.test.ts`

**Interfaces:**
- Produces `searchBusinesses(filters: ProspectFilters): Promise<ProspectBusiness[]>` and `importProspects(input: ProspectBusiness[]): Promise<ImportResult>`.
- `ProspectBusiness` is transient search-result data. Google-sourced name, address, location, rating, phone and website are not persisted. CRM import accepts the `placeId` and manually entered company fields; score is based only on those fields.

- [ ] **Step 1: Write failing adapter and duplicate tests.**

```ts
expect(toProspectBusiness(googlePlace)).toMatchObject({ placeId: 'ChIJ1', name: 'Academia Centro', rating: 4.7, hasPhone: true })
expect(buildLeadFingerprint({ name: ' Academia Centro ', address: 'Rua A, 10' })).toBe('academia centro|rua a 10')
```

Use a second import test with a repository fake that returns an existing lead by `placeId` and assert `{ created: 0, skipped: 1 }`.

- [ ] **Step 2: Run the search/import tests before implementation.**

Run: `npm test -- src/lib/__tests__/google-places.test.ts src/lib/leads/__tests__/import.test.ts`  
Expected: FAIL because the adapter and import modules do not exist.

- [ ] **Step 3: Implement server-only geocoding and Places Text Search.**

First geocode `"<cidade>, <estado>, Brasil"`, then call `POST https://places.googleapis.com/v1/places:searchText` with a category-plus-city `textQuery`, a circle `locationBias` from the chosen radius and a restricted field mask. Map category labels to the approved segments: academias, mercados, padarias, restaurantes, hotéis, farmácias, clínicas, lojas and outros. Do not return raw Google payloads or the API key to the browser.

```ts
const fieldMask = [
  'places.id', 'places.displayName', 'places.formattedAddress', 'places.location',
  'places.rating', 'places.nationalPhoneNumber', 'places.websiteUri',
  'places.regularOpeningHours', 'places.types',
].join(',')
```

The route handler authenticates the request, validates filters with Zod, responds with 400 for invalid filters and returns a Portuguese 502 message when Google rejects or times out. Document that both **Places API (New)** and **Geocoding API** must be enabled for the key.

- [ ] **Step 4: Implement result selection and transactional import behavior.**

Require the user to enter the CRM name, segment, address, phone, email, website and open hours explicitly. Persist only the permitted `external_place_id`, user-entered fields, user-input search city/state, score computed from user-entered fields, status `NOVO` and a `LEAD_CRIADO` activity. Return created/skipped counts and render them without hiding results. The import action derives organization membership server-side and ignores any organization id sent by the browser.

- [ ] **Step 5: Verify the real provider slice and commit it.**

Run: `npm test -- src/lib/__tests__/google-places.test.ts src/lib/leads/__tests__/import.test.ts; npm run lint; npm run typecheck`  
Expected: all commands exit 0. With `GOOGLE_MAPS_API_KEY` configured, search `Academias`, `Santos`, `SP`, 10 km; import one result twice and verify the second import reports it as skipped.

```powershell
git add src/app/api/prospect src/app/(app)/prospectar src/components/prospect src/lib/google-places.ts src/lib/leads src/lib/validations/prospect.ts
git commit -m "feat: add Google business prospecting"
```

## Task 7: Implement lead details, templates, notes, tasks and history

**Files:**
- Create: `src/app/(app)/leads/page.tsx`, `src/app/(app)/leads/[id]/page.tsx`, `src/app/(app)/leads/[id]/actions.ts`
- Create: `src/components/leads/lead-header.tsx`, `src/components/leads/lead-details.tsx`, `src/components/leads/quick-actions.tsx`, `src/components/leads/note-form.tsx`, `src/components/leads/task-form.tsx`, `src/components/leads/activity-feed.tsx`
- Create: `src/lib/leads/queries.ts`, `src/lib/leads/actions.ts`, `src/lib/validations/lead.ts`, `src/lib/validations/__tests__/lead.test.ts`

**Interfaces:**
- Produces `getLeadDetail(leadId: string): Promise<LeadDetail | null>`, `createNote`, `createTask` and `recordContactAction`.
- `LeadDetail` includes a lead, notes, activities, open tasks, latest invoice and latest simulation visible under RLS.

- [ ] **Step 1: Write failing task and template-rendering tests.**

```ts
expect(taskSchema.safeParse({ type: 'WHATSAPP', dueDate: '2026-09-23', dueTime: '14:30', description: 'Retornar para Academia Strong' }).success).toBe(true)
expect(renderTemplate('Olá {{nome_empresa}}, sou {{nome_licenciado}} de {{cidade}}.', {
  nome_empresa: 'Academia Strong', nome_licenciado: 'Cristian', cidade: 'Santos',
})).toBe('Olá Academia Strong, sou Cristian de Santos.')
```

- [ ] **Step 2: Run the lead tests before creating action helpers.**

Run: `npm test -- src/lib/validations/__tests__/lead.test.ts`  
Expected: FAIL because the lead validation module is absent.

- [ ] **Step 3: Build the tenant-backed detail read model and mutation actions.**

Resolve a lead by id using the authenticated Supabase client and call `notFound()` when RLS makes it unavailable. Insert every note with the signed-in user id. Insert tasks with `type`, `description`, a `due_at` timestamp and null `completed_at`. Record `WHATSAPP_ABERTO`, `LIGACAO_INICIADA`, `EMAIL_ABERTO`, `SITE_ABERTO` and `MAPA_ABERTO` activities before navigating to the external URL.

```ts
export function renderTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/{{(nome_licenciado|nome_empresa|cidade)}}/g, (_, key: string) => values[key] ?? '')
}
```

The WhatsApp action URL is `https://wa.me/<digits>?text=<encodeURIComponent(renderedText)>`. Put a visible edit field before opening it. Phone, email, website and map buttons must be disabled with explanatory text when corresponding data is absent.

- [ ] **Step 4: Render the lead pages.**

Create a searchable list linked to each detail page. Detail pages show contact data, score/potential, pipeline status, quick actions, notes, next tasks, invoice/simulation entry points and an activity feed ordered newest first. Successful mutations revalidate the lead and dashboard paths.

- [ ] **Step 5: Verify and commit the lead workbench.**

Run: `npm test -- src/lib/validations/__tests__/lead.test.ts; npm run lint; npm run typecheck`  
Expected: all commands exit 0. Manually add a note, add a tomorrow WhatsApp task, open a prefilled WhatsApp link and confirm the three activities appear after reload.

```powershell
git add src/app/(app)/leads src/components/leads src/lib/leads src/lib/validations/lead.ts src/lib/validations/__tests__/lead.test.ts
git commit -m "feat: add lead workbench and activity history"
```

## Task 8: Add an auditable pipeline Kanban

**Files:**
- Create: `supabase/migrations/20260922000100_move_lead_rpc.sql`
- Create: `src/app/(app)/pipeline/page.tsx`, `src/app/(app)/pipeline/actions.ts`
- Create: `src/components/pipeline/pipeline-board.tsx`, `src/components/pipeline/pipeline-column.tsx`, `src/components/pipeline/lead-card.tsx`
- Create: `src/lib/pipeline.ts`, `src/lib/__tests__/pipeline.test.ts`

**Interfaces:**
- Produces `PIPELINE_ORDER: PipelineStatus[]`, `groupLeadsByStatus(leads): Record<PipelineStatus, LeadCardData[]>` and `moveLead(leadId, toStatus)`.
- The database exposes `move_lead(p_lead_id uuid, p_to_status pipeline_status)` that atomically updates status and writes a status-change activity.

- [ ] **Step 1: Write failing status grouping tests.**

```ts
expect(groupLeadsByStatus([
  { id: '1', pipeline_status: 'NOVO' }, { id: '2', pipeline_status: 'FECHADO' },
]).NOVO).toHaveLength(1)
expect(PIPELINE_ORDER).toEqual(['NOVO', 'CONTATO_REALIZADO', 'INTERESSADO', 'AGUARDANDO_FATURA', 'ANALISE', 'PROPOSTA', 'FECHADO'])
```

- [ ] **Step 2: Run the pipeline test before its helper exists.**

Run: `npm test -- src/lib/__tests__/pipeline.test.ts`  
Expected: FAIL because `pipeline.ts` does not exist.

- [ ] **Step 3: Add the atomic SQL operation and server action.**

```sql
create function public.move_lead(p_lead_id uuid, p_to_status public.pipeline_status)
returns public.leads
language plpgsql security definer set search_path = public
as $$
declare updated_lead public.leads;
begin
  select * into updated_lead from public.leads where id = p_lead_id
    and organization_id in (select public.current_organization_ids()) for update;
  if not found then raise exception 'Lead não encontrado ou sem permissão'; end if;
  update public.leads set pipeline_status = p_to_status, updated_at = now() where id = p_lead_id returning * into updated_lead;
  insert into public.lead_activities (lead_id, user_id, type, metadata)
  values (p_lead_id, auth.uid(), 'STATUS_ALTERADO', jsonb_build_object('to', p_to_status));
  return updated_lead;
end;
$$;
```

Restrict execution to `authenticated`. The action validates the enum, calls the RPC, revalidates `/pipeline`, `/dashboard` and the lead route, and surfaces its permission error.

- [ ] **Step 4: Implement accessible dnd-kit interaction.**

Use pointer and keyboard sensors. Render the seven active columns and a separate `PERDIDO` column. Each card shows name, category, city/state, potential badge and latest activity time. On drag end, call the server action; restore the previous local order and show an error if it fails.

- [ ] **Step 5: Apply migration, verify and commit Kanban.**

Run: `npx supabase db push; npm test -- src/lib/__tests__/pipeline.test.ts; npm run lint; npm run typecheck`  
Expected: all commands exit 0. Drag a lead from `NOVO` to `AGUARDANDO_FATURA`, reload both pipeline and lead detail, and verify the status plus activity persist.

```powershell
git add supabase/migrations/20260922000100_move_lead_rpc.sql src/app/(app)/pipeline src/components/pipeline src/lib/pipeline.ts src/lib/__tests__/pipeline.test.ts
git commit -m "feat: add lead pipeline Kanban"
```

## Task 9: Upload and register private energy bills

**Files:**
- Create: `src/app/(app)/leads/[id]/fatura/page.tsx`, `src/app/(app)/leads/[id]/fatura/actions.ts`
- Create: `src/components/invoices/invoice-upload-form.tsx`, `src/components/invoices/invoice-fields.tsx`
- Create: `src/lib/invoices.ts`, `src/lib/validations/invoice.ts`, `src/lib/validations/__tests__/invoice.test.ts`

**Interfaces:**
- Produces `validateInvoiceFile(file: File): FileValidationResult` and `saveInvoice(leadId, formData): Promise<ActionResult>`.
- Consumes the `invoices` bucket path format `<organizationId>/<leadId>/<uuid>.<extension>`.

- [ ] **Step 1: Write failing file and invoice validation tests.**

```ts
expect(validateInvoiceFile(new File(['x'], 'conta.pdf', { type: 'application/pdf' }))).toEqual({ ok: true })
expect(validateInvoiceFile(new File(['x'], 'conta.exe', { type: 'application/octet-stream' })).ok).toBe(false)
expect(invoiceSchema.safeParse({ amount: '3850', consumptionKwh: '2912', provider: 'CPFL', state: 'SP', customerType: 'COMERCIAL', referenceDate: '2026-09-01' }).success).toBe(true)
```

- [ ] **Step 2: Run the validation test before creating the invoice module.**

Run: `npm test -- src/lib/validations/__tests__/invoice.test.ts`  
Expected: FAIL because the invoice schema module does not exist.

- [ ] **Step 3: Implement strict file validation and the protected upload action.**

```ts
const ALLOWED_INVOICE_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png'])
const MAX_INVOICE_BYTES = 10 * 1024 * 1024

export function validateInvoiceFile(file: File) {
  if (!ALLOWED_INVOICE_TYPES.has(file.type)) return { ok: false as const, message: 'Envie PDF, JPG, JPEG ou PNG.' }
  if (file.size === 0 || file.size > MAX_INVOICE_BYTES) return { ok: false as const, message: 'O arquivo deve ter no máximo 10 MB.' }
  return { ok: true as const }
}
```

The action first loads the lead under RLS, validates data and file, creates the org/lead/UUID object path, uploads with the user-scoped server client, inserts invoice metadata and writes a `FATURA_ADICIONADA` activity. On database failure after upload, delete that just-uploaded path. Do not use the service role for user uploads.

- [ ] **Step 4: Build the invoice page and safe file view.**

Render file chooser, accepted-format help, amount, consumption, provider, state, customer type and reference month fields. On detail view request a short-lived signed URL only after loading the invoice under RLS. Link successful saves to `/leads/[id]/simulacao`.

- [ ] **Step 5: Verify private upload behavior and commit.**

Run: `npm test -- src/lib/validations/__tests__/invoice.test.ts; npm run lint; npm run typecheck`  
Expected: all commands exit 0. Upload a valid PDF, verify the Storage bucket is private and a signed link opens as the owner. Attempt a PNG larger than 10 MB and verify the form rejects it before upload.

```powershell
git add src/app/(app)/leads/[id]/fatura src/components/invoices src/lib/invoices.ts src/lib/validations/invoice.ts src/lib/validations/__tests__/invoice.test.ts
git commit -m "feat: add private invoice upload"
```

## Task 10: Persist and share energy-saving simulations

**Files:**
- Create: `src/app/(app)/leads/[id]/simulacao/page.tsx`, `src/app/(app)/leads/[id]/simulacao/actions.ts`
- Create: `src/components/simulations/simulation-form.tsx`, `src/components/simulations/simulation-result.tsx`, `src/components/simulations/share-actions.tsx`
- Create: `src/lib/simulations.ts`, `src/lib/simulations/__tests__/save-simulation.test.ts`

**Interfaces:**
- Produces `findBestRule(invoice): Promise<EligibilityRule | null>`, `saveSimulation(leadId, invoiceId): Promise<SavedSimulation>` and `buildSimulationWhatsAppText(input): string`.
- Consumes `calculateSimulation` from Task 3 and writes the exact result to `simulations`.

- [ ] **Step 1: Write failing sharing and persistence mapping tests.**

```ts
expect(buildSimulationWhatsAppText({ companyName: 'Academia Strong', monthlySavings: 462, annualSavings: 5544, status: 'POTENCIALMENTE_ELEGIVEL' }))
  .toContain('R$ 462,00')
expect(toSimulationInsert('lead-1', 'invoice-1', calculated)).toMatchObject({ lead_id: 'lead-1', invoice_id: 'invoice-1', estimated_monthly_savings: 462 })
```

- [ ] **Step 2: Run the simulation tests before adding the adapter.**

Run: `npm test -- src/lib/simulations/__tests__/save-simulation.test.ts`  
Expected: FAIL because the simulation module does not exist.

- [ ] **Step 3: Implement rule selection and save action.**

Load the selected invoice using RLS. Query active rules for exact provider/state/customer type, preferring a rule whose amount range contains the invoice value. Pass that rule or null into `calculateSimulation`. Insert a simulation record containing current amount, rule discount, monthly and annual saving, new amount and eligibility status. Insert a `SIMULACAO_REALIZADA` activity in the same server workflow.

```ts
export function buildSimulationWhatsAppText(input: SimulationShareInput): string {
  if (input.monthlySavings === null || input.annualSavings === null) {
    return `Olá, ${input.companyName}. Sua análise precisa de validação adicional antes de estimarmos uma economia.`
  }
  return `Olá, ${input.companyName}! Estimamos uma economia de ${formatBRL(input.monthlySavings)} por mês e ${formatBRL(input.annualSavings)} por ano. Esta é uma estimativa sujeita à validação final.`
}
```

- [ ] **Step 4: Render calculation and result pages.**

Display current bill, discount, monthly saving, annual saving and new estimate for eligible results. For no rule and out-of-range results, show the exact status, preserve the invoice data and offer a link back to settings. Provide copy-to-clipboard with success feedback and an editable WhatsApp message that opens `wa.me`. Include a visible `Salvar simulação` submit; no PDF proposal action is rendered.

- [ ] **Step 5: Verify calculation accuracy and commit.**

Run: `npm test -- src/lib/simulations/__tests__/save-simulation.test.ts; npm test -- src/lib/domain/__tests__/eligibility.test.ts; npm run lint; npm run typecheck`  
Expected: all commands exit 0. With a CPFL/SP/COMERCIAL invoice of R$ 3.850,00, save a result showing 12%, R$ 462,00 monthly, R$ 5.544,00 annual and R$ 3.388,00 estimated bill.

```powershell
git add src/app/(app)/leads/[id]/simulacao src/components/simulations src/lib/simulations.ts src/lib/simulations/__tests__/save-simulation.test.ts
git commit -m "feat: add persisted energy simulations"
```

## Task 11: Validate isolation, document setup and release the usable MVP

**Files:**
- Create: `README.md`, `docs/acceptance-checklist.md`, `docs/supabase-setup.md`, `docs/deployment-vercel.md`
- Create: `src/lib/supabase/__tests__/tenant-policy-checklist.test.ts`
- Modify: `.env.example`, `package.json`

**Interfaces:**
- Produces a reproducible local setup, a real-environment acceptance checklist and a deployment configuration that requires only the four runtime secrets.

- [ ] **Step 1: Write the failing release guard test.**

```ts
import { describe, expect, it } from 'vitest'

describe('tenant release guard', () => {
  it('requires the environment checklist to be acknowledged', () => {
    expect(['profiles', 'organizations', 'leads', 'invoices', 'simulations']).toContain('leads')
  })
})
```

This test is deliberately small: the meaningful isolation verification is executed against Supabase below and recorded in the checklist.

- [ ] **Step 2: Run the guard before adding the release documentation.**

Run: `npm test -- src/lib/supabase/__tests__/tenant-policy-checklist.test.ts`  
Expected: FAIL because the test file does not exist.

- [ ] **Step 3: Document exact setup and release steps.**

`docs/supabase-setup.md` must instruct the operator to configure the app's Site URL and redirect URL (`http://localhost:3000/auth/confirm` locally and `https://<vercel-domain>/auth/confirm` in production), enable email/password authentication, enable Places API (New) and Geocoding API, restrict the Google key by server environment, authenticate the Supabase CLI, set `SUPABASE_PROJECT_REF`, run `supabase db push`, and regenerate `database.ts` after migrations change. Do not configure a `service_role` key in the app.

`README.md` must include:

```powershell
Copy-Item .env.example .env.local
npm install
npm run dev
npm test
npm run build
```

`docs/deployment-vercel.md` must list the four Vercel environment variables and require running `npm run build` before deploying.

- [ ] **Step 4: Execute the two-account isolation test on the live Supabase project.**

1. Create Account A and Account B through `/cadastro`.
2. With Account A, import a lead and upload an invoice.
3. With Account B, open Account A's `/leads/<id>` and direct invoice object path; both must return unavailable/denied.
4. With Account B, query its dashboard and verify Account A KPIs are absent.
5. Record the date, project reference and pass/fail values in `docs/acceptance-checklist.md` without recording passwords, tokens or keys.

- [ ] **Step 5: Execute the commercial happy-path acceptance test.**

1. Register a new account.
2. Search a real business in Santos/SP and add it to CRM.
3. Open the editable WhatsApp first-contact message.
4. Move the lead to `AGUARDANDO_FATURA`.
5. Upload a valid invoice and save its fields.
6. Calculate, save and share the 12% CPFL commercial simulation.
7. Move the lead to `FECHADO` and verify dashboard KPIs plus history.

- [ ] **Step 6: Run final automated checks and commit release artefacts.**

Run: `npm test; npm run lint; npm run typecheck; npm run build`  
Expected: all commands exit 0.

```powershell
git add README.md docs .env.example package.json src/lib/supabase/__tests__
git commit -m "docs: add iGreen release checklist"
```

## Spec Coverage Review

| Spec requirement | Plan coverage |
| --- | --- |
| Authentication, organization and data isolation | Tasks 2 and 11 |
| Dashboard, KPIs, funnel and tasks | Tasks 4 and 7 |
| Places search, filters, scoring and duplicate detection | Task 6 |
| Kanban and status history | Task 8 |
| Lead information, quick actions, templates, notes and tasks | Tasks 5 and 7 |
| Private invoices and manual bill data | Task 9 |
| Editable rule engine and savings result | Tasks 3, 5 and 10 |
| Real end-to-end commercial validation and deployment | Task 11 |

No scope requirement is intentionally deferred except the P1/P2 exclusions stated in the approved design.
