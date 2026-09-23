# Publicação na Vercel

1. Importe o repositório na Vercel e selecione o preset Next.js.
2. Cadastre `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `GOOGLE_MAPS_API_KEY`. Defina `NEXT_PUBLIC_SITE_URL` como o domínio HTTPS final.
3. No Supabase Auth, configure Site URL e Redirect URL para `https://<dominio>/auth/confirm`.
4. Confirme que as migrations estão aplicadas ao projeto correto, que o bucket `invoices` é privado e que a chave do Google está restrita às APIs utilizadas.
5. Execute localmente `npm test`, `npm run lint`, `npm run typecheck` e `npm run build`; então publique pela Vercel e teste cadastro, pesquisa, upload e simulação.

Antes de disponibilizar publicamente, revise Termos e Privacidade para incluir identificação legal e canal de contato do controlador, processo de direitos/exclusão e condições específicas da operação. Faça também um teste com duas contas distintas para confirmar o isolamento multi-tenant.
