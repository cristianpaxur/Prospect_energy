# iGreen MVP — Design aprovado

**Data:** 2026-09-22  
**Status:** aprovado para planejamento  
**Objetivo:** entregar um SaaS web operacional para licenciados iGreen prospectarem empresas, acompanharem oportunidades e simularem economia de energia.

## 1. Resultado de negócio

Um licenciado novo deve conseguir, sem apoio técnico:

1. criar sua conta e organização;
2. buscar empresas reais na sua região;
3. incluir empresas no CRM sem duplicidades;
4. contatá-las pelo WhatsApp;
5. registrar atividades e avançar o lead no funil;
6. enviar uma fatura privada, preencher seus dados e calcular uma economia;
7. compartilhar o resultado e fechar ou perder a oportunidade.

O produto será implantado para uso imediato, não como protótipo com dados simulados.

## 2. Decisões de escopo

### Incluído (P0)

- Cadastro, login, recuperação de senha e logout.
- Organização por licenciado e isolamento completo de dados.
- Dashboard com indicadores reais, funil e tarefas pendentes.
- Pesquisa de empresas via Google Places por cidade, segmento e raio.
- Score determinístico, inclusão em lote no CRM e prevenção de duplicidades.
- Kanban com histórico de mudança de status.
- Detalhe do lead, notas, tarefas, atividades e ações rápidas.
- Link do WhatsApp com template editável e variáveis básicas.
- Upload privado de fatura (PDF, JPG, JPEG e PNG de até 10 MB).
- Preenchimento manual dos dados da fatura.
- Motor de regras configurável no banco e simulações persistidas.
- Compartilhamento do resultado por WhatsApp e cópia do resumo.

### Excluído deste ciclo

- OCR, IA, WhatsApp Business API, automações, proposta PDF, enriquecimento por CNPJ, gestão de equipe, BI avançado e aplicativo nativo.

## 3. Arquitetura

O aplicativo será um monólito web com Next.js e TypeScript, hospedado na Vercel. O Supabase fornecerá autenticação, PostgreSQL, Row Level Security e armazenamento de faturas. A busca de empresas usará a API oficial Google Places através de código executado no servidor; a chave nunca será enviada ao navegador.

Componentes:

- **Next.js App Router:** páginas autenticadas, UI responsiva, server actions/route handlers e validações.
- **Supabase Auth:** cadastro, sessão, recuperação de senha e perfil do usuário.
- **Supabase Postgres:** fonte de verdade transacional para CRM, regras e simulações.
- **Supabase Storage:** bucket privado de faturas, acessado apenas por URL assinada.
- **Google Places API:** descoberta de empresas reais a partir dos filtros do usuário.

Variáveis de ambiente necessárias:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GOOGLE_MAPS_API_KEY
```

As chaves serão fornecidas localmente em `.env.local`, que ficará ignorado pelo Git. A configuração de produção será feita nas variáveis da Vercel.

## 4. Domínio e dados

Todas as entidades de negócio carregam `organization_id` de forma direta ou por meio do lead. As políticas RLS derivam a organização do usuário autenticado; a interface não é uma fronteira de segurança.

| Entidade | Responsabilidade |
| --- | --- |
| `profiles` | Perfil do licenciado, associado a `auth.users`. |
| `organizations` | Tenant comercial, criado com o primeiro usuário. |
| `organization_members` | Vínculo usuário-organização, iniciado com o owner. |
| `leads` | Empresa no CRM, dados de contato, score e status. |
| `lead_notes` | Notas textuais auditáveis. |
| `tasks` | Próximas ações, prazo e conclusão. |
| `lead_activities` | Linha do tempo: criação, contato, mudança de status, fatura e simulação. |
| `invoices` | Metadados da fatura e caminho seguro do arquivo. |
| `eligibility_rules` | Critérios editáveis por distribuidora, estado e tipo de cliente. |
| `simulations` | Resultado imutável de cada cálculo. |
| `message_templates` | Textos de WhatsApp por organização. |

`leads` terá uma restrição única por `(organization_id, external_place_id)` quando houver `place_id` do Google. Sem identificador externo, a aplicação verificará uma chave normalizada de nome e endereço na mesma organização e alertará antes de inserir.

## 5. Regras de negócio

### Pipeline

Os status são `NOVO`, `CONTATO_REALIZADO`, `INTERESSADO`, `AGUARDANDO_FATURA`, `ANALISE`, `PROPOSTA`, `FECHADO` e `PERDIDO`. Arrastar um card atualiza o lead e cria uma atividade na mesma operação.

### Score

O score inicial é explicável e limitado a 100:

- Academia: +30; Mercado: +40; Hotel: +40; Restaurante: +25.
- Site: +5; telefone: +10; horário de funcionamento superior a 12 horas: +10.
- 0–30 baixo, 31–60 médio, 61–80 alto, 81–100 muito alto.

É prioridade comercial, não elegibilidade oficial.

### Elegibilidade e simulação

O cálculo consulta a regra ativa mais específica para distribuidora, estado e tipo de cliente. A regra inicialmente semeada será:

```text
CPFL / SP / Comercial / desconto de 12%
```

O desconto, faixas mínima/máxima e ativação ficam no banco e são administráveis em Configurações. Se não houver regra aplicável, o resultado será `NECESSITA_VALIDACAO`; valores fora da faixa serão `FORA_DOS_CRITERIOS`; os demais serão `POTENCIALMENTE_ELEGIVEL`.

Para uma conta de valor `V` e desconto `D`, a simulação persiste:

```text
economia_mensal = V × D / 100
economia_anual = economia_mensal × 12
nova_estimativa = V − economia_mensal
```

Todo resultado declara que é estimativa sujeita à validação final.

### Arquivos e contatos

A fatura aceita somente PDF, JPG, JPEG e PNG de até 10 MB. O arquivo permanece em bucket privado, com caminho sob a organização e links assinados de curta duração. Ações de WhatsApp usam `wa.me` com texto pré-preenchido; não haverá envio automático.

## 6. Jornadas e páginas

| Rota | Função |
| --- | --- |
| `/login`, `/cadastro`, `/recuperar-senha` | Autenticação e onboarding. |
| `/dashboard` | KPIs reais, funil e tarefas do dia. |
| `/prospectar` | Filtros Places, tabela de resultados, score e inclusão em lote. |
| `/pipeline` | Kanban e movimentação de oportunidades. |
| `/leads` | Lista pesquisável de leads. |
| `/leads/[id]` | Ficha, ações, notas, histórico e tarefas. |
| `/leads/[id]/fatura` | Upload e confirmação manual dos dados. |
| `/leads/[id]/simulacao` | Resultado, compartilhamento e histórico de simulações. |
| `/configuracoes` | Perfil, organização, preferências, regras e templates. |

A experiência adotará navegação lateral escura e a hierarquia visual da referência fornecida, sendo responsiva, acessível por teclado e com estados vazios que indicam o próximo passo.

## 7. Segurança e erros

- RLS habilitado para todas as tabelas expostas; políticas para leitura/escrita somente dentro da organização do usuário.
- Operações privilegiadas, criação da organização e pesquisa Google ficam no servidor.
- Validação no servidor de payloads, permissões, tipo e tamanho de arquivos.
- Nenhuma chave privada vai ao cliente e `.env.local` não é versionado.
- Erros de Places, duplicidade, formulário, regra ausente, upload e acesso negado recebem mensagens acionáveis; não se descarta informação já preenchida.

## 8. Verificação

- Testes unitários para score, seleção de regra, classificação de elegibilidade e valores monetários.
- Testes para schemas e limites de upload.
- Testes de interface para fluxos de inclusão e simulação quando viável.
- Checklist manual com Supabase e Google Places reais: conta nova → pesquisa → CRM → WhatsApp → fatura → simulação → fechamento.

## 9. Critério de pronto

O MVP estará pronto quando o fluxo ponta a ponta acima funcionar com credenciais reais e os dados de uma organização não forem visíveis, alteráveis ou baixáveis por outra organização.
