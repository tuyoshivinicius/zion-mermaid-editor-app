---
description: "Task list — Área de trabalho (R2)"
---

# Tasks: Área de trabalho

**Input**: Design documents from `/specs/003-area-de-trabalho/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**RF cobertos:** RF-24, RF-25, RF-26

**Tests**: INCLUÍDOS. A spec traz `SC-001`…`SC-014` como portões de CI e o `plan.md` enumera
Vitest (aritmética pura, sem navegador) + Playwright (fps, resposta, e2e das três histórias) como a
prova permanente. Segue a disciplina de TDD que o R0/R1 já instalou.

**Organization**: tarefas agrupadas por história (US1 P1, US2 P2, US3 P3), cada uma entregável e
testável de forma independente sobre a árvore herdada do R1. A **Fase 6** não é história de pessoa:
é a capacidade que o `R-05` cobra e que as outras specs consomem (`FR-011`, `FR-012`) — por isso não
leva rótulo de história, como Setup, Foundational e Polish.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivo diferente, sem dependência pendente)
- **[Story]**: US1 / US2 / US3 (Setup, Foundational, Capacidade R-05 e Polish não levam rótulo)
- Todo caminho de arquivo é relativo à raiz do repositório

## Path Conventions

- **Single project** (a mesma árvore do R0/R1): `src/`, `tests/`, `corpus/` na raiz.
- O diretório novo é `src/areatrabalho/` e é quase todo **aritmética pura** sobre
  `(Projecao, Arranjo, Quadro, Enquadramento)`; o que precisa de engine fica em dois componentes e
  num hook (`plan.md` §Structure Decision).
- **Fronteira desta feature**: `src/areatrabalho/**` **não** importa `src/modelo/transacao` — nenhum
  gesto abre transação (`FR-014`, Princípio IV).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: os números declarados num arquivo só, os tipos de geometria, o documento do envelope
compartilhado entre Vitest e Playwright, e a fronteira nova ligada **antes** da primeira linha de
runtime. Nenhuma dependência de runtime nova (ADR-001/002/003: `@xyflow/react`, `zustand` e Tailwind
já presentes; nem painéis redimensionáveis nem biblioteca de animação entram).

- [X] T001 [P] Criar os **números declarados** em `src/areatrabalho/faixa.ts` — `PISO_ZOOM` 0,01 · `TETO_ZOOM` 4 · `TAMANHO_NATURAL` 1 · `AREA_REFERENCIA` 1280×720 · `FOLGA_BORDA` 24 px de tela · `MIN_DIAGRAMA` 480 · `MIN_EDITOR` 320 · `SOMA_DOS_MINIMOS` 800 (derivado) · `PROPORCAO_PADRAO` 0,42 · `DURACAO_TRANSITO` 180 ms · `PASSO_ZOOM` 1,2 — **um arquivo só**, para `FR-008` e `FR-011` não poderem divergir por constante duplicada (research §1; contracts/enquadramento.md §1)
- [X] T002 [P] Criar os **tipos de geometria** em `src/areatrabalho/tipos.ts` — `Enquadramento{x,y,zoom}`, `Caixa{x,y,w,h}` (plano), `Quadro{x,y,w,h}` (tela), `Oclusao{id,borda,espessura}`, `Orientacao`, `Canto`, `Piloto{enquadramentoCorrente,aplicar,quadro}` — puros, sem React nem engine (data-model.md §2)
- [X] T003 [P] Extrair o gerador do **documento do envelope** (390 nós / 500 conexões / 10 agrupamentos) hoje embutido em `tests/e2e/latencia-grafo.spec.ts` para `tests/fixtures/envelope.ts`, para que Vitest e Playwright leiam o **mesmo** documento nos portões de `SC-003`, `SC-004`, `SC-005`, `SC-008` e `SC-012` (research §1.1)
- [X] T004 [P] Ligar as **fronteiras novas** em `.dependency-cruiser.cjs`: regra `sem-transacao-na-area-de-trabalho` (`^src/areatrabalho` ✗→ `^src/modelo/transacao`, severity error — `FR-014`/Princípio IV) e `areatrabalho` acrescentado ao `from.path` de `sem-mermaid-no-caminho-de-edicao` (Princípio X)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: o substrato que as **três** histórias leem — o quadro (a área visível descontada), o
núcleo aritmético compartilhado e a casa de sessão do efêmero. Sem isto nenhuma história compila.

**⚠️ CRITICAL**: nenhuma história pode começar até esta fase fechar.

### Tests (escrever primeiro, ver falhar)

- [X] T005 [P] Teste de unidade do **quadro** em `tests/unit/area-visivel.test.ts` — `quadroVisivel` = área do diagrama ∩ janela − faixas de oclusão; recuo pela **maior** espessura declarada em cada borda; o quadro permanece **retangular**; a página rolada (janela < 800px) **encolhe** o quadro; sem rolagem e sem sobreposição, quadro ≡ retângulo da área; `quadroNoPlano` converte pelo enquadramento corrente (`FR-011`, contracts/area-visivel.md)
- [X] T006 [P] Teste de unidade do **núcleo aritmético** em `tests/unit/enquadramento.test.ts` — `zoomAncorado` mantém o ponto de tela fixo (ponteiro, `FR-002`) e ancora no centro do quadro sem ponteiro; `preservarCentro` mantém zoom e o ponto do plano no centro quando o quadro muda de tamanho (`FR-007`); `pisoCorrente(z) = min(PISO_ZOOM, z)` (`FR-001`)
- [X] T007 [P] Teste de integração da **fronteira transacional do slot** em `tests/integration/area-trabalho-sem-historico.test.ts` — 40 escritas de `fixarEnquadramento`/`fixarRazao`/`fixarModoHand` produzem **0** entradas de histórico, `modelo` e `arranjo` idênticos e `textoEditor` byte-idêntico; **1** desfazer reverte o último ato **do modelo** (`FR-014`, `SC-009`, research §3)

### Implementation

- [X] T008 [P] Implementar `src/areatrabalho/areaVisivel.ts` — `quadroVisivel(retanguloDaArea, janela, oclusoes)`, `quadroNoPlano(q, e)` e `registrarOclusao(o): () => void` (registro, nunca presunção: cada controle persistente declara `{borda, espessura}` ao montar e recebe o cancelamento) — depende de T001/T002/T005
- [X] T009 [P] Implementar o núcleo de `src/areatrabalho/enquadramento.ts` — `zoomAncorado`, `preservarCentro`, `pisoCorrente`; aritmética **pura**, sem React nem `@xyflow/react` (contracts/enquadramento.md §2) — depende de T001/T002/T006
- [X] T010 Acrescentar o slot `areaDeTrabalho` a `EstadoSessao` em `src/modelo/store.ts` — `razaoEditor` 0,42 · `enquadramento` · `modoHand: 'off'` · `piloto: null` · `aberturaPendente: true` — e as ações `fixarRazao`, `fixarEnquadramento`, `fixarModoHand`, `registrarPiloto`, todas por `set()` **direto**, **fora** de `commit()`, irmãs de `revelar` e nunca tocando `Modelo`/`Historico` (data-model.md §1, research §2/§3) — depende de T007/T008/T009

**Checkpoint**: substrato pronto — o quadro, a aritmética e a casa de sessão existem; as três
histórias podem começar em paralelo.

---

## Phase 3: User Story 1 - Navego num diagrama maior que a tela (Priority: P1) 🎯 MVP

**Goal**: aproximar e afastar o zoom da área do diagrama (ancorado no ponteiro, saturando na faixa
declarada e com o nível corrente legível) e arrastar a área visível pelo plano no modo hand — sem
mover um elemento, sem mexer na seleção e sem uma linha de código mudar. É a razão de a spec existir
e a fundação das outras duas histórias.

**Independent Test**: sobre um diagrama maior que a área do diagrama, afastar o zoom e conferir que
mais elementos aparecem sem que nenhum mude de posição no plano; entrar no modo hand, arrastar e
conferir que a área visível se deslocou, que **0** elementos foram movidos ou selecionados e que o
código permaneceu byte-idêntico.

### Tests for User Story 1 ⚠️ (escrever primeiro, ver falhar)

- [X] T011 [P] [US1] Estender `tests/unit/enquadramento.test.ts` com a **faixa e a saturação** — o gesto contínuo para no piso e no teto, **continua respondendo**, não salta e não falha em silêncio; `minZoom` dinâmico recalculado **ao fim** do gesto (nunca por quadro); passo 1,2× por acionamento; a faixa **não** se move com o conteúdo nem com o tamanho da área do diagrama (`FR-001`, `FR-002`, contracts/enquadramento.md §4)
- [X] T012 [P] [US1] Teste de unidade da **re-ancoragem** do arrasto em curso em `tests/unit/reancoragem.test.ts` — dado um deslocamento capturado e uma mudança de enquadramento, a posição do elemento **no plano** fica invariante; com o zoom ancorado no ponteiro a correção é **zero** por construção (`FR-015`, `SC-010`, contracts/enquadramento.md §7)
- [X] T013 [P] [US1] Teste e2e da US1 (os 7 cenários de aceite) em `tests/e2e/us1-area-trabalho.spec.ts` — zoom ancorado no ponteiro; saturação com o indicador legível; roda **pura** continua rolando o plano (`FR-005`); hand persistente (barra), temporário (`Espaço`, volta ao soltar e no `blur`) e o gesto auxiliar do **botão do meio**; fora do modo, o arrasto no vazio nasce **seleção retangular** e o **cursor declarava** isso antes do primeiro pixel (`crosshair` × `grab`); seleção e rótulo em edição preservados; rajada sem histórico; arrasto de nó em curso sob zoom sem cancelar, sem concluir à força, sem inércia e **sem salto** (`SC-010`, `SC-014`)
- [X] T014 [P] [US1] Teste e2e de **fps ≥50 no envelope** (400/500) em `tests/e2e/fps-area-trabalho.spec.ts` para os dois primeiros gestos contínuos — zoom e arrasto do enquadramento (`SC-003`, `FR-016`; a divisão entra em T022 e o trânsito em T053)

### Implementation for User Story 1

- [X] T015 [P] [US1] Implementar `reancorarArrasto(deslocamentoCapturado, anterior, atual)` em `src/areatrabalho/enquadramento.ts` — O(1), duas subtrações, pura (contracts/enquadramento.md §7)
- [X] T016 [P] [US1] Criar `src/areatrabalho/useNavegacao.ts` — afordâncias: `Ctrl/⌘ + roda` e pinça (`zoomOnPinch`, ancorado no ponteiro), `Ctrl/⌘ + =` / `Ctrl/⌘ + −` (passo 1,2× ancorado no centro do quadro), `Espaço` para o hand temporário (`keyup` **e** `blur` voltam a `'off'`), `minZoom` dinâmico por `pisoCorrente` e `maxZoom = TETO_ZOOM`; **guarda única** de teclado: nenhum atalho dispara com o foco em `input`, `textarea` ou `contenteditable` (research §6; contracts/enquadramento.md §5)
- [X] T017 [P] [US1] Criar `src/areatrabalho/ControlesEnquadramento.tsx` — barra flutuante no canto **inferior direito**: `−` · indicador `NN %` (coalescido em rAF, `FR-001`) · `+` · alternância do **modo hand**; a barra **registra a própria oclusão** ao montar (`registrarOclusao({borda:'baixo', espessura})`) e cancela ao desmontar, pagando em código o preço que a spec declarou (`FR-011`, research §6)
- [X] T018 [US1] Fiar a navegação em `src/canvas/Canvas.tsx` — `panOnDrag = modoHand ? [0,1] : [1]` com `selectionOnDrag` no complemento, `zoomOnPinch` ligado e `zoomOnScroll` **desligado** (a rolagem herdada do R0 continua, `FR-005`), `minZoom`/`maxZoom` dinâmicos, cursor `crosshair` × `grab`/`grabbing` declarando o destino do arrasto **antes** dele, reconciliação do enquadramento no **fim** do gesto (`onMoveEnd` → `fixarEnquadramento`) e o registro do `piloto` no store ao montar — depende de T016/T017
- [X] T019 [US1] Aplicar a **re-ancoragem** ao arrasto em curso em `src/canvas/Canvas.tsx` via `useStoreApi`, a cada mudança de enquadramento por roda, tecla, controle ou arrasto do enquadramento (`FR-015`) — depende de T015/T018

**Checkpoint**: US1 funcional e testável sozinha — com a proporção fixa e sem ajustar à tela, um
diagrama de 400 nós já é trabalhável. É o MVP.

---

## Phase 4: User Story 2 - Trabalho na proporção que escolhi (Priority: P2)

**Goal**: arrastar a divisão entre o editor de código e a área do diagrama e trabalhar na proporção
escolhida, que permanece até que ela mesma a mude — uma **razão**, não uma largura: mudar o tamanho
da janela muda os tamanhos, nunca a proporção; abaixo da soma dos mínimos quem cede é a **página**.

**Independent Test**: arrastar a divisão para os dois lados e conferir que a proporção permanece, que
nenhuma das duas vistas desaparece, que **0** elementos mudam de posição e que o código permanece
byte-idêntico.

### Tests for User Story 2 ⚠️ (escrever primeiro, ver falhar)

- [X] T020 [P] [US2] Teste de unidade da proporção em `tests/unit/proporcao.test.ts` — a razão gravada é a **que ela escolheu**, nunca a já recortada (o recorte é da renderização: uma janela estreita não reescreve a escolha, e a razão original volta a valer quando a janela alarga); saturação nos mínimos 480/320; `preservarCentro` sob mudança de tamanho do quadro com **0** mudanças de zoom e **0** deslocamento do ponto central (`FR-006`, `FR-007`, `SC-007`, contracts/proporcao.md)
- [X] T021 [P] [US2] Teste e2e da US2 (os 6 cenários de aceite) em `tests/e2e/us2-area-trabalho.spec.ts` — arrastar a divisão e a proporção permanecer; saturar nos mínimos declarados; zoom e ponto central preservados no arrasto da divisão **e** na mudança de janela, com **0** reenquadramentos automáticos; código byte-idêntico; razão estável ao alargar/estreitar a janela; janela abaixo de 800px → a área de trabalho **para de encolher**, a página rola horizontalmente, **0** vistas abaixo do próprio mínimo e **0** vistas ocultas (`SC-007`)
- [X] T022 [US2] Estender `tests/e2e/fps-area-trabalho.spec.ts` com o **arrasto da divisão** no envelope — ≥50fps e **0** re-renders dos 400 nós durante o gesto (`SC-003`; contenção de arquivo com T014)

### Implementation for User Story 2

- [X] T023 [P] [US2] Declarar as classes do layout em `src/index.css` — `.area-de-trabalho { display:flex; min-width:800px }`, `.vista-diagrama { flex:1 1 auto; min-width:480px }`, `.vista-editor { flex:0 0 var(--razao-editor, 42%); min-width:320px; max-width:calc(100% - 480px) }` e `overflow-x:auto` na raiz da página — é o CSS que entrega razão estável, recorte pelos mínimos e "quem cede é a página", **sem uma linha de JavaScript no `resize`** (contracts/proporcao.md §2)
- [X] T024 [US2] Criar a casca `src/areatrabalho/AreaDeTrabalho.tsx` — as duas vistas + a divisão, com `--razao-editor` derivada de `razaoEditor` do slot; monta `Canvas` (dentro do `ReactFlowProvider`), `EditorCodigo` e `BotaoCopiar` — depende de T023
- [X] T025 [P] [US2] Criar `src/areatrabalho/Divisao.tsx` — arrasto por ponteiro que escreve `--razao-editor` **por `ref`** durante o gesto (0 estado React no meio, 0 re-render dos 400 nós) e só comita `fixarRazao` ao soltar; satura nos mínimos declarados (`FR-006`, `FR-016`, `SC-003`, contracts/proporcao.md §3)
- [X] T026 [US2] Trocar o layout inline (`w-[42%]`/`min-w-[320px]`) por `AreaDeTrabalho` em `src/App.tsx`, e dar rolagem horizontal à página (`FR-006`) — depende de T024/T025
- [X] T027 [US2] Acrescentar o `ResizeObserver` sobre a área do diagrama em `src/areatrabalho/useNavegacao.ts` — mede o **quadro descontado** (não o retângulo bruto, para concordar com `FR-011`) e aplica `preservarCentro` num caminho **só** para os dois casos (divisão arrastada e janela mudando de tamanho); **0** reenquadramentos por conta própria (`FR-007`, contracts/proporcao.md §4; contenção de arquivo com T016)

**Checkpoint**: US1 **e** US2 funcionam de forma independente — a pessoa navega e escolhe quanto da
tela cabe a cada vista.

---

## Phase 5: User Story 3 - Devolvo o diagrama ao quadro, ou o zoom ao natural (Priority: P3)

**Goal**: dois gestos com duas promessas — ajustar à tela devolve **o diagrama inteiro** à área
visível, centralizado, com folga, sem ampliar além do natural e **sem** ser recortado pelo piso;
resetar o zoom volta ao tamanho natural **sem** recentrar. E a área de trabalho **abre** já ajustada
quando há conteúdo.

**Independent Test**: de um enquadramento e um zoom arbitrários sobre um diagrama do tamanho do
envelope, acionar ajustar à tela e conferir que **100%** dos elementos ficaram dentro da área visível,
com folga, em **1** gesto e sem que nenhum se movesse; separadamente, acionar resetar o zoom e
conferir escala 1 exata com **0** deslocamento do ponto central.

### Tests for User Story 3 ⚠️ (escrever primeiro, ver falhar)

- [X] T028 [P] [US3] Teste de unidade da **extensão desenhada** em `tests/unit/extensao.test.ts` — as quatro geometrias (nó = caixa; agrupamento = moldura; conexão = caixa dos **pontos de controle** do caminho; rótulo = caixa em `(labelX,labelY)` pelo medidor de texto **injetável**), união traçado+rótulo, **superset nunca recorte**, determinismo bit a bit, e cache chaveado pela **identidade referencial** dos objetos de `Projecao` (`SC-004`, contracts/extensao-desenhada.md)
- [X] T029 [P] [US3] Estender `tests/unit/enquadramento.test.ts` com os **alvos e as invariantes A1–A7** — `alvoAjustar` centraliza e **nunca amplia** além do natural (A1), **não** é recortado pelo piso (A2) e produz **1** estado final a partir de N partidas, inclusive quando o teto de 1:1 dita a escala (A3); `alvoResetar` **não** recentra (A4); `alvoAbertura` com conteúdo ≡ `alvoAjustar` e vazio ≡ padrão declarado; nenhum alvo lê ou escreve posição de elemento (A6) nem abre transação (A7) (`SC-004`, `SC-005`, `SC-006`)
- [X] T030 [P] [US3] Teste de integração da **abertura derivada do conteúdo** em `tests/integration/abertura-derivada.test.ts` — gatilho de **disparo único**: arma ao montar, dispara na **primeira projeção com conteúdo** e com o quadro já medido, e **desarma**; com conteúdo → ajustado à tela; vazio → padrão declarado (zoom 1, o ponto de nascimento do primeiro elemento no centro) sem erro; **0** reajustes quando o conteúdo muda depois; **0** recuperações da sessão anterior (`FR-017`, `SC-013`, research §10)
- [X] T031 [P] [US3] Teste e2e da US3 (os 7 cenários de aceite) em `tests/e2e/us3-area-trabalho.spec.ts` — 3 partidas distintas → **1** estado final centralizado; diagrama de um nó só visível e centralizado sem ampliar; diagrama vazio sem erro; resetar exato preservando o centro; arranjo e código intocados; envelope determinístico **dentro** da faixa e arranjo espalhado à mão **abaixo** do piso (com afastar saturando no nível corrente, aproximar voltando e apagar conteúdo **sem** reescalar); gesto novo no meio do trânsito **interrompe e assume** (`SC-004`, `SC-005`, `SC-006`, `SC-012`)
- [X] T032 [P] [US3] Teste e2e de **resposta ≤100ms na mediana** de ajustar e resetar no envelope em `tests/e2e/resposta-enquadramento.spec.ts` — mede até o enquadramento **começar** a mudar; a duração do trânsito **não** entra na conta; **0** enfileiramentos e **0** gestos ignorados (`SC-012`)

### Implementation for User Story 3

- [X] T033 [P] [US3] Criar `src/canvas/caminho.ts` — o gerador de caminho do traçado extraído do `getBezierPath` inline: devolve `path`, `labelX`/`labelY` **e os pontos de controle**. Uma função, dois consumidores (contracts/extensao-desenhada.md, Invariante 2)
- [X] T034 [US3] Trocar o `getBezierPath` inline por `caminho.ts` em `src/canvas/Conexao.tsx` — quem pinta passa a chamar a **mesma** função que mede (depende de T033)
- [X] T035 [US3] Criar `src/areatrabalho/extensao.ts` — `extensaoDoElemento(p, id)` e `extensaoDesenhada(p)` (`null` ⇔ diagrama vazio), com `MedirTexto` injetável (canvas 2D em runtime, determinístico em teste), posição absoluta resolvendo `parentId`, e cache pela identidade referencial da projeção; **nunca** lê o DOM (depende de T033)
- [X] T036 [US3] Acrescentar os **alvos** a `src/areatrabalho/enquadramento.ts` — `alvoAjustar(extensao, q)`, `alvoResetar(e, q)` e `alvoAbertura(extensao, q)`, conforme contracts/enquadramento.md §3; o `zoom` do ajuste **não** conhece a faixa (quem a conhece é o gesto contínuo) — depende de T029/T035
- [X] T037 [P] [US3] Criar `src/areatrabalho/transito.ts` — trânsito por `requestAnimationFrame` em `DURACAO_TRANSITO`, **um por vez**, destino calculado **antes** de começar (interpola, não decide), "**interrompe e assume**" (0 enfileiramentos, 0 ignorados) e o gancho de **re-ancoragem a cada quadro** (`FR-008`, `FR-015`, `SC-012`, research §7)
- [X] T038 [US3] Acrescentar à barra em `src/areatrabalho/ControlesEnquadramento.tsx` o botão `⛶` (ajustar à tela) e o **clique no indicador `NN %`** como resetar o zoom — um controle, dois requisitos (`FR-001`, `FR-009`; contenção de arquivo com T017)
- [X] T039 [US3] Acrescentar os atalhos `Shift + 1` (ajustar) e `Shift + 0` (resetar) em `src/areatrabalho/useNavegacao.ts`, sob a mesma guarda de foco e sem disputar letras com `ciclo-por-teclado` (`FR-018`, ADR-005; contenção de arquivo com T016/T027)
- [X] T040 [US3] Implementar o **gatilho de abertura** de disparo único em `src/areatrabalho/AreaDeTrabalho.tsx`, consumindo e desarmando `aberturaPendente` do slot (`FR-017`; contenção de arquivo com T024) — depende de T030/T036

**Checkpoint**: as três histórias funcionam de forma independente — navegar, proporcionar e recuperar
o enquadramento; nenhum enquadramento é beco sem saída.

---

## Phase 6: Capacidade transversal — a área visível que as outras specs consomem (R-05)

**Purpose**: `FR-011` e `FR-012` — a dívida que esta spec **paga para as outras**. Não é história de
pessoa: é a superfície chamável que `ciclo-por-teclado` (`RF-11`) vai consumir **sem saber que existe
React Flow**. Por isso não leva rótulo de história. **Quando** e por qual gesto é acionada continua
sendo de lá.

### Tests (escrever primeiro, ver falhar)

- [X] T041 [P] Estender `tests/unit/area-visivel.test.ts` com `estaNaAreaVisivel` — os 6 casos da tabela do contrato: inteiro com folga → `true`; **encostado** na borda → `false`; **pela metade** → `false`; nó dentro mas **arco do laço** / **rótulo da conexão** / **moldura** fora → `false`; sob controle **persistente** → `false`; na parte que a **página rolada** não mostra → `false`. **0 falsos positivos** (`FR-011`, `SC-008`; contenção com T005)
- [X] T042 [P] Teste de unidade do **canto de partida da ordem de leitura** nas **4 orientações** em `tests/unit/orientacao.test.ts` — `TB`/`TD` e `LR` → superior-esquerdo; `BT` → inferior-esquerdo; `RL` → superior-direito; **uma regra só** para nó, conexão e agrupamento (`FR-012`, Princípio VI)
- [X] T043 [P] Teste de integração de `trazerParaAreaVisivel` em `tests/integration/trazer-area-visivel.test.ts` — **1** mudança de enquadramento, **0** mudanças de zoom, **0** elementos movidos, **0** diferenças no código, **0** entradas de histórico; deslocamento **nulo** quando já visível; elemento **maior** que o quadro ancorado no canto de partida nas **4** orientações; id inexistente é **silencioso** (0 efeitos), não erro (`FR-012`, `SC-008`, contracts/area-visivel.md)

### Implementation

- [X] T044 [P] Criar `src/areatrabalho/orientacao.ts` — a costura de **um valor só**: a orientação corrente (hoje `TD`; o dono é `layout-automatico`/`RF-16`, ADR-007) e `cantoDeLeitura(orientacao): Canto`, para que `layout-automatico` substitua o valor sem tocar em `FR-012`
- [X] T045 [P] Acrescentar `alvoTrazer(elemento, e, q, canto)` a `src/areatrabalho/enquadramento.ts` — zoom **inalterado**, translação **mínima** que põe a extensão inteira no quadro recuado de `FOLGA_BORDA`, nula se já está dentro, e alinhamento do **canto de partida** quando não cabe (A5) — depende de T044
- [X] T046 [P] Acrescentar `estaNaAreaVisivel(caixa, q)` a `src/areatrabalho/areaVisivel.ts` — extensão desenhada **inteira** dentro do quadro **recuado de `FOLGA_BORDA`**, a mesma folga e a mesma geometria que `FR-008` lê (contracts/area-visivel.md, Invariante 3)
- [X] T047 Expor as duas ações no `src/modelo/store.ts` — `estaNaAreaVisivel(id): boolean` e `trazerParaAreaVisivel(id): void`, atendidas pelo `piloto` que o `Canvas` registrou (T018), com o trânsito do `FR-008` e **0** entradas de histórico; nenhuma delas muda seleção ou foco (contenção com T010) — depende de T045/T046

**Checkpoint**: `ciclo-por-teclado` já tem a definição e a capacidade de que o `R-05` depende, e pode
asserir viewport contra `estaNaAreaVisivel`.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: os portões de princípio e de desempenho que valem para a feature inteira. Todos são
checagens executáveis — prosa no PR não fecha portão (Constitution §Fluxo de desenvolvimento).

- [X] T048 [P] Estender a varredura de `tests/unit/nucleo-sem-familia.test.ts` para `src/areatrabalho/**` — `grep` de `flowchart`/`subgraph`/`-->`/`sequenceDiagram`… reprova: a área de trabalho é a mesma seja qual for o tipo aberto (Princípio XII)
- [X] T049 [P] Estender `tests/unit/fronteira-import.test.ts` — `src/areatrabalho` entra no `CAMINHO_EDICAO` (0 importações de `mermaid`) e os módulos novos da feature entram na lista de "não escaparam da fronteira" (Princípio X)
- [X] T050 [P] Teste de integração **byte-idêntico sob rajada** em `tests/integration/byte-identico-area-trabalho.test.ts` — depois de qualquer sequência dos cinco gestos o código tem **0 diferenças**, e **0** saídas do projetor contêm proporção, enquadramento ou nível de zoom (garantido por **posição**, não por limpeza) (`FR-013`, `SC-001`, Princípio V)
- [X] T051 [P] Teste de integração de **sessão volátil** em `tests/integration/sessao-volatil.test.ts` — **0** escritas no armazém do navegador por gesto desta spec; a abertura **deriva** do conteúdo em vez de recuperar a sessão anterior (Princípio XI, ADR-010)
- [X] T052 [P] Estender `tests/integration/posicao-invariante.test.ts` com **cada** gesto novo do repertório (arrastar a divisão, zoom por roda/tecla/controle, arrasto do enquadramento, ajustar à tela, resetar, trazer para a área visível, redimensionar a janela) — a posição de **todos** os elementos é idêntica antes e depois (asserção sobre o `Arranjo` inteiro) e **0** rearranjos são disparados (`SC-002`, Princípio VII)
- [X] T053 [P] Estender `tests/e2e/fps-area-trabalho.spec.ts` com o **trânsito** no envelope — o quarto gesto contínuo, ≥50fps; se o portão reprovar, o recuo declarado é saltar em vez de transitar (estados finais idênticos por spec) (`SC-003`, research §7; contenção com T014/T022)
- [X] T054 [P] Teste e2e **sem ponteiro** em `tests/e2e/sem-ponteiro-area-trabalho.spec.ts` — zoom, ajustar e resetar alcançáveis por atalho com **0** alternâncias para o mouse; **0** sessões por teclado sem saída; a rolagem herdada do R0 intacta e **0** elementos inalcançáveis no envelope — medido **sem** que mover o enquadramento livremente ou mudar a proporção tenham caminho sem ponteiro (`SC-011`, `FR-005`, `FR-018`)
- [X] T055 [P] Conferir a **não-regressão do R1** com a casca nova montada em `tests/e2e/latencia-grafo.spec.ts` — tecla ≤50ms e edição ≤100ms de mediana no envelope continuam verdes (Princípio III)
- [X] T056 [P] Conferir que `tests/unit/projetar.test.ts` e `tests/unit/projetar-grafo.test.ts` passam **sem uma linha de mudança** (`projetar` não é tocado) e registrar o cache da extensão como **novo interessado** na invariante de reuso (Princípio III, ADR-004)
- [X] T057 [P] Conferir que `tests/e2e/rede-off.spec.ts` segue verde com a feature montada e que **0** caminhos de exportação de imagem entraram (`toDataURL`, `toBlob`, serialização de SVG) — ajustar à tela **não** é exportar enquadramento (Princípio XIII)
- [X] T058 Rodar a validação de ponta a ponta de `specs/003-area-de-trabalho/quickstart.md` (Cenários 1–4) e conferir, um a um, os portões da tabela final de performance e fronteira

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências — começa já.
- **Foundational (Phase 2)**: depende do Setup — **BLOQUEIA** todas as histórias.
- **US1 (Phase 3)**: depende do Foundational. É o MVP.
- **US2 (Phase 4)**: depende do Foundational — eixo independente, não depende da US1.
- **US3 (Phase 5)**: depende do Foundational; pressupõe haver zoom e enquadramento a ajustar (US1),
  mas cada gesto é testável sozinho.
- **Capacidade R-05 (Phase 6)**: depende do Foundational **e** de `extensao.ts` (T035, na US3) —
  não é história e não precisa ser independente.
- **Polish (Phase 7)**: depende das fases desejadas concluídas.

### User Story Dependencies

- **US1 (P1)**: começa após o Foundational — sem dependência de outra história.
- **US2 (P2)**: começa após o Foundational — **genuinamente paralela** à US1 (arquivos disjuntos,
  exceto `useNavegacao.ts`).
- **US3 (P3)**: começa após o Foundational — integra com a US1 (há enquadramento a ajustar), testável
  de forma isolada.

### Within Each User Story

- Os testes vêm primeiro e devem **falhar** antes da implementação.
- Aritmética pura (`faixa` → `tipos` → `areaVisivel`/`enquadramento`) antes do store; store antes dos
  componentes; componentes antes da fiação no `Canvas`.
- O gerador de caminho (`caminho.ts`) antes de quem mede (`extensao.ts`) e de quem pinta
  (`Conexao.tsx`) — uma função, dois consumidores.

### Arquivos com contenção (não paralelizar entre si)

- `src/areatrabalho/enquadramento.ts`: T009 (núcleo) → T015 (re-ancoragem) → T036 (alvos) → T045 (`alvoTrazer`).
- `src/areatrabalho/areaVisivel.ts`: T008 (quadro) → T046 (`estaNaAreaVisivel`).
- `src/areatrabalho/useNavegacao.ts`: T016 (US1) → T027 (US2) → T039 (US3).
- `src/areatrabalho/ControlesEnquadramento.tsx`: T017 (US1) → T038 (US3).
- `src/areatrabalho/AreaDeTrabalho.tsx`: T024 (US2) → T040 (US3).
- `src/canvas/Canvas.tsx`: T018 → T019 (sequencial).
- `src/modelo/store.ts`: T010 (slot + ações) → T047 (as duas ações do `R-05`).
- `tests/unit/enquadramento.test.ts`: T006 → T011 (US1) → T029 (US3).
- `tests/unit/area-visivel.test.ts`: T005 → T041 (Fase 6).
- `tests/e2e/fps-area-trabalho.spec.ts`: T014 (US1) → T022 (US2) → T053 (Polish).

---

## Parallel Opportunities

### Setup

```bash
# Os quatro, em arquivos distintos, ao mesmo tempo:
Task T001: "os números declarados em src/areatrabalho/faixa.ts"
Task T002: "os tipos de geometria em src/areatrabalho/tipos.ts"
Task T003: "documento do envelope em tests/fixtures/envelope.ts"
Task T004: "fronteiras novas em .dependency-cruiser.cjs"
```

### Foundational

```bash
# Os três testes juntos (escrever antes, ver falhar):
Task T005: "unit do quadro em tests/unit/area-visivel.test.ts"
Task T006: "unit do núcleo aritmético em tests/unit/enquadramento.test.ts"
Task T007: "integration 0-histórico em tests/integration/area-trabalho-sem-historico.test.ts"

# Depois, as duas implementações puras em paralelo (o store vem depois delas):
Task T008: "areaVisivel.ts"    Task T009: "enquadramento.ts (núcleo)"
```

### User Story 1

```bash
# Todos os testes da US1 juntos (arquivos distintos):
Task T011: "faixa e saturação em tests/unit/enquadramento.test.ts"
Task T012: "re-ancoragem em tests/unit/reancoragem.test.ts"
Task T013: "e2e us1 em tests/e2e/us1-area-trabalho.spec.ts"
Task T014: "e2e fps em tests/e2e/fps-area-trabalho.spec.ts"

# Implementação em três arquivos distintos antes da fiação:
Task T015: "reancorarArrasto em enquadramento.ts"
Task T016: "useNavegacao.ts"
Task T017: "ControlesEnquadramento.tsx"
```

### US1 × US2 (duas pessoas)

```bash
# Após o Foundational, as duas histórias correm juntas — só useNavegacao.ts
# precisa de sequência (T016 antes de T027).
Pessoa A: T011…T019   (navegação: zoom, hand, re-ancoragem)
Pessoa B: T020…T026   (proporção: CSS, casca, divisão, App)
```

### Polish

```bash
# Dez portões independentes (T048…T057), todos em arquivos distintos.
# T058 (quickstart) fecha por último, depois de todos verdes.
```

---

## Implementation Strategy

### MVP First (US1 apenas)

1. Setup (Phase 1) → 2. Foundational (Phase 2, **bloqueia tudo**) → 3. US1 (Phase 3).
4. **PARAR e VALIDAR**: zoom ancorado, hand, saturação, `SC-003` verde nos dois primeiros gestos, e o
   código byte-idêntico depois da rajada.
5. É o ponto de troca: com a proporção fixa e sem ajustar à tela, um diagrama de 400 nós já é
   trabalhável — que é exatamente o que faltava para a sessão real do R1 fechar.

### Incremental Delivery

1. Setup + Foundational → quadro, aritmética e casa de sessão prontos.
2. US1 → testar isolada → **MVP** (navegar num diagrama maior que a tela).
3. US2 → testar isolada → trabalhar na proporção escolhida.
4. US3 → testar isolada → devolver o diagrama ao quadro / o zoom ao natural + abertura derivada.
5. Capacidade `R-05` → `ciclo-por-teclado` ganha o que o `R-05` cobra.
6. Polish → portões de princípio (IV, V, VII, X, XI, XII, XIII), fps do trânsito, sem-ponteiro e
   não-regressão do R1.

### Parallel Team Strategy

1. A equipe fecha Setup + Foundational junta.
2. Depois: A → US1, B → US2 (paralelas de verdade), C prepara os testes da US3 (T028–T032).
3. US3 e a Fase 6 integram por último; a Fase 6 só espera `extensao.ts` (T035).

---

## Notes

- **[P]** = arquivos diferentes, sem dependência pendente. O rótulo **[Story]** mapeia a tarefa à
  história para rastreabilidade.
- Verificar que os testes falham antes de implementar (o R0/R1 já roda TDD).
- **A fronteira desta feature é executável, não disciplinar**: `npm run lint:fronteira` reprova
  `src/areatrabalho/**` → `src/modelo/transacao` (T004). Nenhuma ação do slot chama `commit()`.
- **Complexity Tracking do plano está vazia** — nenhuma violação aceita. Se um portão do Polish
  reprovar (em especial o fps do trânsito, T053), o recuo declarado é **saltar em vez de transitar**:
  a spec fixa o destino, não o caminho, e os dois estados finais são idênticos.
- Ritual de fim de spec (CLAUDE.md): ao terminar, rodar `/zion-prd-trace`.
- Evitar: tarefas vagas, conflito no mesmo arquivo (ver a lista de contenção), e dependência entre
  histórias que quebre a independência de US1 e US2.
