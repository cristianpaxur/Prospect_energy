# Configuração do Supabase

1. Crie um projeto Supabase e copie a Project URL e a chave pública `anon` para `.env.local` (nunca use `service_role` no app).
2. Aplique as migrations em `supabase/migrations` no projeto vinculado. Com Supabase CLI autenticada: defina `SUPABASE_PROJECT_REF`, execute `npx supabase link --project-ref <project-ref>` e `npx supabase db push`. Em alternativa, aplique cada arquivo SQL em ordem pelo SQL Editor.
3. No painel, habilite autenticação por e-mail e senha. Configure Site URL para `http://localhost:3000` e Redirect URL `http://localhost:3000/auth/confirm` para desenvolvimento. Para produção, adicione o domínio HTTPS do app em ambos.
4. No Google Cloud, habilite Places API (New), Geocoding API e faturamento. Crie uma chave restrita às APIs necessárias; mantenha-a somente no servidor como `GOOGLE_MAPS_API_KEY`.
5. Reinicie `npm run dev`, cadastre uma conta e confirme o e-mail. O gatilho cria perfil, workspace, regra inicial CPFL/SP/Comercial (12%) e modelos de mensagem.

As operações usam a chave pública com sessão autenticada e RLS. Não gere URLs públicas para faturas; o bucket `invoices` deve permanecer privado.

## Alterações futuras no schema

Crie uma migration SQL versionada em `supabase/migrations` e aplique-a antes de publicar código que dependa dela. Depois, regenere/atualize os tipos do banco em `src/lib/supabase/database.ts` usando a Supabase CLI vinculada. Nunca coloque senhas, tokens ou chaves no repositório.
