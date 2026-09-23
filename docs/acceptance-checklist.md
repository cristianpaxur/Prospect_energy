# Checklist de aceite do MVP

## Infraestrutura verificada nesta implementação

- [x] `npm run dev` inicia em `http://localhost:3000`.
- [x] `/login` responde HTTP 200.
- [x] Smoke test autenticado: login, pesquisa Google, importação ao CRM e navegação de pipeline, lista, detalhe e fatura retornaram HTTP 200 no servidor local em 23/09/2026.
- [x] As rotas REST de `leads`, `invoices`, `simulations` e `eligibility_rules` respondem HTTP 200 no Supabase configurado.
- [x] Bucket `invoices` confirmado como privado, limite de 10 MB, PDF/JPEG/PNG.
- [x] `.env` e `.env.local` são ignorados pelo Git.

## Teste manual antes de uso comercial

- [ ] Confirmar cadastro por e-mail (não foi necessário criar nova conta durante o teste de login).
- [x] Buscar uma empresa real com Places e exibir os resultados.
- [ ] Confirmar importação com os dados manualmente preenchidos e tentar um segundo import para confirmar deduplicação.
- [ ] Confirmar a adição rápida na própria linha do Prospectar e abrir o lead pelo link da linha.
- [ ] No lead, carregar a ficha/foto do Google e confirmar atribuição da foto, link para o Maps e que os dados não aparecem como campos salvos no CRM.
- [ ] Registrar contato, nota, tarefa e mudança de etapa no pipeline.
- [ ] Enviar fatura de teste, abrir link assinado e confirmar expiração.
- [ ] Para CPFL/SP/Comercial em R$ 3.850, conferir 12%, R$ 462/mês, R$ 5.544/ano e nova estimativa de R$ 3.388.
- [ ] Repetir o acesso com segunda conta e confirmar que ela não lê leads, arquivos nem indicadores da primeira.
- [ ] Completar identificação do controlador e revisar Termos/Privacidade antes de abrir cadastro publicamente.

Os testes de fluxo autenticado dependem de contas de teste e não foram executados automaticamente para evitar criar dados sem autorização.
