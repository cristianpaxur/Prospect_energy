# Prospecção e fluxo de leads — design aprovado

**Data:** 2026-09-23

**Status:** aprovado para revisão da especificação

**Objetivo:** priorizar empresas ainda não cadastradas no CRM, tornar clara a próxima ação de cada lead e dar mais fluidez à interface sem alterar sua identidade visual.

## 1. Decisões confirmadas

- Ao adicionar uma empresa ao CRM, somente a linha dessa empresa sai da busca atual. As demais continuam disponíveis.
- Em buscas futuras, empresas ainda não cadastradas podem aparecer novamente. A filtragem persistente vale apenas para `place_id` que já esteja no CRM da mesma organização.
- Não haverá uma tabela separada de empresas meramente pesquisadas nem armazenamento permanente dos dados completos retornados pelo Google Places.
- A ficha do lead deve mostrar primeiro a etapa atual, a próxima ação e o contato prioritário. As funções secundárias continuam acessíveis em uma hierarquia mais compacta.
- O acabamento visual usará animações curtas e discretas, sem adicionar uma biblioteca de movimento, e respeitará a preferência de movimento reduzido do sistema.

## 2. Prospecção de empresas

### Busca e persistência

O CRM continua sendo a fonte de verdade para empresas já importadas. A coluna `leads.external_place_id`, com unicidade por `(organization_id, external_place_id)`, identifica empresas já cadastradas. Não será criado um cache adicional de IDs pesquisados.

Depois de receber uma página do Google Places, o servidor consulta os `place_id` correspondentes no CRM da organização autenticada e remove somente esses resultados. A consulta deve ser limitada aos IDs da página, não a todos os leads da organização. Os campos da empresa retornados pelo Places não serão gravados para uso como cache.

Ao concluir uma inclusão individual ou em lote, a interface remove da busca atual as empresas confirmadas como já cadastradas. Resultados não importados permanecem visíveis. Se a mesma empresa for localizada mais tarde, a busca a oculta por já existir no CRM.

### Continuação dos resultados

Adicionar a ação explícita **Buscar mais empresas**. Ela usa `nextPageToken`/`pageToken` do Text Search (New), mantendo iguais os filtros da busca inicial. Cada página retorna no máximo 20 resultados e só é solicitada após ação do usuário. O token e os filtros da busca ativa ficam no estado da interface; não são persistidos como histórico de busca.

Ao iniciar uma busca com novos filtros, a interface descarta o token anterior. Se não houver próxima página, a ação de continuação não aparece. Resultados já cadastrados podem fazer uma página render menos de 20 empresas; a interface informa isso sem buscar páginas adicionais automaticamente.

Cada página solicitada continua sendo uma chamada ao Google. O fluxo evita repetir a primeira página apenas para continuar a mesma busca, mas não promete reduzir o custo de cada chamada. Place IDs podem ser armazenados; outros dados de conteúdo do Places não serão armazenados como cache persistente, conforme as [políticas do Places](https://developers.google.com/maps/documentation/places/web-service/policies). A paginação oficial usa um token retornado e filtros iguais aos da busca original, conforme a [referência de Text Search](https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places/searchText).

### Contrato e limites

- O request de busca aceita um `pageToken` opcional junto dos filtros atuais.
- A resposta inclui as empresas da página e, quando fornecido pelo Google, o próximo token.
- O request ao Google usa `pageSize: 20`; deixa de usar `maxResultCount`, que está depreciado.
- O field mask solicita `nextPageToken` além dos campos necessários para exibir a página atual.
- Busca, filtro por organização e importação continuam executados no servidor com a sessão autenticada e as regras de isolamento existentes.

## 3. Ficha e avanço de leads

### Hierarquia principal

No topo da ficha, exibir:

1. Empresa, localização, segmento e score.
2. Progresso do pipeline e etapa atual, com ação **Avançar etapa** para a próxima etapa normal e uma opção para escolher qualquer etapa válida, incluindo `FECHADO` e `PERDIDO`.
3. Cartão **Próxima ação**, mostrando a tarefa pendente mais próxima, seu prazo e o estado de vencimento. A tarefa pode ser concluída no próprio cartão. Sem tarefa pendente, o cartão oferece criação de uma tarefa.
4. Contato prioritário, com WhatsApp em destaque; as demais ações de contato ficam em um grupo secundário.

### Conteúdo secundário

Preservar dados editáveis da empresa, fatura e simulação, anotações e histórico. Reorganizá-los abaixo da área de ação principal em grupos mais compactos, sem remover funcionalidades nem persistência.

### Operações

A alteração de etapa reutiliza a operação `move_lead` existente, mantendo a gravação da atividade e a validação de permissões. A ação acessível na ficha também revalida a própria página, o pipeline, o dashboard e a lista de leads após sucesso. Tarefas e atividades continuam associadas ao lead e à organização atuais.

## 4. Movimento e acabamento visual

- Aplicar transições curtas a botões, links, cartões e indicadores de etapa para comunicar foco, hover, pressionamento e conclusão.
- Usar uma entrada discreta para o conteúdo da página e feedback breve ao mudar de etapa ou concluir uma tarefa.
- Manter paleta, tipografia e estrutura visual atuais; não usar animações longas, parallax, áudio ou movimento que altere a leitura do conteúdo.
- Implementar com CSS já disponível no projeto, sem nova dependência.
- Sob `prefers-reduced-motion: reduce`, desativar movimento não essencial e manter feedback por cor, foco ou texto.
- Garantir que os controles da etapa, ações secundárias e seções compactas sejam utilizáveis por teclado e mantenham foco visível.

## 5. Segurança e dados

- Consultas para filtrar resultados existentes sempre usam `organization_id` da sessão autenticada.
- A deduplicação continua protegida pela unicidade de `external_place_id` por organização e pela verificação já feita na importação.
- Não introduzir tabela, índice ou migração para cache de resultados de Places.
- Não expor a chave do Google no navegador. O token de paginação é encaminhado ao servidor, que continua sendo o único cliente do Google Places.
- A nova ação de etapa verifica o acesso ao lead antes de executar a RPC existente.

## 6. Critérios de aceite

1. Adicionar uma empresa remove apenas essa linha da busca atual; linhas não adicionadas permanecem nela.
2. Uma busca posterior omite empresas já cadastradas na organização atual, mas não omite empresas que foram apenas exibidas.
3. Uma organização não afeta os resultados deduplicados de outra organização.
4. **Buscar mais empresas** solicita uma página somente após clique, preserva os filtros originais e não solicita páginas automaticamente para compensar resultados filtrados.
5. O botão de continuação desaparece quando não há token seguinte.
6. A ficha permite avançar ou selecionar uma etapa válida sem voltar ao Kanban; a atividade da mudança aparece no histórico e os demais painéis refletem o novo status.
7. O cartão de próxima ação destaca prazo/vencimento, permite concluir a tarefa e oferece criação quando não existe tarefa pendente.
8. WhatsApp continua sendo a ação de contato mais visível; os dados, notas, histórico, fatura e simulação continuam acessíveis.
9. Movimento reduzido desativa transições decorativas, sem ocultar informação ou feedback funcional.

## 7. Fora de escopo

- Cache persistente de empresas que ainda não entraram no CRM.
- Cache permanente de nome, endereço, telefone, site, avaliações, coordenadas ou outros campos devolvidos pelo Google Places.
- Automação comercial que mude de etapa sem ação explícita do usuário.
- Alteração da sequência ou semântica das etapas existentes.
- Redesign global da marca, nova biblioteca de animação ou remodelagem do pipeline Kanban.

## 8. Referências

- [Google Places API — políticas e atribuições](https://developers.google.com/maps/documentation/places/web-service/policies)
- [Google Places API — Text Search (New)](https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places/searchText)
