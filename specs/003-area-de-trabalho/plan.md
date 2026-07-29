# Implementation Plan: Área de trabalho

**Branch**: `003-area-de-trabalho` | **Date**: 2026-07-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-area-de-trabalho/spec.md`

## Summary

O R0 provou o cano e o R1 encheu-o de vocabulário; esta feature entrega o **lugar de trabalho** onde
os dois acontecem. Ela não acrescenta uma palavra ao diagrama: acrescenta **onde a pessoa está
olhando o plano, em que escala, e quanto da tela cabe a cada vista**.

A escolha estruturante deste plano é uma só, e ela decorre do ADR-002: **a engine entrega o canvas,
não o desenho**. React Flow dá transform, roda, arrasto e `fitView`; o que a spec pede a mais —
centralização determinística, descer abaixo do piso da faixa, medir pela **extensão desenhada** em vez
da caixa do nó, e o pan de **deslocamento mínimo** do `FR-012` — nasce como **quatro funções puras de
produto sobre a engine**, nunca como uma segunda engine. É por isso que o coração desta feature é
`areatrabalho/enquadramento.ts` (aritmética, testável sem navegador) e não um componente.

Cinco costuras carregam a feature; o detalhe está em [research.md](./research.md):

1. **Onde o estado de sessão desta spec vive (ADR-003).** Num **slot irmão de `modelo` e `arranjo`
   no store único** (`EstadoSessao.areaDeTrabalho`), marcado como não-serializável — não num segundo
   store paralelo, e não dentro do `Modelo`. É essa posição, e não uma limpeza na hora de copiar, que
   faz proporção, enquadramento e zoom **nunca** viajarem no código: `serializar` projeta o `Modelo`,
   e o que não está lá simplesmente não é emitido (`FR-013`, `SC-001`).
2. **Nenhum gesto abre transação — por construção (ADR-009).** As ações do slot escrevem por `set()`
   direto, **fora** de `commit()`, exatamente como o sinal `revelar` do R1 já faz. Nenhuma delas toca
   `Modelo` nem `Historico`, e uma regra de fronteira do `dependency-cruiser` proíbe
   `src/areatrabalho/**` de importar `modelo/transacao` (`FR-014`, `SC-009`).
3. **A extensão desenhada vem de uma função só, compartilhada com quem desenha.** O traçado é medido
   pelo **mesmo gerador de caminho** que o pinta (`canvas/caminho.ts`, consumido por `Conexao.tsx` e
   por `areatrabalho/extensao.ts`), pelo casco convexo dos pontos de controle — superset garantido,
   nunca recorte. Laço, arestas paralelas, rótulo de conexão e moldura de agrupamento entram por
   construção, e `FR-008` e `FR-011` **não podem divergir** porque leem a mesma função (`SC-004`,
   `SC-008`).
4. **O gesto contínuo não passa pelo React.** Zoom e arrasto do enquadramento correm no transform da
   engine; o arrasto da divisão escreve uma **variável CSS** por `ref`. O store é reconciliado no
   **fim** do gesto — o mesmo padrão que o R1 já usa para os nós (`useNodesState` local, só o gesto
   concluído vira comando). É o que sustenta ≥50fps no envelope sem reprojetar nada (`FR-016`,
   `SC-003`, ADR-004).
5. **A capacidade do `R-05` é superfície chamável, não gesto (ADR-005).** `trazerParaAreaVisivel(id)`
   e `estaNaAreaVisivel(id)` ficam no store, atendidas por um piloto que o Canvas registra ao montar.
   `ciclo-por-teclado` chama sem saber que existe React Flow; **quando** chamar continua sendo de lá
   (`FR-011`, `FR-012`).

Os números que a spec deixou para o plano estão fechados em [§1 do research](./research.md#1-os-números-declarados)
e vivem num arquivo só (`areatrabalho/faixa.ts`): faixa de zoom **[0,01 – 4]**, área de referência
**1280×720 px**, folga da borda **24 px de tela** (uma só, para `FR-008` e `FR-011`), mínimos
**480 px** (diagrama) e **320 px** (editor), proporção padrão **58 / 42**, e trânsito de **180 ms**
interrompível.

## Technical Context

**Language/Version**: TypeScript 5.6 sobre React 18 (herdado do R0/R1).

**Primary Dependencies**: React 18 + Vite 5 (ADR-001); Tailwind CSS + shadcn/ui vendorizado
(ADR-001) — é dele que nascem a divisão arrastável, a barra de controles, o indicador de nível e o
cursor hand; `@xyflow/react` 12.x (ADR-002) — agora usando `panOnDrag` por botão, `zoomOnPinch`,
`minZoom`/`maxZoom` **dinâmicos**, `setViewport`/`getViewport` e `useStoreApi` para re-ancorar o
arrasto; Zustand para o store único de sessão (ADR-003). **Nenhuma dependência nova** — nem de
painéis redimensionáveis, nem de animação: a divisão é `flex-basis` + `min-width` em CSS (§4 do
research) e o trânsito é `requestAnimationFrame`. `mermaid` 11.16.0 permanece só como oráculo de
teste (Princípio X).

**Storage**: Nenhum. Proporção, enquadramento, zoom e modo hand vivem **só na sessão** e **não** são
persistidos: a abertura os **deriva** do conteúdo presente (`FR-017`). Guardar qualquer um deles entre
sessões seria decisão de `rascunho-da-sessao` (ADR-010), não desta spec.

**Testing**: Vitest (unidade/integração: aritmética de enquadramento, extensão desenhada nas quatro
geometrias, área visível descontada e recortada pela tela, deslocamento mínimo, canto de leitura nas 4
orientações, clamp da proporção, 0 entradas de histórico, código byte-idêntico) + Playwright
(navegador: fps ≥50 nos quatro gestos contínuos no envelope 400/500, resposta ≤100ms de ajustar e
resetar, e2e das três histórias, interrupção do trânsito, arrasto em curso sob zoom).

**Target Platform**: Navegadores modernos (evergreen). Artefato estático servível sem backend
(Princípio XIII).

**Project Type**: Aplicação web client-only de tela única (single project) — a mesma árvore do R0/R1.

**Performance Goals**: dentro do envelope de **400 elementos-nó e 500 conexões** — gesto contínuo
**≥50fps** para zoom, arrasto do enquadramento, arrasto da divisão **e o trânsito** (`SC-003`,
`FR-016`); ajustar à tela e resetar **respondem em ≤100ms na mediana** (`SC-012`, medido até o
enquadramento começar a mudar). As barras de tecla (≤50ms) e edição (≤100ms) do R1 seguem valendo e
**não podem regredir**.

**Constraints**: nada desta spec no código (Princípio V); nenhum gesto abre transação nem alimenta o
histórico (Princípio IV); nenhum gesto move elemento nem dispara rearranjo (Princípio VII); a
invariante de reuso da projeção continua de pé e **ganha um consumidor** — o cache da extensão
desenhada é chaveado pela identidade dos objetos projetados (Princípio III); mermaid fora do caminho
de edição (Princípio X); sem rede em runtime e sem caminho de exportação de imagem — ajustar à tela
**não** é exportar enquadramento (Princípio XIII).

**Scale/Scope**: o envelope de produto continua **400 nós / 500 conexões** e esta feature **não
acrescenta peso por elemento**: 0 estado por nó, 0 nó de render adicional, 0 handle novo. O que ela
acrescenta é trabalho **por gesto** — O(n) na varredura da extensão desenhada, só quando ajustar à
tela ou uma pergunta de visibilidade acontece, com cache; e O(1) por quadro no gesto contínuo, que é
um transform CSS.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Source: `.specify/memory/constitution.md`.

| Principle | Touched? | Evidence this PR will present |
|-----------|----------|-------------------------------|
| I — Keyboard cycle, ≤4 control keys / 0 pointer events (NFR-01, R-05) | **yes (só a capacidade; o dever fica com `ciclo-por-teclado`)** | Esta spec **paga a dívida** que o Princípio I cobra na asserção de viewport: define "área visível" e entrega a superfície chamável. Evidência aqui: contrato [`contracts/area-visivel.md`](./contracts/area-visivel.md) + testes de `estaNaAreaVisivel` (0 falsos positivos para elemento encostado na borda, pela metade, atrás de sobreposição persistente e fora da parte da tela que a página rolada mostra) e de `trazerParaAreaVisivel` (1 mudança de enquadramento, 0 mudanças de zoom, 0 elementos movidos, deslocamento **nulo** quando já visível, elemento maior que o quadro ancorado no canto de partida nas **4 orientações**) — `SC-008`. O teste de ≥9 elementos por teclado permanece com `ciclo-por-teclado`, e passa a poder asserir viewport contra esta função. |
| II — Reconfigure in ≤3 steps (NFR-02, declared target, unmeasured) | **N/A** | Nada aqui reconfigura tipo, shape ou estilo de elemento — nenhum elemento é tocado (`FR-010`). O alvo permanece sem medição, e a primeira feature de reconfiguração (`estilo-de-elementos`) o mede. |
| III — Density envelope as budget: 400/500, 100ms/50ms/50fps + projection reuse (NFR-03, R-04) | **yes** | **Custo por elemento acrescentado: nenhum** — 0 campo por nó, 0 nó de render, 0 handle, 0 controle pendurado por elemento (a barra é **uma**, da área, não do elemento — Condição 3 do ADR-005). O custo é **por gesto**: O(n) na extensão desenhada (só em ajustar à tela e nas perguntas de visibilidade, com cache chaveado pela **identidade referencial** dos objetos projetados) e O(1)/quadro no gesto contínuo. Testes: (a) fps ≥50 no envelope cheio para **zoom, arrasto do enquadramento, arrasto da divisão e trânsito** (`SC-003`); (b) ajustar e resetar ≤100ms de mediana no envelope (`SC-012`); (c) **não-regressão** das barras do R1 (tecla ≤50ms, edição ≤100ms) na mesma suíte; (d) o teste de reuso da projeção segue passando **sem mudança** — `projetar` não é tocado, e o cache da extensão **depende** do reuso, o que faz desta feature um sexto interessado na invariante. |
| IV — Transaction is the unit of undo, p95 ≤110ms at 400 (NFR-04, R-09, RN-04) | **yes (pela negativa, e por construção)** | Nenhum gesto desta spec abre transação. Evidências executáveis: (a) regra nova do `dependency-cruiser` — `src/areatrabalho/**` **não pode** importar `modelo/transacao` (e nenhuma ação do slot chama `commit()`); (b) teste de rajada — 40 zooms, arrastos de enquadramento e arrastos de divisão produzem **0** entradas de histórico, e **1** desfazer reverte o último ato **do modelo** (`SC-009`). Não é filtragem: o histórico não recebe nada para filtrar. |
| V — Code is a faithful projection of durable state only (NFR-05, R-03, RN-01) | **yes** | `SC-001`: depois de qualquer sequência dos cinco gestos, o código é **byte-idêntico** (**0** diferenças) — os testes `byte-identico*` do R0/R1 ganham o caso "rajada da área de trabalho". E **0** ocorrências de proporção, enquadramento ou nível de zoom em qualquer saída do projetor: garantido por posição (o slot é irmão do `Modelo`, e `serializar` só lê o `Modelo`), não por limpeza. |
| VI — Reading-order fidelity outside groups; divergence declared inside (NFR-06) | **yes (só o termo, não a ordem)** | Esta spec não ordena nada; ela **consome** o termo "começo na ordem de leitura" com o mesmo sentido do princípio. Evidência: teste de `cantoDeLeitura` nas **4 orientações** (TB/TD → superior-esquerdo; BT → inferior-esquerdo; LR → superior-esquerdo; RL → superior-direito), regra **uma só** para nó, conexão e agrupamento (`FR-012`). Qual é a orientação corrente continua sendo de `layout-automatico` (`RF-16`, ADR-007) e entra por uma costura de um valor só. |
| VII — Layout is an explicit gesture; no edit rearranges (R-07, RN-03) | **yes** | `SC-002`: para **cada** gesto novo do repertório (arrastar a divisão, zoom por roda/tecla/controle, arrasto do enquadramento, ajustar à tela, resetar, trazer para a área visível, redimensionar a janela), a posição de **todos** os elementos é idêntica antes e depois — asserção sobre o `Arranjo` inteiro — e **0** rearranjos são disparados. Enquadrar nunca é rearranjar: o alvo do `FR-008` é `(x, y, zoom)`, e o `Arranjo` é entrada da conta, nunca saída. |
| VIII — Label text returns byte-for-byte or returns marked (NFR-07, RN-02) | **N/A** | Nenhum texto é lido, escrito ou reescrito. `FR-015` garante que um rótulo **em edição** não é encerrado por gesto de enquadramento — isso é preservação de foco, não round-trip de texto, e tem teste próprio em `SC-010`. |
| IX — Code analysis always returns a diagram, never nothing (NFR-08, R-06) | **N/A** | O caminho texto → modelo não é tocado. |
| X — REFUSAL: mermaid stays out of the editing path (R-06) | **yes** | Nenhuma importação nova de `mermaid`. A regra `sem-mermaid-no-caminho-de-edicao` do `dependency-cruiser` é **estendida** para cobrir `src/areatrabalho`, que nasce dentro da fronteira. |
| XI — Long session does not degrade; draft fails toward not existing (NFR-09, R-10, RN-05, RN-07) | **N/A (e pela negativa)** | Nada desta spec é persistido: teste que assere **0** escritas no armazém do navegador por gesto de área de trabalho. Que a abertura **derive** do conteúdo em vez de recuperar a sessão anterior (`FR-017`) é consequência direta do ADR-010 — o rascunho devolve o diagrama, não o passado dele. |
| XII — Five types, common core, per-family vocabulary (R-02, R-08) | **yes (pela ausência)** | A área de trabalho é **a mesma seja qual for o tipo aberto**: `src/areatrabalho/**` não nomeia família alguma. O teste `nucleo-sem-familia` ganha o novo diretório na varredura (`grep` de `flowchart`/`subgraph`/`-->`/`sequenceDiagram`… reprova). A extensão desenhada fala de nó, traçado e moldura — o vocabulário comum às três famílias. |
| XIII — REFUSAL: browser-only; the deliverable is the code, not an image (R-01, PRD §4) | **yes** | 0 dependências novas e 0 rede nova: o e2e com a rede desligada segue passando. **Ajustar à tela não é exportar**: nenhum `toDataURL`, `toBlob` ou serialização de SVG entra — o gesto muda `(x, y, zoom)` e nada mais. A checagem de caminho de download de imagem segue reprovando o PR. |
| XIV — REFUSAL: nothing presumed, no style control without code backing (RN-06, RN-08) | **N/A** | Nenhum controle de estilo é exposto e nenhum elemento é criado. Os controles desta feature (afastar, nível, aproximar, ajustar, mão) governam a **vista**, não o elemento, e não têm contrapartida em código por definição — é o oposto da violação, que é oferecer controle de elemento sem lastro. |

Nenhuma violação aceita — **Complexity Tracking fica vazia**. Onde um princípio é tocado só pela
metade (I entrega a capacidade e deixa o dever com `ciclo-por-teclado`; VI empresta o termo sem
decidir a orientação), a metade restante tem dono nomeado no backlog e a costura nasce pronta.

## Project Structure

### Documentation (this feature)

```text
specs/003-area-de-trabalho/
├── plan.md                      # Este arquivo (/speckit-plan)
├── research.md                  # Fase 0 — os números declarados + as cinco costuras
├── data-model.md                # Fase 1 — o slot de sessão e os tipos de geometria
├── quickstart.md                # Fase 1 — roteiro de validação das três histórias + SCs
├── contracts/                   # Fase 1 — as quatro superfícies
│   ├── extensao-desenhada.md    #   a geometria única de FR-008 e FR-011
│   ├── area-visivel.md          #   o quadro descontado + a superfície do R-05 (FR-011/FR-012)
│   ├── enquadramento.md         #   faixa, âncoras, ajustar/resetar/abrir, trânsito, afordâncias
│   └── proporcao.md             #   divisão, mínimos, razão, rolagem de página
├── checklists/
│   └── requirements.md          # (já gerado por /speckit-clarify)
└── tasks.md                     # Fase 2 (/speckit-tasks — NÃO criado aqui)
```

### Source Code (repository root)

A árvore do R1 ganha **um diretório novo** e toca três arquivos existentes. O diretório novo é quase
todo **aritmética pura**, testável sem navegador; o que precisa de engine fica em dois componentes e
num hook.

```text
src/
├── App.tsx                             # passa a montar a casca; a página ganha rolagem horizontal (FR-006)
├── areatrabalho/
│   ├── faixa.ts                        # OS NÚMEROS DECLARADOS, num arquivo só: piso/teto do zoom, área de
│   │                                   #   referência, folga da borda, mínimos, proporção padrão, trânsito, passo
│   ├── AreaDeTrabalho.tsx              # a casca: as duas vistas + a divisão; a razão é uma variável CSS
│   ├── Divisao.tsx                     # NOVO — arrasto da divisão (ponteiro); escreve a variável CSS por ref,
│   │                                   #   sem estado React no meio do gesto; comita a razão ao soltar
│   ├── ControlesEnquadramento.tsx      # NOVO — barra flutuante: afastar · NN% (clique = resetar) · aproximar ·
│   │                                   #   ajustar à tela · alternância do modo hand; registra a própria oclusão
│   ├── areaVisivel.ts                  # NOVO — o quadro: (área do diagrama ∩ tela) − faixas sobrepostas;
│   │                                   #   `estaNaAreaVisivel`; registro de oclusão persistente
│   ├── extensao.ts                     # NOVO — extensão desenhada de nó, traçado, rótulo e moldura; cache
│   │                                   #   chaveado pela IDENTIDADE dos objetos projetados (ADR-004)
│   ├── enquadramento.ts                # NOVO — aritmética pura: ajustar, resetar, abrir, trazer (deslocamento
│   │                                   #   mínimo), zoom ancorado, preservação do centro no redimensionamento
│   ├── transito.ts                     # NOVO — trânsito por rAF, interrompível ("interrompe e assume"), com a
│   │                                   #   re-ancoragem do arrasto em curso a cada quadro (FR-015)
│   ├── orientacao.ts                   # NOVO — canto de partida da ordem de leitura nas 4 orientações; a
│   │                                   #   orientação corrente entra por uma costura de `layout-automatico`
│   └── useNavegacao.ts                 # NOVO — afordâncias: ctrl+roda/pinça, Espaço, botão do meio, teclas;
│                                       #   modo hand; minZoom dinâmico; observador de tamanho
├── canvas/
│   ├── Canvas.tsx                      # + props de navegação, cursor, piloto registrado no store, re-ancoragem
│   ├── Conexao.tsx                     # passa a usar `caminho.ts` (a MESMA função que mede)
│   └── caminho.ts                      # NOVO — o gerador de caminho do traçado: uma função, dois consumidores
├── modelo/
│   └── store.ts                        # + slot `areaDeTrabalho` (razão, enquadramento, modo hand, piloto) e as
│                                       #   ações dele — irmãs de `revelar`, FORA de `commit()` (FR-014)
├── codec/ · projecao/ · editor/        # (inalterados)
tests/
├── unit/                               # + enquadramento, extensao, area-visivel, orientacao, proporcao
├── integration/                        # + byte-idêntico sob rajada, 0 histórico, 0 movimento de elemento,
│                                       #   abertura derivada do conteúdo, 0 escrita no armazém
└── e2e/                                # + us1/us2/us3 da área de trabalho, fps dos 4 gestos contínuos,
                                        #   resposta ≤100ms, interrupção do trânsito, arrasto sob zoom
```

**Structure Decision**: single project, a mesma topologia do R0/R1. A decisão estrutural desta
feature é a **fronteira engine × produto**, e ela tem endereço: tudo o que a spec pede **além** do
canvas vive em `src/areatrabalho/*.ts` como função pura sobre `(Projecao, Arranjo, Quadro,
Enquadramento)`, e os três arquivos com engine (`useNavegacao.ts`, `Canvas.tsx`,
`ControlesEnquadramento.tsx`) apenas **aplicam** o que essas funções calculam. É esse corte que torna
`FR-008`, `FR-011` e `FR-012` verificáveis em Vitest sem navegador — e é ele que garante que
"centralizado", "abaixo do piso" e "deslocamento mínimo" nunca virem detalhe de configuração de
biblioteca.

## Complexity Tracking

> Sem violações a justificar — nenhuma linha.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
