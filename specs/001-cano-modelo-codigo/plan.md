# Implementation Plan: Cano modelo ⇄ código

**Branch**: `cano-modelo-codigo` (feature `001-cano-modelo-codigo`) | **Date**: 2026-07-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-cano-modelo-codigo/spec.md`

## Summary

O R0 prova que **diagrama e código são duas vistas de um modelo só**, nos dois sentidos, com o código
saindo como produto final. A realização técnica é uma aplicação client-only de tela única (ADR-001)
com quatro componentes encostando num **modelo de domínio próprio em memória, a única verdade**
(ADR-003): o **codec mermaid** (único caminho texto ⇄ modelo, ADR-006/008), a **área do diagrama**
(React Flow, ADR-002) que consome uma **projeção com reuso de objeto** (ADR-004), o **editor de
código** (vista e produtor de comandos), e o **arranjo** de sessão (posição por identificador,
não-serializável, ADR-003/007). O rascunho é o quarto componente da arquitetura e fica **fora** desta
spec.

Três costuras carregam o R0 e recebem tratamento explícito abaixo (detalhe em [research.md](./research.md)):

1. **Escrita cirúrgica × serializador-normalizador (ADR-006 × FR-017).** O serializador
   normalizador-com-ponto-fixo existe e é provado por teste, mas **nunca reescreve o editor**. O texto
   é da pessoa: um gesto no diagrama escreve **só a linha do elemento afetado** (append no fim para o
   nó novo; **zero bytes** para mover), reutilizando a emissão *por statement* do serializador — nunca
   a serialização do documento inteiro. A normalização é **local ao statement**, não ao documento.
2. **Vocabulário recortado × codec completo (ADR-006/008).** O núcleo do codec (divisão de linhas,
   tolerância, duas listas de severidade, preâmbulo preservado, ponto fixo) é permanente e
   compartilhado; o **vocabulário é um registro de reconhecedores por família**. O R0 registra
   **apenas** o reconhecedor de cabeçalho (as cinco declarações do escopo, descartadas) e o de **nó
   retangular** (`nN`, `nN[…]`, `nN["…"]`). Linha fora disso — inclusive `a --> b` e `n1(…)` — é
   ilegível **por inteiro**, sem materialização parcial. Não é parser descartável: as specs seguintes
   registram mais reconhecedores no mesmo núcleo.
3. **Memória de arranjo × um store só (ADR-003/007).** A posição lembrada **por identificador** vive
   no mesmo store de sessão, como estado não-serializável — não num segundo store paralelo. Ela é
   transferida no renomear e devolvida só quando o lugar está livre; a projeção a lê para derivar a
   coordenada, e ela **nunca** viaja no código (é a exceção deliberada da topologia).

## Technical Context

**Language/Version**: TypeScript 5.x (decisão de `plan`, ver research.md §1) sobre React 18.

**Primary Dependencies**: React 18 + Vite 5 (ADR-001); Tailwind CSS + shadcn/ui vendorizado (ADR-001);
`@xyflow/react` 12.x (ADR-002); Zustand para o store único de sessão (evidência citada no ADR-003).
`mermaid` 11.16.0 entra **só como oráculo de teste** — não é dependência de runtime (ADR-006, Princípio X).

**Storage**: Nenhum. Sessão única e volátil — o rascunho no armazém do navegador é `rascunho-da-sessao`
e está fora desta spec. Único contrato externo em runtime: **área de transferência** (escrita, FR-010).

**Testing**: Vitest (unidade/integração: codec, rótulo, projeção, arranjo, contador, round-trip,
prefixos, byte-idêntico) + Playwright (navegador: oráculo mermaid para SC-001, latência para
SC-003/SC-005, e2e das três histórias, rede-desligada para o Princípio XIII).

**Target Platform**: Navegadores modernos (evergreen). Artefato estático servível sem backend (Princípio XIII).

**Project Type**: Aplicação web client-only de tela única (single project).

**Performance Goals**: dentro do envelope de **400 nós** — tecla no editor **≤50ms na mediana**
(SC-003), edição pontual refletida na outra vista **≤100ms na mediana** (SC-005), gesto contínuo
**≥50fps**. Sustentadas pela **invariante de reuso** da projeção (ADR-004).

**Constraints**: sem backend, sem rede em runtime, sem exportação de imagem (Princípio XIII); mermaid
fora do caminho de edição (Princípio X); posição nunca no código (Princípio V); toda mutação é
transação (Princípio IV).

**Scale/Scope**: envelope de produto 400 nós / 500 conexões (ADR-004). O R0 usa **só nós** (conexões
são `elementos-grafo-dirigido`); mede o próprio consumo por ser a primeira a gastar do envelope.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Source: `.specify/memory/constitution.md`.

| Principle | Touched? | Evidence this PR will present |
|-----------|----------|-------------------------------|
| I — Keyboard cycle, ≤4 control keys / 0 pointer events (NFR-01, R-05) | **yes (só a cláusula de foco)** | R0 não cria por teclado (o ciclo por teclado é `ciclo-por-teclado`); cria por **duplo-clique** (FR-001) e copia por **botão** (FR-010). A metade de foco do princípio (ADR-005: o produto é dono do foco) é R0: e2e SC-010 assere **0 deslocamentos de cursor** e **0 perdas de foco** do editor quando um gesto no diagrama escreve, e que a linha nova é revelada. O teste de ≥9 elementos por teclado fica com `ciclo-por-teclado`. |
| II — Reconfigure in ≤3 steps (NFR-02, declared target, unmeasured) | N/A | R0 não reconfigura tipo/shape/estilo de elemento — é `estilo-de-elementos`/`trocar-em-bloco`. |
| III — Density envelope as budget: 400/500, 100ms/50ms/50fps + projection reuse (NFR-03, R-04) | **yes** | **Custo por elemento acrescentado:** 1 nó do modelo (`id`, `rotulo`, `alertas`) + 1 objeto projetado de nó + 1 entrada no mapa de arranjo. Zero conexões. Testes: (a) reuso — projeta duas vezes mudando 1 nó e assere **identidade referencial** dos demais objetos de vista; (b) SC-003 tecla ≤50ms mediana em 400 nós; (c) SC-005 edição ≤100ms mediana; (d) gesto contínuo ≥50fps. Os três números medidos no envelope cheio. |
| IV — Transaction is the unit of undo, p95 ≤110ms at 400 (NFR-04, R-09, RN-04) | **yes (transação e coalescência; gesto de desfazer diferido)** | Toda mutação atravessa uma transação; checagem de fronteira: nenhum caminho escreve no modelo fora dela. SC-007: N teclas num rótulo → **1** entrada (FR-012). O **gesto** de desfazer/refazer é `desfazer-e-refazer`; a **unidade** (transação) e a costura do histórico já existem aqui. A latência p95 do desfazer a 400 será medida por aquela spec. |
| V — Code is a faithful projection of durable state only (NFR-05, R-03, RN-01) | **yes** | **Núcleo do R0.** SC-004: mover **todos** os nós deixa o código **byte-idêntico** e **0** posição/zoom/seleção/foco em qualquer saída. SC-001: **100%** do corpus (vocabulário de nó desta spec, incluindo zero-nós, cabeçalho apagado, cabeçalho de outro tipo) aceito pelo `mermaid.parse()` e desenhando o mesmo diagrama. |
| VI — Reading-order fidelity outside groups; divergence declared inside (NFR-06) | N/A | R0 não tem conexões, agrupamentos nem escolha de orientação (fixa `TD`); ordem de leitura entre nós isolados é trivial. Conexões são `elementos-grafo-dirigido`; orientação é `layout-automatico`. |
| VII — Layout is an explicit gesture; no edit rearranges (R-07, RN-03) | **yes** | SC-008: **0 reposicionamentos** de preexistente após qualquer operação — inclusive reescrever o identificador tecla a tecla; ler o mesmo código duas vezes → posições **idênticas** (inclusive em telas de tamanhos diferentes); mover a linha de um nó já arrastado → **0 saltos** e **0 caixas empilhadas**. Colocação local determinística (FR-015). O gesto "organizar" é `layout-automatico`. |
| VIII — Label text returns byte-for-byte or returns marked (NFR-07, RN-02) | **yes (a metade byte-a-byte; a marca visível diferida)** | Round-trip do rótulo sobre o corpus do R0: `n1["Nó, A"]` → caixa exibe `Nó, A` sem aspas e o mesmo rótulo desenha lá fora (FR-011); rótulo tolerante letra a letra sem o colchete de fecho (FR-018). A **marca visível** de expressividade (RF-22) é `codigo-de-entrada`; o *checker* já é propriedade do modelo (costura pronta). |
| IX — Code analysis always returns a diagram, never nothing (NFR-08, R-06) | **yes** | **Núcleo do R0.** SC-002: percorrer **todos** os prefixos do corpus do R0 → nenhum elemento real some e a análise **nunca** devolve vazio; sair do vocabulário não conta como perda e o nó volta na posição lembrada (**0 saltos**). Parser tolerante com duas listas de severidade (ADR-006). |
| X — REFUSAL: mermaid stays out of the editing path (R-06) | **yes** | Checagem de fronteira de importação: nenhum módulo do caminho de edição (modelo, transações, projeção, canvas, editor, codec) importa `mermaid`. No R0 o mermaid só aparece na fronteira de **teste/oráculo** — não é dependência de runtime. |
| XI — Long session does not degrade; draft fails toward not existing (NFR-09, R-10, RN-05, RN-07) | N/A | Sessão única e volátil (Assumptions da spec); o rascunho é `rascunho-da-sessao`. Nenhuma costura exigida aqui. |
| XII — Five types, common core, per-family vocabulary (R-02, R-08) | **yes (o núcleo e a costura de família; o seletor de tipo diferido)** | O codec é **núcleo comum + reconhecedores por família** (ADR-008): checagem de fronteira de que o núcleo não referencia nomes de família. O reconhecedor de cabeçalho reconhece as **cinco** declarações do escopo para descartá-las (teste), e uma declaração fora dos cinco (`pie`) cai na regra comum e vira nó pelo identificador sozinho. O **seletor** de tipo e os outros quatro tipos são `tipo-*`. |
| XIII — REFUSAL: browser-only; the deliverable is the code, not an image (R-01, PRD §4) | **yes** | (a) build estático servível sem backend; (b) e2e com rede desligada falha diante de qualquer requisição em runtime; (c) checagem: nenhum caminho de download de imagem nem módulo de auth/sessão remota. O artefato levado embora é o código mermaid (FR-011). |
| XIV — REFUSAL: nothing presumed, no style control without code backing (RN-06, RN-08) | **yes (a metade do nascer-neutro; a matriz de estilo diferida)** | Teste: o nó novo **nasce neutro**, rótulo padrão numerado ("Nó N"), sem herdar nada (FR-013). Não há controle de estilo exposto no R0; a **matriz tipo × controle** é `estilo-de-elementos`. |

Nenhuma violação aceita — a seção Complexity Tracking fica vazia. Onde um princípio é tocado só pela
metade, a metade restante tem dono nomeado no backlog e a costura é deixada preparada, conforme o
prompt autoriza.

## Project Structure

### Documentation (this feature)

```text
specs/001-cano-modelo-codigo/
├── plan.md              # Este arquivo (/speckit-plan)
├── research.md          # Fase 0 — decisões de plan e as três reconciliações
├── data-model.md        # Fase 1 — Modelo, Nó, Código, Arranjo, Contador
├── quickstart.md        # Fase 1 — roteiro de validação das três histórias + SCs
├── contracts/           # Fase 1 — superfície do codec, descritor de mudança, cópia, arranjo
│   ├── codec.md
│   ├── change-descriptor.md
│   ├── copy.md
│   └── arrangement.md
└── tasks.md             # Fase 2 (/speckit-tasks — NÃO criado aqui)
```

### Source Code (repository root)

O repositório ainda não tem código: o R0 também **bootstrapa o esqueleto do app** (Vite + Tailwind +
shadcn/ui vendorizado). A árvore abaixo mapeia a topologia do `docs/architecture.md` em módulos —
codec, canvas, editor e arranjo/modelo — com a projeção entre modelo e canvas isolada num módulo
próprio (é a invariante de cinco donos). Identificadores em português seguindo a convenção do spike.

```text
index.html
package.json  ·  vite.config.ts  ·  tailwind.config.ts  ·  tsconfig.json  ·  components.json (shadcn)
src/
├── main.tsx
├── App.tsx                 # tela única: área do diagrama | editor de código + botão copiar
├── modelo/                 # ADR-003 — a única verdade + efêmeros como campos não-serializáveis
│   ├── modelo.ts           # tipos Modelo/Nó; fábrica vazio(); FR-016 identidade por id
│   ├── store.ts            # store único de sessão (Zustand): modelo + arranjo + contador; mutação carrega origem (quebra o eco)
│   ├── transacao.ts        # ADR-009 — toda mutação é transação; coalescência da rajada; costura do histórico (gesto diferido)
│   ├── arranjo.ts          # ADR-003/007 — mapa id→posição, não-serializável; transferência no renomear; regra do lugar livre
│   └── contador.ts         # FR-016 — contador monotônico da sessão; nunca reusa; avança até valor livre
├── codec/                  # ADR-006/008 — único caminho texto ⇄ modelo; mermaid nunca aqui
│   ├── nucleo/
│   │   ├── analisar.ts     # analisar(texto) -> { modelo, erros, avisos }; consulta o registro de reconhecedores
│   │   ├── serializar.ts   # serializar(modelo) -> texto (normalizador, ponto fixo) — usado por statement e em teste
│   │   ├── reconhecedores.ts # registro; R0 registra só cabeçalho(5 tipos) + nó retangular
│   │   └── rotulo.ts       # codec do rótulo: aspas, parcial tolerante, checarExpressividade (marca diferida)
│   ├── flowchart/
│   │   └── no.ts           # reconhecedor + emissor do nó retangular (R0)
│   └── cirurgica.ts        # FR-017 — escrita cirúrgica: append da linha do nó; cabeçalho da cópia; nunca reescreve o documento
├── projecao/               # ADR-004 — a projeção com a invariante de reuso (cinco donos)
│   └── projetar.ts         # projetar(modelo, arranjo) -> { nodes, edges }; reusa objeto de vista não mudado
├── canvas/                 # ADR-002 — vista React Flow; gesto -> descritor discreto de mudança
│   ├── Canvas.tsx          # duplo-clique no vazio -> criar (FR-001); arrastar -> arranjo (FR-007); plano rolável
│   └── CaixaNo.tsx         # nó retangular customizado
├── editor/                 # ADR-003 — vista e produtor de comandos
│   ├── EditorCodigo.tsx    # textarea; debounce só no caminho texto→modelo; revela a linha nova sem roubar foco (ADR-005/FR-002)
│   └── BotaoCopiar.tsx     # FR-010 — 1 gesto; confirmação/falha no próprio botão
└── ui/                     # componentes shadcn/ui vendorizados
tests/
├── unit/                   # codec, rótulo, reuso da projeção, arranjo, contador
├── integration/            # round-trip/ponto-fixo, prefixos (SC-002), byte-idêntico (SC-004/SC-009)
└── e2e/                    # (Playwright) três histórias; oráculo mermaid (SC-001); latência (SC-003/005); rede-off (XIII)
corpus/                     # documentos de referência do R0 (restritos ao vocabulário de nó desta spec)
```

**Structure Decision**: single project, aplicação web client-only. Os quatro componentes da topologia
viram os diretórios `codec/`, `canvas/`, `editor/` (o quarto, rascunho, está fora da spec); `modelo/`
e `projecao/` isolam a única verdade e a invariante de reuso. As fronteiras de módulo são o que as
checagens dos Princípios X, IV e XII verificam.

## Complexity Tracking

> Sem violações a justificar — nenhuma linha.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
