# Prospecção e fluxo de leads — plano de implementação

> **Para agentes de implementação:** subskill obrigatória: use `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans` para executar este plano tarefa por tarefa. Os passos usam caixas de seleção (`- [ ]`) para acompanhamento.

**Goal:** Fazer as buscas avançarem por páginas sem repetir empresas já no CRM, e colocar etapa, próxima ação e contato em primeiro plano na ficha do lead.

**Architecture:** O Route Handler autenticado continua chamando Google Places no servidor. Ele filtra os IDs existentes apenas na organização atual e devolve o próximo token; o componente de prospecção mantém o token da busca ativa e só pede outra página por clique. A ficha reaproveita a RPC de mudança de etapa e os dados existentes de tarefas, atividades, faturas e simulações. Microanimações ficam no CSS global, sem dependência nova.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase SSR/Postgres, Google Places API (New), CSS global existente.

**Spec:** `docs/superpowers/specs/2026-09-23-prospecting-lead-flow-design.md`

## Restrições globais

- “Ao adicionar uma empresa ao CRM, somente a linha dessa empresa sai da busca atual. As demais continuam disponíveis.”
- “Em buscas futuras, empresas ainda não cadastradas podem aparecer novamente.”
- “Não haverá uma tabela separada de empresas meramente pesquisadas nem armazenamento permanente dos dados completos retornados pelo Google Places.”
- “Cada página retorna no máximo 20 resultados e só é solicitada após ação do usuário.”
- “O token e os filtros da busca ativa ficam no estado da interface; não são persistidos como histórico de busca.”
- “Não expor a chave do Google no navegador.”
- “Implementar com CSS já disponível no projeto, sem nova dependência.”
- “Sob `prefers-reduced-motion: reduce`, desativar movimento não essencial e manter feedback por cor, foco ou texto.”
- Antes de editar código de Route Handler, consultar `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`; antes de revalidar Server Actions, consultar `node_modules/next/dist/docs/01-app/01-getting-started/09-revalidating.md`; antes do CSS global, consultar `node_modules/next/dist/docs/01-app/01-getting-started/11-css.md`. Essas versões locais foram consultadas ao preparar o plano.
- Não adicionar nem executar testes automatizados nesta execução; essa atividade não foi solicitada.

---

## Mapa de arquivos

| Arquivo | Responsabilidade nesta mudança |
| --- | --- |
| `src/lib/validations/prospect.ts` | Validar filtros atuais e token opcional de paginação. |
| `src/lib/google-places.ts` | Enviar `pageToken`, usar `pageSize`, expor a próxima página e manter as chamadas ao Google no servidor. |
| `src/app/api/prospect/search/route.ts` | Validar autenticação, resolver a organização, filtrar IDs do CRM e montar a resposta do Route Handler. |
| `src/components/prospect/prospect-search.tsx` | Controlar busca nova, paginação sob demanda, inclusão e remoção local dos leads adicionados. |
| `src/app/(app)/pipeline/actions.ts` | Revalidar também a lista de leads após mudança de etapa. |
| `src/app/(app)/leads/[id]/page.tsx` | Organizar a ficha em torno de progresso, próxima ação e contato. |
| `src/components/leads/lead-header.tsx` | Exibir identidade do lead e estado do pipeline sem competir com a próxima ação. |
| `src/components/leads/lead-stage-control.tsx` | Novo controle acessível para avançar ou escolher uma etapa. |
| `src/components/leads/lead-next-action.tsx` | Novo cartão para tarefa pendente, prazo, conclusão e criação de tarefa. |
| `src/components/leads/quick-actions.tsx` | Destacar WhatsApp e agrupar ações de contato secundárias. |
| `src/app/globals.css` | Microanimações, estados de interação e suporte a movimento reduzido. |

## Task 1: Adicionar paginação e filtro por empresas no CRM

**Arquivos:**

- Modificar: `src/lib/validations/prospect.ts`
- Modificar: `src/lib/google-places.ts`
- Modificar: `src/app/api/prospect/search/route.ts`

**Interfaces:**

- Consumir os filtros já definidos em `ProspectFilters`.
- Produzir `ProspectSearchRequest = ProspectFilters & { pageToken?: string }`.
- Fazer `searchBusinesses(filters, pageToken?)` retornar `{ businesses: ProspectBusiness[]; nextPageToken: string | null }`.
- A resposta `POST /api/prospect/search` passa a ser `{ businesses: ProspectBusiness[]; nextPageToken: string | null; skippedExistingCount: number }`.

- [x] **Passo 1: Estender o schema do request sem alterar o schema de importação.**

Adicionar `prospectSearchRequestSchema` a partir de `prospectFiltersSchema`, com `pageToken` opcional, texto não vazio e limite de tamanho de 4096 caracteres. Exportar o tipo inferido `ProspectSearchRequest`. Manter `prospectFiltersSchema` isolado para os consumidores que só precisam dos filtros.

- [x] **Passo 2: Atualizar o adaptador do Google Places para página atual.**

Ampliar o tipo `GoogleResponse<T>` com `nextPageToken?: string`. Alterar `searchBusinesses` para aceitar um `pageToken` opcional, colocar esse campo no body apenas quando houver valor, usar `pageSize: 20` e remover `maxResultCount`. Acrescentar `nextPageToken` ao field mask e devolver `null` quando o Google não fornecer uma próxima página. Manter geocodificação, filtros de raio/contato/avaliação e `cache: 'no-store'` atuais.

```ts
export type ProspectSearchPage = {
  businesses: ProspectBusiness[]
  nextPageToken: string | null
}

export async function searchBusinesses(
  filters: ProspectFilters,
  pageToken?: string,
): Promise<ProspectSearchPage>
```

- [x] **Passo 3: Preservar respostas de erro JSON e resolver organização autenticada no Route Handler.**

Manter as respostas JSON já existentes para variáveis ausentes, sessão inválida e body inválido. Após autenticar com `supabase.auth.getUser()`, buscar o `organization_id` em `organization_members` para `user.id`; responder com erro JSON se a associação não existir. Não aceitar organização enviada pelo browser.

- [x] **Passo 4: Consultar apenas place IDs da página dentro dessa organização.**

Separar `pageToken` dos filtros validados e chamar `searchBusinesses(filters, pageToken)`. Se a página contiver IDs, consultar `leads` selecionando somente `external_place_id`, com filtros por `organization_id` da associação e `in('external_place_id', pagePlaceIds)`. Em erro de banco, responder erro em vez de retornar resultados potencialmente duplicados. Remover da resposta apenas os lugares encontrados no CRM daquela organização, devolver o token original de continuação e o total `skippedExistingCount` filtrado nesta página.

**Entrega:** a API mantém autenticação e atribuição Google existentes, filtra leads por tenant e expõe o cursor oficial sem persistir dados de Places.

## Task 2: Permitir avançar resultados e retirar apenas empresas importadas

**Arquivos:**

- Modificar: `src/components/prospect/prospect-search.tsx`

**Interfaces:**

- O formulário existente inicia uma nova busca sem token.
- A ação `Buscar mais empresas` reenvia exatamente os filtros salvos da busca ativa com o `nextPageToken` recebido.
- O estado local da busca mantém `businesses`, `activeFilters` e `nextPageToken` em memória enquanto a busca estiver aberta.

- [x] **Passo 1: Separar início de busca e continuação.**

Extrair os filtros atuais para um objeto `activeFilters`. No envio normal, limpar resultado, seleção, formulário de edição em lote e token antigo; salvar os filtros; chamar a API sem `pageToken`; substituir a lista pela primeira página; salvar o próximo token e o `skippedExistingCount`. Preservar mensagens de erro e estado de carregamento atuais.

- [x] **Passo 2: Adicionar a continuação explícita.**

Criar um handler de continuação que não leia novamente os inputs editáveis. Ele envia `activeFilters` mais o token atual, acrescenta empresas à lista existente em vez de substituí-la, evita IDs repetidos comparando `placeId` e acumula o `skippedExistingCount` das páginas consultadas. Mostrar carregamento separado para a continuação. Renderizar **Buscar mais empresas** somente se houver `nextPageToken`; não carregar páginas automaticamente se uma página vier vazia após filtros.

- [x] **Passo 3: Remover apenas empresas confirmadas no CRM após inclusão.**

No fluxo em lote, guardar os `placeId` selecionados antes da Server Action. Quando a importação retornar sucesso, remover esses IDs da lista atual, limpar seleção/campos correspondentes e manter os demais resultados e o cursor. No fluxo individual, remover a empresa após confirmação de que foi criada ou já existia no CRM. Em caso de erro, manter a empresa visível e preservar os demais resultados.

- [x] **Passo 4: Expor contagem, atribuição e estados de continuidade.**

Atualizar a contagem para refletir empresas atualmente disponíveis, manter a atribuição “Powered by Google” e informar quantos lugares já consultados foram ocultados por estarem no CRM. Apresentar um estado claro quando não houver mais páginas ou quando a lista atual estiver vazia. O estado de carregamento não deve apagar a página que o usuário já está revisando quando apenas carrega a próxima.

**Entrega:** empresas importadas saem da lista atual; resultados ainda não importados continuam disponíveis; novas páginas dependem de clique e preservam filtros.

## Task 3: Transformar a ficha numa área de acompanhamento e ação

**Arquivos:**

- Modificar: `src/app/(app)/leads/[id]/page.tsx`
- Modificar: `src/components/leads/lead-header.tsx`
- Criar: `src/components/leads/lead-stage-control.tsx`
- Criar: `src/components/leads/lead-next-action.tsx`
- Modificar: `src/components/leads/quick-actions.tsx`
- Modificar: `src/app/(app)/pipeline/actions.ts`

**Interfaces:**

- `LeadStageControl` recebe `{ leadId: string; status: PipelineStatus }` e chama a Server Action existente `moveLeadAction(leadId, toStatus)`.
- `LeadNextAction` recebe `{ leadId: string; tasks: LeadTask[] }`, onde `LeadTask = { id: string; type: string; description: string; due_at: string; completed_at: string | null; created_at: string }`, conforme o formato já retornado por `getLeadDetail`.
- `moveLeadAction` continua usando `move_lead` e, após sucesso, revalida detalhe, lista, Kanban e dashboard.

- [x] **Passo 1: Implementar o controle de etapa sem duplicar regra de negócio.**

Usar `PIPELINE_ORDER` para calcular a próxima etapa normal. O botão **Avançar etapa** chama `moveLeadAction` para o próximo item; desabilitar quando o status atual for `FECHADO` ou `PERDIDO`. Adicionar um `<select>` nativo com todas as etapas válidas, inclusive `FECHADO` e `PERDIDO`, para correções e saltos de etapa. Construir as opções em ordem com `PIPELINE_ORDER` e acrescentar `PERDIDO` como estado final alternativo; usar os rótulos portugueses já usados na ficha e no Kanban. Desabilitar controles durante a transição e mostrar erro/sucesso em uma região `aria-live`.

- [x] **Passo 2: Tornar a próxima tarefa a primeira ação visível.**

Usar as tarefas já ordenadas por `due_at` em `getLeadDetail`; selecionar a primeira sem `completed_at`. Exibir descrição, data, hora e estado vencido/no prazo, com ação **Marcar concluída** ligada a `completeTask`. Se não houver tarefa em aberto, exibir o `TaskForm` como ação principal. Se houver uma tarefa, manter criação de outra disponível em uma seção secundária.

- [x] **Passo 3: Reorganizar cabeçalho e ações de contato.**

Manter nome, segmento, score e localização no cabeçalho. Colocar o controle do pipeline e o cartão de próxima ação antes de histórico e dados auxiliares. Dar destaque visual ao botão WhatsApp de `QuickActions`; agrupar ligação, e-mail, site, copiar e mapa em `<details>` com rótulo acessível. Preservar edição da mensagem antes de abrir WhatsApp e o registro de atividade existente.

- [x] **Passo 4: Agrupar os detalhes sem remover funcionalidades.**

Reorganizar `page.tsx` para que fatura/simulação, dados editáveis, anotações e histórico apareçam depois do bloco de acompanhamento em cartões compactos. Usar elementos nativos `<details>/<summary>` nas áreas secundárias que forem recolhidas, mantendo título e estado legíveis por teclado e leitor de tela. Preservar o `GooglePlaceProvider`, `GooglePlacePanel` e todos os links existentes.

- [x] **Passo 5: Revalidar consumidores do status após movimento.**

Em `moveLeadAction`, manter validação de status e a RPC `move_lead`; acrescentar `revalidatePath('/leads')` após sucesso. Não alterar a migration/RPC, a ordem do pipeline nem as atividades já registradas atomicamente.

**Entrega:** etapa e próxima ação ficam visíveis e operáveis na ficha; o Kanban e as demais páginas continuam sincronizados.

## Task 4: Adicionar acabamento de movimento acessível

**Arquivos:**

- Modificar: `src/app/globals.css`
- Modificar: `src/app/(app)/leads/[id]/page.tsx`
- Modificar: `src/components/leads/lead-stage-control.tsx`
- Modificar: `src/components/leads/lead-next-action.tsx`

- [x] **Passo 1: Criar movimento de entrada de página curto.**

Adicionar uma animação CSS de opacidade e deslocamento vertical de poucos pixels para o conteúdo principal, sem atrasar a interação e sem aplicar atraso em cascata a cada cartão.

- [x] **Passo 2: Dar feedback a controles e cartões acionáveis.**

Refinar transitions existentes de `.btn`; adicionar estado de pressão ao botão e hover/focus discreto apenas a cartões e links interativos. Não aplicar elevação ou cursor de clique em cartões apenas informativos.

- [x] **Passo 3: Animar mudança de etapa e conclusão de tarefa.**

Adicionar transition breve ao indicador de etapa e ao estado visual da tarefa. O texto de estado e o feedback `aria-live` continuam presentes; animação não é a única forma de comunicar sucesso ou erro.

- [x] **Passo 4: Desativar movimento decorativo quando solicitado.**

Adicionar `@media (prefers-reduced-motion: reduce)` que remove animações de entrada, encurta/remove transitions decorativas e preserva estados de foco, cores, mensagens e estados pendentes funcionais.

**Entrega:** a aplicação responde às interações com microanimações coerentes com o estilo atual e oferece a mesma informação sem movimento.

## Cobertura da especificação

| Requisito aprovado | Tarefa |
| --- | --- |
| Filtrar apenas place IDs já no CRM e respeitar organização | 1 |
| Não persistir cache de empresas não importadas nem dados do Places | 1 |
| Continuar resultados sob demanda, máximo de 20 por página | 1 e 2 |
| Remover da busca atual somente empresas adicionadas | 2 |
| Mostrar e atualizar etapa diretamente na ficha | 3 |
| Próxima ação, prazo, conclusão e criação de tarefa no topo | 3 |
| Priorizar WhatsApp e compactar funções secundárias | 3 |
| Preservar fatura, simulação, edição, notas e histórico | 3 |
| Microanimações e preferência de movimento reduzido | 4 |

Não estão previstas alterações de schema ou novas dependências. A execução deste plano não inclui adicionar nem executar testes automatizados.
