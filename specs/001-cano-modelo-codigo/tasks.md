# Tasks: Cano modelo ⇄ código (R0 — o walking skeleton)

**Input**: Design documents from `/specs/001-cano-modelo-codigo/`

**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓ (codec, change-descriptor, copy, arrangement)

**RF cobertos:** RF-19, RF-23

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivo diferente, sem dependência em tarefa incompleta)
- **[Story]**: a que história de usuário a tarefa pertence (US1, US2, US3)
- Todo caminho de arquivo é explícito

## Path Conventions

Single project, app web client-only (plan.md §Project Structure): `src/`, `tests/`, `corpus/` na raiz.

## Sobre os testes (NÃO opcionais nesta feature)

O template trata testes como opcionais, mas aqui eles são **exigidos** e por isso entram como tarefas:
a Constituição (Portão do PR — "critério que só existe como prosa não conta; verifiquei manualmente não
fecha portão") converte cada princípio tocado em **checagem executável em CI**; o plan.md nomeia as
suítes Vitest + Playwright; a quickstart.md lista os portões que rodam em CI. Ordem **TDD**: dentro de
cada módulo/história, a tarefa de teste vem antes da implementação e **deve falhar** primeiro.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: bootstrapar o esqueleto do app (o R0 nasce num repo sem código) — ADR-001.

- [X] T001 Inicializar projeto Vite 5 + React 18 + TypeScript 5 na raiz: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, e criar as pastas de módulo de plan.md (`src/modelo`, `src/codec/nucleo`, `src/codec/flowchart`, `src/projecao`, `src/canvas`, `src/editor`, `src/ui`, `tests/unit`, `tests/integration`, `tests/e2e`, `corpus`)
- [X] T002 [P] Configurar Tailwind CSS + shadcn/ui **vendorizado** em `tailwind.config.ts`, `components.json` e `src/ui/` (ADR-001)
- [X] T003 [P] Instalar deps de runtime `@xyflow/react@12` e `zustand`; deps de dev `vitest`, `@playwright/test` e `mermaid@11.16.0` **só como oráculo** (não é dependência de runtime — ADR-006/Princípio X)
- [X] T004 [P] Configurar Vitest (`vitest.config.ts`) e Playwright (`playwright.config.ts`) e os scripts `test`, `test:e2e`, `build`, `dev` em `package.json` (espelhando quickstart.md)
- [X] T005 [P] Configurar checagem de fronteira de importação (dependency-cruiser ou ESLint boundaries) em `.dependency-cruiser.cjs` com regras-esboço para os Princípios X (mermaid fora do caminho de edição), IV (sem escrita direta no modelo) e XII (núcleo sem nome de família), ligada ao script de lint/CI

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: erguer a **única verdade e as duas vistas** — modelo + codec bidirecional + escrita cirúrgica + projeção + arranjo + contador + store transacional + casca da tela. É o coração do walking skeleton; **toda** história depende dele.

**⚠️ CRITICAL**: nenhuma história pode começar antes desta fase fechar.

- [X] T006 [P] Montar o **corpus de referência** em `corpus/*.mmd`, restrito ao vocabulário de nó desta spec (research §2a), incluindo obrigatoriamente: documento de **zero nós**, **cabeçalho apagado**, **cabeçalho de outro tipo**, e **≥26 rótulos hostis** (acento, aspas, quebras, escapes do mermaid, emoji, vírgula) para o round-trip byte-a-byte do Princípio VIII — base de SC-001, SC-002 e do gate de rótulo (quickstart.md)
- [X] T007 [P] Definir tipos de domínio `Modelo`, `No`, `Alerta` e a fábrica `vazio()` em `src/modelo/modelo.ts` (data-model.md; campos efêmeros nunca serializados — Princípio V)
- [X] T008 [P] Implementar o **registro de reconhecedores** em `src/codec/nucleo/reconhecedores.ts` — vocabulário como dado, não código descartável; `registrar('flowchart', [...])` (contracts/codec.md)
- [X] T009 [P] Teste de unidade do codec de rótulo em `tests/unit/rotulo.test.ts` — aspas **delimitam e não entram** (`n1["Nó, A"]`→`Nó, A`), parcial tolerante sem fecho (FR-018), `checarExpressividade`; **round-trip byte-a-byte sobre o corpus hostil (≥26) — Princípio VIII** (depende de T006 para o round-trip; deve falhar primeiro)
- [X] T010 Implementar codec de rótulo em `src/codec/nucleo/rotulo.ts` — aspas, parcial tolerante, `checarExpressividade` (marca visível é `codigo-de-entrada`, só o checker aqui)
- [X] T011 [P] Teste de unidade do reconhecedor/emissor de nó retangular em `tests/unit/no.test.ts` — casa `nN`, `nN[…]`, `nN["…"]`; **guarda de ilegibilidade**: linha com token de link (`-->`,`---`,`-.->`,`==>`,`~~~`,…) ou outro delimitador de shape (`(`,`{`,`>`,`((`) → `false`, **sem materialização parcial** (research §2a) (deve falhar primeiro)
- [X] T012 Implementar reconhecedor de nó retangular + `emitirNo(no)` em `src/codec/flowchart/no.ts` (contracts/codec.md; identificador mais estrito que o `idValido` do spike)
- [X] T013 [P] Teste de contrato de `analisar` em `tests/unit/analisar.test.ts` — **nunca devolve vazio**; duas listas `erros`/`avisos`; reconhecedor de **cabeçalho** descarta as **cinco** declarações do escopo em qualquer posição, conjunto **fechado** (`pie` cai na regra comum e vira nó); preâmbulo preservado (contracts/codec.md) (deve falhar primeiro)
- [X] T014 Implementar `analisar(texto)` em `src/codec/nucleo/analisar.ts` — divisão de linhas, `tolerante` default true, exceção de cabeçalho, consulta ao registro (depende de T008, T012)
- [X] T015 [P] Teste de contrato de `serializar`/`emitirNo` **ponto fixo** em `tests/unit/serializar.test.ts` — `analisar∘serializar ≡ id` (normalizado), `emitirNo` idempotente por statement (research §3) (deve falhar primeiro)
- [X] T016 Implementar `serializar(modelo)` (documento — **só teste**), reusar `emitirNo` (statement — runtime) e `normalizar(modelo)` em `src/codec/nucleo/serializar.ts` (depende de T012, T014)
- [X] T017 Implementar as **escritas cirúrgicas puras** em `src/codec/cirurgica.ts` + `tests/unit/cirurgica.test.ts` — `appendLinhaNoFim(texto, no)` (FR-017: só a linha nova muda, nada acima) e `normalizarCabecalhoParaCopia(texto)` (FR-014: acrescenta/substitui/mantém **uma** `flowchart TD`, resto byte-idêntico, inclusive trechos ilegíveis). Funções **puras de texto, sem UI**; US1 e US3 apenas as chamam (depende de T012, T014, T016)
- [X] T018 [P] Teste de unidade do arranjo em `tests/unit/arranjo.test.ts` — `posicaoPara` (lembrada se livre; determinística ancorada no anterior; **origem fixa** independente do tamanho da janela), `transferir` no renomear, **nunca empilha** duas caixas (contracts/arrangement.md/SC-008) (deve falhar primeiro)
- [X] T019 Implementar `Arranjo` em `src/modelo/arranjo.ts` — `porId: Map`, `gravar`, `transferir`, `posicaoPara` (efêmero de sessão, nunca serializado — FR-008) (depende de T007)
- [X] T020 [P] Teste de unidade do contador em `tests/unit/contador.test.ts` — monotônico, **nunca reusa** id emitido (nem após linha apagada), **avança até valor livre** quando o próximo está ocupado no texto (FR-016/research §8) (deve falhar primeiro)
- [X] T021 Implementar `Contador` de sessão em `src/modelo/contador.ts` — emite `n{proximo}` e rótulo `Nó {proximo}` (um contador só para as duas vistas, FR-013) (depende de T007)
- [X] T022 [P] **Portão** de reuso da projeção em `tests/unit/projetar.test.ts` — projeta 2× mudando 1 nó → **identidade referencial** dos demais objetos de vista (Princípio III; contracts/arrangement.md) (deve falhar primeiro)
- [X] T023 Implementar `projetar(modelo, arranjo)` em `src/projecao/projetar.ts` — deriva coordenada do arranjo; reusa objeto de vista por chave de cache `` `${rotulo ?? id}|${forma}|${marcado}|${x}|${y}` ``; `edges = []` no R0 (depende de T007, T019)
- [X] T024 Implementar o **store único de sessão** em `src/modelo/store.ts` (Zustand) — slots `modelo`, `arranjo`, `contador`, `textoEditor`; **semeia `flowchart TD`** uma vez e faz o parse inicial (modelo vazio, FR-019); toda mutação carrega a **origem** (canvas|editor) para quebrar o eco (ADR-003) (depende de T007, T014, T019, T021)
- [X] T025 [P] Teste da transação em `tests/unit/transacao.test.ts` — N teclas num rótulo = **1** ato (coalescência, SC-007); fronteira: **sem escrita direta no modelo** fora de transação (Princípio IV) (deve falhar primeiro)
- [X] T026 Implementar `transacao.ts` em `src/modelo/transacao.ts` — toda mutação é transação; coalescência da rajada; costura do histórico (o gesto de desfazer é `desfazer-e-refazer`, diferido) (depende de T024)
- [X] T027 [P] Teste de integração de prefixos/ponto-fixo em `tests/integration/prefixos.test.ts` — **todos** os prefixos do corpus → **0 perdas** de elemento real e análise **nunca vazia** (SC-002/Princípio IX); ponto fixo sobre o corpus (depende de T006; deve falhar primeiro)
- [X] T028 Bootstrapar a **casca da tela** em `src/App.tsx` e `src/main.tsx` — tela única: área do diagrama | editor de código + botão copiar; monta a projeção do store (depende de T023, T024)
- [X] T029 Implementar a área do diagrama **mínima (só leitura)** em `src/canvas/Canvas.tsx` + o nó customizado em `src/canvas/CaixaNo.tsx` — consome a projeção, **plano rolável** (React Flow), ainda sem gestos (depende de T023, T028)
- [X] T030 Implementar o editor **mínimo (só exibição)** em `src/editor/EditorCodigo.tsx` — `<textarea>` controlado exibindo `textoEditor` (sem realce — o piso de latência do ADR-006; realce é `codigo-de-entrada`) (depende de T024, T028)

**Checkpoint**: o esqueleto **anda** — o app sobe, o editor mostra `flowchart TD`, a área do diagrama está vazia; o codec faz round-trip; a projeção reusa; as escritas cirúrgicas existem como funções puras. Nenhum gesto ainda.

---

## Phase 3: User Story 1 - O nó nasce e a linha aparece no código (Priority: P1) 🎯 MVP

**Goal**: criar nó por **duplo-clique no vazio** → a linha correspondente nasce no código, cirurgicamente, sem tomar o foco do editor. É a metade **ida** do cano.

**Independent Test**: dar um duplo-clique no espaço vazio e conferir que o código exibido passou a conter a linha do nó, sem nenhum gesto adicional de sincronização.

### Tests for User Story 1 ⚠️ (escrever antes; devem falhar)

- [X] T031 [P] [US1] E2E dos 7 cenários da US1 em `tests/e2e/us1-ida.spec.ts` — nasce no ponto clicado; 2º nó preserva o 1º; texto próprio fica **byte-idêntico** (SC-009); cabeçalho apagado **não** é recolocado; id/rótulo **saltam** para valor livre; **revela** a linha sem mover cursor nem tomar foco (SC-010); duplo-clique **sobre a caixa** é no-op
- [X] T032 [P] [US1] Integração da criação por gesto em `tests/integration/cirurgica-append.test.ts` — o comando `criarNo` faz **append no fim**, nada acima muda (SC-009); nó **nasce neutro** "Nó N" sem herdar nada (Princípio XIV)

### Implementation for User Story 1

- [X] T033 [US1] Adicionar o gesto de **duplo-clique** em `src/canvas/Canvas.tsx` — vazio → descritor `{tipo:'criarNo', ponto}`; **sobre a caixa** → no-op; `onNodesChange` filtrado (contracts/change-descriptor.md/FR-001)
- [X] T034 [US1] Ligar o comando `criarNo` no store/transação em `src/modelo/store.ts` — novo `No` (`contador.emitir()` → id + rótulo "Nó N"), `arranjo.porId[id] = ponto`, **append via `cirurgica.appendLinhaNoFim`**; origem=canvas (depende de T033)
- [X] T035 [US1] Implementar `revelarLinha` em `src/editor/EditorCodigo.tsx` — ajusta `scrollTop` + destaque transitório da linha nova **sem** chamar `focus()` nem tocar `selectionStart/End` (FR-002/SC-010/ADR-005) (depende de T034)

**Checkpoint**: US1 funcional e testável sozinha — criar nó por gesto → a linha aparece; foco preservado. **É o MVP: um gerador de mermaid por gesto direto.**

---

## Phase 4: User Story 2 - Escrevo no código e o diagrama acompanha conforme digito (Priority: P2)

**Goal**: digitar no código → o diagrama muda conforme se digita, sem confirmar; nada do que já estava construído some no meio da digitação. É a metade **volta** do cano.

**Independent Test**: com um diagrama pronto, digitar no código caractere a caractere e conferir, a cada tecla, que o diagrama reflete o texto e que nenhum elemento real desapareceu.

### Tests for User Story 2 ⚠️ (escrever antes; devem falhar)

- [X] T036 [P] [US2] E2E dos 14 cenários da US2 em `tests/e2e/us2-volta.spec.ts` — edita id→muda; apaga linha→remove; letra a letra sem perder existente; incompleto→**sempre** um diagrama; preexistentes ficam; apaga tudo→vazio e **não** recoloca cabeçalho; renomeia id→mesmo nó, mesma posição; duplica linha→**um** nó (último rótulo); `n1[Nó A]` letra a letra sem exibir colchete; 2ª declaração de tipo no meio→**sem** caixa; recorta/cola linha→posição lembrada; `--> n2`→some e reaparece; `n1["Nó, A"]`→sem aspas; `n1(Nó A)`→sem caixa
- [X] T037 [P] [US2] Integração da volta em `tests/integration/volta.test.ts` — SC-002 sobre o corpus; renomear mantém identidade **e** posição (FR-018); id repetido → **um** nó, último rótulo prevalece (FR-016)

### Implementation for User Story 2

- [X] T038 [US2] Ligar o caminho **texto→modelo ao vivo** em `src/editor/EditorCodigo.tsx` — `onChange` com **debounce** (só neste sentido) → `analisar` → store (origem=editor, quebra o eco); o diagrama acompanha sem gesto (FR-003/FR-006)
- [X] T039 [US2] Ligar a **materialização com colocação** no store em `src/modelo/store.ts` — para cada nó de `analisar`, `arranjo.posicaoPara(id, âncora, ocupadas)`: lembrada-se-livre, senão determinística; primeiro nó → origem fixa (FR-015/SC-008) (depende de T038)
- [X] T040 [US2] Ligar **renomear-transfere** e a **varredura de valor livre** do contador no caminho do editor em `src/modelo/store.ts` — renomear transfere a lembrança de arranjo; o contador avança até um valor livre lendo os ids do texto dela (FR-018/FR-016) (depende de T038)

**Checkpoint**: US2 funcional e testável sozinha — digitar → o diagrama acompanha; 0 perdas em todos os prefixos; posições lembradas por id.

---

## Phase 5: User Story 3 - Arrasto o nó e levo embora o código, sem a minha bagunça dentro (Priority: P3)

**Goal**: arrastar o nó (posição é efêmera, código byte-idêntico) e copiar o código com **um** gesto — válido lá fora e sem nenhum vestígio da sessão. Fecha o cano entregando o produto final.

**Independent Test**: mover todos os nós, copiar o código, e conferir que o texto copiado é idêntico ao de antes do movimento e desenha o mesmo diagrama num mermaid de fora.

### Tests for User Story 3 ⚠️ (escrever antes; devem falhar)

- [X] T041 [P] [US3] E2E dos 8 cenários da US3 em `tests/e2e/us3-copia.spec.ts` — arrasta→código **byte-idêntico** (SC-004); botão copia tudo em **1** gesto (SC-006); cola num mermaid→mesmo desenho (SC-001); inspeciona→**0** efêmeros; confirmação/falha **visível** no botão; apagado→copia `flowchart TD` sozinha; outro-tipo→**uma só** declaração; trecho ilegível→**vai junto**, difere só no cabeçalho
- [X] T042 [P] [US3] Integração da transformação de cópia em `tests/integration/copia.test.ts` — `normalizarCabecalhoParaCopia` acrescenta/substitui/mantém o cabeçalho; resto **byte-idêntico**; zero nós → `flowchart TD` (contracts/copy.md/FR-014)

### Implementation for User Story 3

- [X] T043 [US3] Adicionar o **arraste** em `src/canvas/Canvas.tsx` — `onNodesChange` filtrado → `{tipo:'moverNo', id, para}`; grava `arranjo.porId`, **zero bytes** no editor (posição é efêmera — contracts/change-descriptor.md/FR-007/FR-008)
- [X] T044 [US3] Implementar o **botão de copiar** em `src/editor/BotaoCopiar.tsx` — 1 clique → `copiar` = `cirurgica.normalizarCabecalhoParaCopia(textoEditor)` → `navigator.clipboard`; confirmação **e falha** no próprio botão (falhar em silêncio não é opção — FR-010/SC-006)

**Checkpoint**: US3 funcional e testável sozinha — arrastar + copiar um código limpo e válido. **O cano fecha.**

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: os portões de constituição que rodam em CI e cruzam as três histórias (quickstart.md §Portões).

- [X] T045 [P] **Portão de latência** no envelope em `tests/e2e/latencia.spec.ts` — 400 nós: tecla ≤50ms mediana (SC-003), edição refletida ≤100ms mediana (SC-005), gesto contínuo ≥50fps (Princípio III)
- [X] T046 [P] **Portão do oráculo mermaid** em `tests/e2e/oraculo.spec.ts` — corpus copiado → `mermaid.parse()`/`render()` aceita **100%** e desenha o mesmo SVG, sem tolerância parcial (SC-001/Princípio V)
- [X] T047 [P] **Portão byte-idêntico** em `tests/integration/byte-identico.test.ts` — mover **todos** os nós → código byte-idêntico; **0** ocorrências de posição/zoom/seleção/foco em qualquer saída (SC-004)
- [X] T048 [P] **Portão de fronteira do mermaid** em `tests/unit/fronteira-import.test.ts` — nenhum módulo do caminho de edição (modelo, transações, projeção, canvas, editor, codec) importa `mermaid`, direta ou transitivamente (Princípio X)
- [X] T049 [P] **Portão do núcleo sem família** em `tests/unit/nucleo-sem-familia.test.ts` — `grep` de nome de família em `src/codec/nucleo/` reprova (Princípio XII)
- [X] T050 [P] **Portão só-navegador** em `tests/e2e/rede-off.spec.ts` + checagem de build — e2e com a rede desligada falha diante de qualquer requisição em runtime; build estático servível sem backend; nenhum caminho de download de imagem (Princípio XIII)
- [X] T051 [P] **Portão de Princípio VII / SC-008** em `tests/integration/reposicionamento.test.ts` — para **cada** operação do R0 (criar, mover, digitar no código, apagar linha, reescrever id tecla a tecla) assere posição de **todos** os preexistentes idêntica antes/depois (**0 reposicionamentos**); e ler o mesmo código 2× → posições idênticas, inclusive em áreas de tamanhos diferentes (0 divergências)
- [X] T052 Rodar a validação de ponta a ponta da `quickstart.md` (3 histórias + portões) e confirmar a **Definição de Pronto (R0)**: SC-001…SC-010 verdes e os portões tocados (I-foco, III, IV, V, VII, VIII, IX, X, XII, XIII, XIV) em CI

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Fase 1)**: sem dependências — começa já.
- **Foundational (Fase 2)**: depende do Setup — **bloqueia todas** as histórias.
- **User Stories (Fases 3–5)**: todas dependem do Foundational fechado. Depois disso, podem ir em paralelo (equipe) ou em ordem de prioridade P1→P2→P3.
- **Polish (Fase 6)**: depende das histórias desejadas prontas (o oráculo e a latência precisam do cano de ponta a ponta).

### User Story Dependencies

- **US1 (P1)** — só precisa do Foundational. É o MVP e não depende de US2/US3.
- **US2 (P2)** — só precisa do Foundational (o `analisar` já é dele). Independentemente testável; o nó de partida pode vir do seed ou de digitação.
- **US3 (P3)** — só precisa do Foundational (a `normalizarCabecalhoParaCopia` é dele, T017). Independentemente testável; o nó de partida pode vir de US1 **ou** de US2, mas a história roda sozinha (arrastar + copiar).

### Within Each Story / Foundational

- Testes escritos **antes** e falhando primeiro (TDD).
- No codec: registro (T008) → reconhecedor de nó (T012) → `analisar` (T014) → `serializar` (T016) → escrita cirúrgica (T017).
- Store (T024) depende de modelo + `analisar` + arranjo + contador. Casca (T028) depois do store e da projeção.
- Nas histórias: gesto/UI depois da costura de store correspondente; US1 e US3 apenas **chamam** as funções cirúrgicas puras do Foundational (T017), sem se bloquearem.

### Parallel Opportunities

- Setup: T002, T003, T004, T005 em paralelo depois de T001.
- Foundational: os testes `[P]` (T009, T011, T013, T015, T018, T020, T022, T025, T027) e os arquivos independentes (T006, T007, T008) em paralelo; as implementações seguem seus testes.
- Depois do Foundational: US1, US2 e US3 podem começar em paralelo (equipes distintas). Pontos de convergência a coordenar no merge: `store.ts` (US1+US2), `Canvas.tsx` (US1+US3), `EditorCodigo.tsx` (US1+US2).
- Dentro de cada história, os dois testes `[P]` rodam juntos; o Polish é quase todo `[P]`.

---

## Parallel Example: Foundational (arranque)

```bash
# Arquivos-semente e testes independentes, juntos:
Task: "T006 Montar o corpus em corpus/*.mmd"
Task: "T007 Definir tipos em src/modelo/modelo.ts"
Task: "T008 Registro de reconhecedores em src/codec/nucleo/reconhecedores.ts"
Task: "T011 Teste do nó retangular em tests/unit/no.test.ts"
Task: "T013 Teste de analisar em tests/unit/analisar.test.ts"
```

## Parallel Example: User Story 1

```bash
# Os dois testes da US1 juntos (escrever antes, devem falhar):
Task: "T031 E2E dos 7 cenários em tests/e2e/us1-ida.spec.ts"
Task: "T032 Integração da criação por gesto em tests/integration/cirurgica-append.test.ts"
```

---

## Implementation Strategy

### MVP First (só US1)

1. Fase 1 (Setup) → 2. Fase 2 (Foundational — **crítica, bloqueia tudo**) → 3. Fase 3 (US1).
4. **PARE E VALIDE**: teste US1 sozinha (criar → linha aparece).
5. Já é um gerador de mermaid por gesto — demo do primeiro sinal de vida.

### Incremental Delivery

1. Setup + Foundational → o esqueleto anda.
2. + US1 → ida (demo — MVP).
3. + US2 → volta (o cano é bidirecional; prova que existe **um** modelo).
4. + US3 → arraste + cópia (o produto final sai limpo).
5. Polish → os portões de constituição fecham em CI (Definição de Pronto do R0).

### Parallel Team Strategy

Depois do Foundational: Dev A → US1, Dev B → US2, Dev C → US3; integram por serem histórias independentes sobre o mesmo store (convergindo em `store.ts`/`Canvas.tsx`/`EditorCodigo.tsx` no merge).
