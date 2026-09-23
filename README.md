# Prospect Energy

Aplicação web em português para prospecção de empresas, CRM de leads, pipeline comercial e estimativas de economia de energia.

## Rodar localmente

Requisitos: Node.js 20.9+ (Node 24 recomendado) e um projeto Supabase ativo.

```powershell
Copy-Item .env.example .env.local
npm ci
npm run dev
```

Configure em `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GOOGLE_MAPS_API_KEY`
- `NEXT_PUBLIC_SITE_URL` (opcional; padrão `http://localhost:3000`)

Nunca use a chave `service_role` no aplicativo. As tabelas e o bucket privado precisam ter as migrations de `supabase/migrations` aplicadas ao projeto Supabase. Configure a autenticação por e-mail e o URL de retorno `/auth/confirm` no painel do Supabase.

## Verificações

```powershell
npm test
npm run lint
npm run typecheck
npm run build
```

Consulte [setup do Supabase](docs/supabase-setup.md), [publicação na Vercel](docs/deployment-vercel.md) e [checklist de aceite](docs/acceptance-checklist.md). A política de Places exige atribuição visível e uso transitório dos resultados; os dados no CRM são digitados pelo usuário, exceto o place ID permitido para deduplicação.
