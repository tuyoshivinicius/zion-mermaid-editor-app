# Implementation Plan: Elementos do grafo dirigido

**Branch**: `002-elementos-grafo-dirigido` | **Date**: 2026-07-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-elementos-grafo-dirigido/spec.md`

## Summary

O R1 **enche o cano provado no R0 com o vocabulário do grafo dirigido**: o mesmo modelo-única-verdade
(ADR-003) e o mesmo par codec/projeção do R0 ganham dois agregados — **conexão** e **agrupamento** —,
e a área do diagrama (React Flow, ADR-002) passa a oferecer os gestos que montam, rotulam e corrigem um
fluxo inteiro sem tocar no código, com cada ato projetado no código **menos o arranjo**.

O núcleo não é reescrito: o codec continua sendo **um núcleo comum + um vocabulário de reconhecedores
por família** (ADR-006/008), e esta é a primeira feature a **materializar esse vocabulário** — a forma
do nó já existe; a forma da **conexão** (aresta) e do **agrupamento** (bloco `subgraph … end`) nascem no
módulo da família `flowchart/`, sem que o núcleo aprenda uma palavra de família (Princípio XII). A
projeção ganha arestas e nós-container reusáveis (a invariante de reuso do ADR-004, agora com três
famílias de objeto de vista). Toda mutação continua atravessando **uma transação** (ADR-009), e um ato
sobre uma seleção de N elementos — inclusive a exclusão em cascata que esvazia agrupamentos aninhados —
é **uma** entrada de histórico.

Cinco costuras carregam o R1 e recebem tratamento explícito abaixo (detalhe em [research.md](./research.md)),
**todas medidas contra o oráculo mermaid** onde a semântica do grafo dirigido decide (SC-001):

1. **Agregados no núcleo × gramática na família (ADR-008).** `Conexao` e `Agrupamento` entram como
   *slots de agregado* do `Modelo` (ao lado de `nos`, como o R0 já anteviu), mas toda a **gramática** —
   tokens de aresta, delimitadores de bloco, o que é ruído de ordem — vive em `codec/flowchart/`. O
   núcleo itera slots e delega emissão/reconhecimento ao registro; nunca soletra `-->` nem `subgraph`.
2. **Pertencimento e aninhamento por menção, cirúrgicos (FR-002/FR-014/FR-017/SC-009).** Medido no
   oráculo: mermaid **aninha subgraph por menção do id** do filho dentro do bloco pai, resultado
   idêntico ao aninhamento léxico. Logo tanto membro-nó quanto **agrupamento-filho** entram por
   **menção isolada** — o gesto insere o bloco no fim e a menção dentro do bloco, **sem realocar nenhuma
   linha preexistente**.
3. **Identidade de conexão sem token no código (FR-006/FR-007).** A aresta flowchart **não tem id
   escrito**. A identidade da conexão é **efêmera de sessão** (como a posição), nunca projetada; uma
   passagem de reconciliação reassocia arestas relidas às conexões vivas por (origem, destino, ordinal)
   para manter a seleção estável e a **marca durável** através da releitura.
4. **Marca de expressividade durável (FR-006/SC-002).** O codec de rótulo é **lossless** (round-trip
   byte-exato); a marca é propriedade **determinística** do texto. Editar outra linha e reler preserva
   o texto integral e a marca *por construção*; para os poucos casos de código lossy (string markdown),
   a reconciliação por id preserva o texto integral enquanto a forma degradada não muda.
5. **Ato em bloco e cascata numa transação (FR-011/FR-012/SC-006/SC-008).** Selecionar/mover/duplicar/
   excluir uma seleção normalizada (cada elemento uma vez) é **uma** transação; a exclusão de nó leva as
   conexões presas, e a exclusão/retirada que esvazia um agrupamento **sobe em cascata** pelos níveis
   aninhados — tudo dentro do mesmo commit.

## Technical Context

**Language/Version**: TypeScript 5.x sobre React 18 (herdado do R0, research.md §1 do R0).

**Primary Dependencies**: React 18 + Vite 5 (ADR-001); Tailwind CSS + shadcn/ui vendorizado (ADR-001);
`@xyflow/react` 12.x (ADR-002) — agora usando **edges**, **connection (onConnect + handles)**, **seleção
retangular por contenção** (`SelectionMode.Full`) e **nós aninhados** (`parentId`/`extent`) da engine;
Zustand para o store único de sessão (ADR-003). `mermaid` 11.16.0 permanece **só como oráculo de teste**
(ADR-006, Princípio X) — nenhuma importação de runtime nova.

**Storage**: Nenhum. Sessão única e volátil (o rascunho é `rascunho-da-sessao`, fora desta spec). Único
contrato externo em runtime: **área de transferência** — agora na **leitura** (colar texto puro num
rótulo, FR-005) além da escrita do R0 (copiar). Colagem lê `text/plain`; quando o navegador nega, avisa
sem falhar em silêncio (Assumptions da spec).

**Testing**: Vitest (unidade/integração: codec de conexão e de agrupamento, pertencimento e cascata,
reuso da projeção com três famílias de objeto, round-trip/ponto-fixo do grafo dirigido, prefixos,
byte-idêntico com bloco e membro, duplicação por fecho transitivo, exclusão em cascata) + Playwright
(navegador: **oráculo mermaid** para SC-001 sobre o corpus do grafo dirigido — inclusive os hostis
escritos à mão: aresta-no-bloco e dupla-menção; **latência** SC-005 no envelope cheio 400/500; e2e das
três histórias; gesto contínuo ≥50fps SC-010).

**Target Platform**: Navegadores modernos (evergreen). Artefato estático servível sem backend (Princípio XIII).

**Project Type**: Aplicação web client-only de tela única (single project) — a mesma árvore do R0.

**Performance Goals**: dentro do envelope de **400 elementos-nó (nós + agrupamentos) e 500 conexões** —
edição pontual refletida na outra vista **≤100ms na mediana** (SC-005), tecla no editor **≤50ms na
mediana**, gesto contínuo **≥50fps** (SC-010). Sustentadas pela **invariante de reuso** da projeção,
agora estendida a arestas e nós-container (ADR-004).

**Constraints**: posição/seleção/foco nunca no código (Princípio V); mermaid fora do caminho de edição
(Princípio X); toda mutação é transação e o ato em bloco é 1 entrada (Princípio IV); o texto volta byte
a byte ou marcado, nunca em silêncio (Princípio VIII); a análise nunca devolve vazio (Princípio IX); o
núcleo não nomeia família (Princípio XII); sem rede em runtime, sem exportar imagem (Princípio XIII).

**Scale/Scope**: envelope de produto 400 nós / 500 conexões (ADR-004), com **agrupamento consumindo
uma vaga de nó** e sem número novo (clarificação da spec; NFR-03 intacto). A profundidade de aninhamento
e o tamanho do texto colado são **medidos, não limitados** (FR-005). Esta é a **primeira** feature a
gastar as vagas de conexão e agrupamento do envelope; mede o próprio consumo.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Source: `.specify/memory/constitution.md`.

| Principle | Touched? | Evidence this PR will present |
|-----------|----------|-------------------------------|
| I — Keyboard cycle, ≤4 control keys / 0 pointer events (NFR-01, R-05) | **N/A** | Os gestos desta spec são **de ponteiro** (Assumptions da spec); o ciclo por teclado e os atalhos são `ciclo-por-teclado`. O editor de rótulo inline (aberto por gesto) recebe o foco, mas o teste de ≥9 elementos por teclado é daquela spec. |
| II — Reconfigure in ≤3 steps (NFR-02, declared target, unmeasured) | **N/A** | R1 não reconfigura tipo/shape/estilo — é `estilo-de-elementos`/`trocar-em-bloco`. O elemento nasce e permanece neutro (RN-06). |
| III — Density envelope as budget: 400/500, 100ms/50ms/50fps + projection reuse (NFR-03, R-04) | **yes** | **Custo por elemento acrescentado:** conexão = +1 `Conexao` no modelo + 1 objeto de aresta projetado (0 entrada de arranjo — aresta não tem posição); agrupamento = +1 `Agrupamento` + 1 nó-container projetado + 1 entrada de arranjo (moldura), e **consome 1 vaga das 400**. Testes: (a) **reuso estendido** — projeta duas vezes mudando 1 elemento e assere **identidade referencial** de nós, arestas **e** agrupamentos não mudados; (b) SC-005 edição ≤100ms mediana no envelope cheio (400 nós+grupos / 500 conexões); (c) tecla ≤50ms mediana; (d) gesto contínuo ≥50fps (SC-010). Os três números medidos no envelope cheio. |
| IV — Transaction is the unit of undo, p95 ≤110ms at 400 (NFR-04, R-09, RN-04) | **yes (transação e coalescência; gesto de desfazer diferido)** | Todo ato é transação (checagem de fronteira: nenhum caminho escreve no modelo fora dela). SC-006: ato em bloco sobre até 400 elementos → **1** entrada, mesmo com agrupamento **e** membros na seleção (seleção normalizada, cada elemento 1×). SC-008: exclusão/retirada que esvazia agrupamentos aninhados sobe em **cascata** numa **única** entrada. FR-007: rajada de digitação/colagem num rótulo → 1 entrada. O **commit** do ato em bloco a 400 (**p95 ≤110ms**, ≥100 repetições) e o **revert** por igualdade estrutural são medidos por **T049** — evidência de NFR-04 nesta spec, que é onde o ato em bloco nasce. Só o **gesto visível** de desfazer/refazer e a latência dele ficam com `desfazer-e-refazer`. |
| V — Code is a faithful projection of durable state only (NFR-05, R-03, RN-01) | **yes** | SC-004: mover qualquer elemento/seleção deixa o código **byte-idêntico**, inclusive arrastar um nó para dentro/fora da moldura (**0** mudanças de pertencimento por arrasto), e **0** posição/seleção/foco/zoom em qualquer saída. SC-001: **100%** do corpus do grafo dirigido (conexões, agrupamentos, aninhados) aceito pelo `mermaid.parse()` e desenhando o mesmo diagrama, com **0 divergências de pertencimento** nos hostis escritos à mão. |
| VI — Reading-order fidelity outside groups; divergence declared inside (NFR-06) | **N/A** | Orientação e layout automático são `layout-automatico`; R1 herda a orientação `TD` fixa do R0 e **nunca** recalcula o diagrama (Princípio VII). Não corrige nem declara ordem — a declaração da divergência dentro de agrupamento é RF-17/`layout-automatico`. R1 apenas **não reordena** (escrita cirúrgica, append no fim). |
| VII — Layout is an explicit gesture; no edit rearranges (R-07, RN-03) | **yes** | SC extends: para **cada** operação nova do repertório (conectar, agrupar, mover-seleção, duplicar, excluir, adicionar/retirar membro), a posição de **todos** os preexistentes é idêntica antes/depois. O elemento novo (nó, conexão, agrupamento, cópia) nasce por **colocação local determinística** sem mover ninguém; duplicar coloca perto **sem** deslocar preexistente (FR-010). |
| VIII — Label text returns byte-for-byte or returns marked (NFR-07, RN-02) | **yes (a metade byte-a-byte + a durabilidade da marca; a aparência visível diferida)** | SC-002: corpus hostil por família (agora **texto de conexão** além de rótulo de nó), incluindo **multi-linha**, **rótulo vazio** (0 repovoados, 0 identificadores como rótulo) e colagem de texto puro (**0 vestígios** de formatação, SC-003). Cada texto termina byte-idêntico **ou** marcado; **0** alterações em silêncio, **0 truncamentos**, **0 recusas** por tamanho (FR-005). **Durabilidade** (novo em R1): editar outra linha e reler preserva o texto integral e a marca em 100% dos marcados cuja forma degradada não mudou — **0 perdas por releitura**. A **aparência visível** definitiva da marca é `codigo-de-entrada` (RF-22); aqui a marca **existe e é observável** no diagrama. |
| IX — Code analysis always returns a diagram, never nothing (NFR-08, R-06) | **yes** | A análise tolerante ganha aresta e bloco: teste de **prefixos** sobre o corpus do grafo dirigido — nenhum elemento real some ao digitar (bloco `subgraph` sem `end` ainda, aresta incompleta), e a análise **nunca** devolve vazio. Bloco vazio escrito à mão **existe e é exibido** (FR-019). Erros derrubam o statement, avisos sinalizam (duas listas). |
| X — REFUSAL: mermaid stays out of the editing path (R-06) | **yes** | Os reconhecedores/emissores de conexão e agrupamento são do **codec próprio** (`codec/flowchart/`). Checagem de fronteira de importação estendida: nenhum módulo do caminho de edição importa `mermaid`; ele aparece só na página-oráculo de teste. Ampliar a lista exigiria ADR novo. |
| XI — Long session does not degrade; draft fails toward not existing (NFR-09, R-10, RN-05, RN-07) | **N/A** | Sessão única e volátil (Assumptions da spec); o rascunho é `rascunho-da-sessao`. |
| XII — Five types, common core, per-family vocabulary (R-02, R-08) | **yes** | **Primeira materialização** do vocabulário por família (ADR-008): a gramática de conexão e agrupamento nasce em `codec/flowchart/` (conexao.ts, agrupamento.ts); o **núcleo** (analisar/serializar/reconhecedores) ganha só a mecânica **agnóstica de família** de pilha-de-container. Checagem de fronteira: um `grep` de `subgraph`/`-->`/`flowchart` no núcleo reprova. Os outros quatro tipos são `tipo-*`. |
| XIII — REFUSAL: browser-only; the deliverable is the code, not an image (R-01, PRD §4) | **yes** | Nenhuma rede nova em runtime (colar lê a área de transferência da plataforma, não a rede): e2e com rede desligada segue passando. Nenhum caminho de exportação de imagem, auth ou sessão remota introduzido. |
| XIV — REFUSAL: nothing presumed, no style control without code backing (RN-06, RN-08) | **yes** | Conexão nasce **sem texto** e agrupamento nasce com **título neutro**; nó/conexão/agrupamento novos não herdam nada (teste do nascer-neutro). **Nenhum** controle de estilo é exposto (shape/estilo/conectivo são `estilo-de-elementos`/R4). O lexema do conectivo lido de um código de fora é **preservado** para a escrita byte-fiel, mas **não é oferecido como controle** — preservar leitura ≠ presumir/oferecer. |

Nenhuma violação aceita — a seção Complexity Tracking fica vazia. Onde um princípio é tocado só pela
metade (I/II adiados a `ciclo-por-teclado`/`estilo-de-elementos`; a aparência visível da marca a
`codigo-de-entrada`), a metade restante tem dono nomeado no backlog e a costura nasce preparada.

## Project Structure

### Documentation (this feature)

```text
specs/002-elementos-grafo-dirigido/
├── plan.md              # Este arquivo (/speckit-plan)
├── research.md          # Fase 0 — as cinco costuras, todas medidas no oráculo
├── data-model.md        # Fase 1 — Conexão, Agrupamento (+ Nó, Seleção, Contador estendidos)
├── quickstart.md        # Fase 1 — roteiro de validação das três histórias + SCs
├── contracts/           # Fase 1 — codec do grafo dirigido, descritores de gesto, projeção
│   ├── codec-grafo-dirigido.md
│   ├── change-descriptor.md
│   └── projection.md
├── checklists/
│   └── requirements.md  # (já gerado por /speckit-clarify)
└── tasks.md             # Fase 2 (/speckit-tasks — NÃO criado aqui)
```

### Source Code (repository root)

A árvore do R0 **cresce nos módulos existentes** e ganha poucos arquivos novos, todos na fronteira já
declarada (codec de família, canvas, modelo). Os módulos do núcleo mudam só na mecânica agnóstica de
família (pilha de container); a gramática do grafo dirigido é isolada em `codec/flowchart/`.

```text
src/
├── App.tsx                     # (inalterado) tela única
├── modelo/
│   ├── modelo.ts               # + Conexao, Agrupamento; slots conexoes[]/agrupamentos[]; helpers de pertencimento/cascata
│   ├── selecao.ts              # NOVO — seleção de sessão: contenção, aresta-derivada, normalização (cada elemento 1×)
│   ├── store.ts                # + ações conectar/agrupar/editarTexto/colar/duplicarSelecao/excluirSelecao/mudarPertencimento/moverSelecao; reconciliação estendida
│   ├── transacao.ts            # (quase inalterado) a entrada já carrega o modelo inteiro (nós+conexões+agrupamentos)
│   ├── arranjo.ts              # + posição/tamanho da moldura do agrupamento (efêmero); membro herda âncora local
│   └── contador.ts             # generalizado: contadores por espécie (n / e / sub); e-N é só de sessão (não observado do código)
├── codec/
│   ├── nucleo/
│   │   ├── analisar.ts         # + pilha de container agnóstica (abrir/fechar); membro pega o topo da pilha
│   │   ├── reconhecedores.ts   # Ctx ganha container stack + abrirContainer/fecharContainer; FamiliaCodec ganha emitirConexao/emitirAgrupamento
│   │   ├── serializar.ts       # + emissão de conexões e blocos (doc inteiro, só teste); normalizar ordena os novos agregados
│   │   └── rotulo.ts           # (inalterado) o checker de expressividade serve rótulo de nó, texto de conexão e título
│   ├── flowchart/
│   │   ├── index.ts            # registra na ordem: cabeçalho, abrir-subgraph, end, conexão, nó
│   │   ├── no.ts               # (inalterado)
│   │   ├── conexao.ts          # NOVO — reconhecedor + emissor da aresta; preserva o lexema do conectivo (byte-fiel)
│   │   └── agrupamento.ts      # NOVO — reconhecedores de `subgraph …` (abre) e `end` (fecha) + emissor do bloco
│   └── cirurgica.ts            # + cirurgia ciente de bloco: inserir/remover menção, remover bloco+cascata, remover linhas de conexão presa
├── projecao/
│   └── projetar.ts             # + arestas e nós-container com reuso; ordena pai antes de filho (React Flow)
├── canvas/
│   ├── Canvas.tsx              # + conectar (onConnect/handles), seleção retangular por contenção, mover-seleção, agrupar/duplicar/excluir/pertencimento, alvo mais específico
│   ├── CaixaNo.tsx             # + handles origem/destino; editor de rótulo inline; marca
│   ├── Conexao.tsx             # NOVO — aresta customizada com texto editável inline + marca
│   └── Agrupamento.tsx         # NOVO — moldura (nó-container) com título + marca
└── editor/                     # (inalterado) vista e produtor de comandos
tests/
├── unit/                       # + conexao, agrupamento, pertencimento, cascata, reuso-3-familias, selecao
├── integration/                # + round-trip grafo dirigido, prefixos, byte-idêntico com bloco/membro, duplicar-transitivo, excluir-cascata, cirurgia de bloco
└── e2e/                        # + us1/us2/us3 grafo dirigido, oráculo SC-001 (corpus dirigido + hostis à mão), latência 400/500
corpus/                         # + docs do grafo dirigido: conexões, blocos, aninhados, aresta-no-bloco, dupla-menção, bloco-vazio
```

**Structure Decision**: single project, a mesma topologia do R0. A decisão estrutural do R1 é a
**fronteira núcleo × família**: o núcleo do codec ganha apenas a mecânica de **pilha de container**
(agnóstica — não sabe que o container é um `subgraph`), e toda a gramática do grafo dirigido vive em
`codec/flowchart/conexao.ts` e `codec/flowchart/agrupamento.ts`. É essa fronteira que a checagem do
Princípio XII verifica, e é o que torna o vocabulário **isolável** (ADR-008) para as famílias `tipo-*`
reporem o seu sem tocar no núcleo.

## Complexity Tracking

> Sem violações a justificar — nenhuma linha.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
