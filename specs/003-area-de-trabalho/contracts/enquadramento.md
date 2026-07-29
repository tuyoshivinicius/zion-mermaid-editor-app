# Contrato — Enquadramento: faixa, âncoras, alvos e trânsito

Tudo o que a spec pede **além** do que React Flow promete vive aqui, como **aritmética pura** sobre
`(Caixa, Quadro, Enquadramento)`. Os componentes só aplicam o que estas funções calculam — é esse
corte que torna `FR-008`, `FR-009` e `FR-017` verificáveis em Vitest, sem navegador.

Módulos: `src/areatrabalho/enquadramento.ts` (aritmética) · `faixa.ts` (números) · `transito.ts`
(caminho) · `useNavegacao.ts` (afordâncias).

## 1. Os números declarados (`faixa.ts`)

| Constante | Valor | Requisito |
|---|---|---|
| `PISO_ZOOM` | **0,01** | `FR-001` |
| `TETO_ZOOM` | **4** | `FR-001` |
| `TAMANHO_NATURAL` | **1** | `FR-001`, `FR-009` |
| `AREA_REFERENCIA` | **1280 × 720 px** | `FR-001` |
| `FOLGA_BORDA` | **24 px de tela** | `FR-008`, `FR-011` |
| `DURACAO_TRANSITO` | **180 ms** | `FR-008`, `FR-009`, `FR-012` |
| `PASSO_ZOOM` | **1,2 ×** | `FR-001`, `FR-018` |

A conta que justifica o piso está em [research.md §1.1](../research.md#11-a-conta-do-piso--por-que-001):
o envelope determinístico (390 nós em fila, ≈85.778 px) cabe em 1280−2×24 px a **0,01436**; o piso
declarado é 0,01, com folga. A faixa **contém** o tamanho natural por construção.

## 2. Superfície

```ts
type Enquadramento = { x: number; y: number; zoom: number }

/** FR-002 — zoom ancorado num ponto de TELA (ponteiro) ou no centro do quadro (sem ponteiro). */
function zoomAncorado(e: Enquadramento, pontoDeTela: Ponto, fator: number): Enquadramento

/** FR-008 — tudo dentro, com folga, CENTRALIZADO, sem ampliar além do natural. */
function alvoAjustar(extensao: Caixa | null, q: Quadro): Enquadramento

/** FR-009 — só a escala: o ponto do plano no centro do quadro continua no centro. */
function alvoResetar(e: Enquadramento, q: Quadro): Enquadramento

/** FR-017 — com conteúdo, o alvo de ajustar; vazio, o padrão declarado. */
function alvoAbertura(extensao: Caixa | null, q: Quadro): Enquadramento

/** FR-012 — pan puro, deslocamento mínimo, ancorado no canto de leitura quando não cabe. */
function alvoTrazer(elemento: Caixa, e: Enquadramento, q: Quadro, canto: Canto): Enquadramento

/** FR-007 — o quadro mudou de tamanho: preserva zoom e o ponto do plano no CENTRO. */
function preservarCentro(e: Enquadramento, anterior: Quadro, atual: Quadro): Enquadramento

/** FR-001 — o piso que a engine deve impor ao GESTO CONTÍNUO agora. */
function pisoCorrente(zoomCorrente: number): number   // = min(PISO_ZOOM, zoomCorrente)
```

## 3. Os alvos, por extenso

```
alvoAjustar:   zoom = min( (q.w − 2·folga)/ext.w , (q.h − 2·folga)/ext.h , TAMANHO_NATURAL )
               x, y tais que o CENTRO de `ext` caia no CENTRO de `q`
               ext == null (diagrama vazio) → o padrão declarado, sem erro

alvoResetar:   zoom = TAMANHO_NATURAL
               o ponto do plano que estava no centro de `q` continua no centro

alvoAbertura:  ext != null → alvoAjustar(ext, q)
               ext == null → zoom = 1, com o ponto de nascimento do primeiro elemento
                             (ORIGEM + (CAIXA_W/2, CAIXA_H/2)) no centro de `q`

alvoTrazer:    zoom inalterado
               translação mínima que põe `elemento` inteiro dentro de `q` recuado de `folga`
               nula se já está dentro
               não cabendo, alinha o CANTO de `elemento` ao canto correspondente de `q` recuado
```

### Invariantes dos alvos

| # | Invariante | Requisito |
|---|---|---|
| A1 | `alvoAjustar` **nunca amplia** além do tamanho natural | `FR-008`, `SC-005` |
| A2 | `alvoAjustar` **não é recortado pelo piso** — pode terminar abaixo dele | `FR-008`, `SC-005` |
| A3 | O resultado de `alvoAjustar` é **único** a partir de qualquer partida — mesmo quando o teto de 1:1 dita a escala | `FR-008`, `SC-004` |
| A4 | `alvoResetar` **não recentra**: só a escala muda | `FR-009`, `SC-006` |
| A5 | `alvoTrazer` **não muda o zoom** e o deslocamento é o **mínimo** | `FR-012`, `SC-008` |
| A6 | Nenhum alvo lê ou escreve posição de elemento — o `Arranjo` é entrada, nunca saída | `FR-010`, `SC-002` |
| A7 | Nenhum alvo abre transação nem alimenta o histórico | `FR-014`, `SC-009` |

## 4. A faixa, e como ela convive com "descer abaixo do piso"

React Flow satura em `minZoom`/`maxZoom`. A spec quer três coisas que um par fixo não dá — e a solução
é **`minZoom` dinâmico**, recalculado ao fim de cada gesto (nunca por quadro):

```
minZoom = pisoCorrente(zoom) = min(PISO_ZOOM, zoomCorrente)      maxZoom = TETO_ZOOM
```

| Situação | Comportamento | Requisito |
|---|---|---|
| Gesto contínuo chegando ao piso ou ao teto | **satura**: continua respondendo, não salta, não trava, não falha em silêncio | `FR-001` |
| Ajustar à tela exigindo escala abaixo do piso | **desce** abaixo dele | `FR-008`, `SC-005` |
| Estando abaixo do piso, afastar mais | satura **no nível corrente** — não salta para o piso | `FR-008` |
| Estando abaixo do piso, aproximar | sobe; ao cruzar `PISO_ZOOM`, o piso volta a ser 0,01 | `FR-008` |
| Estando abaixo do piso, apagar ou encolher conteúdo | **0 reescalonamentos automáticos** — nada reexecuta o ajuste | `FR-008`, `SC-005` |
| Área do diagrama menor que a referência | o piso **não** acompanha; o gesto contínuo satura, e quem entrega o diagrama inteiro é `FR-008` | `FR-001`, `SC-005` |

## 5. As afordâncias (`FR-018`)

| Gesto | Ponteiro | Sem ponteiro |
|---|---|---|
| Aproximar / afastar | **Ctrl/⌘ + roda** e **pinça** (ancorado no ponteiro) · botões `−` / `+` | **`Ctrl/⌘ + =`** / **`Ctrl/⌘ + −`** (ancorados no centro do quadro) |
| Rolar o plano | **roda pura** — a rolagem herdada do R0 (`FR-005`) continua | — |
| Arrastar o enquadramento | modo hand (persistente: alternância na barra; temporária: **segurar `Espaço`**) · **arrasto com o botão do meio** | **não tem** (enumeração exaustiva) |
| Ajustar à tela | botão `⛶` | **`Shift + 1`** |
| Resetar o zoom | **clique no indicador `NN %`** | **`Shift + 0`** |
| Nível observável | indicador `NN %` na barra (coalescido em rAF) | o mesmo |
| Mudar a proporção | arrastar a divisão | **não tem** (idem) |

**Guarda única:** nenhum atalho dispara com o foco em `input`, `textarea` ou `contenteditable` — a
mesma guarda que o `Canvas` do R1 já usa para `Delete`. Letras ficam livres: o alfabeto do repertório
de edição é de `ciclo-por-teclado` (ADR-005).

**A barra fica no canto inferior direito da área do diagrama e registra a própria oclusão** — a faixa
que ela cobre sai da área visível (`FR-011`). A spec prefere descontar a sobreposição a proibi-la.

**O modo hand na engine é uma propriedade só:** `panOnDrag = modoHand ? [0, 1] : [1]`, com
`selectionOnDrag` no complemento. O cursor declara o destino do arrasto **antes** de ele começar:
`crosshair` fora do modo (nasce seleção retangular), `grab` / `grabbing` dentro dele (`FR-004`,
`SC-014`). Entrar ou sair **não altera a seleção**.

## 6. O trânsito (`transito.ts`)

**Transita**, em `DURACAO_TRANSITO` (180 ms), por `requestAnimationFrame`.

| Propriedade | Regra | Requisito |
|---|---|---|
| Destino | calculado **antes** de começar, pela mesma função pura que um salto usaria — o trânsito interpola, não decide | `FR-008` |
| Gesto novo no meio | **interrompe e assume**: cancela o quadro pendente e comanda. **0** enfileiramentos, **0** ignorados | `FR-008`, `SC-012` |
| Estado final | idêntico ao do salto (ou o do gesto que assumiu) | `FR-008`, `SC-012` |
| Orçamento | gesto contínuo para todos os efeitos: **≥50fps** no envelope | `FR-016`, `SC-003` |
| Resposta | `SC-012` mede até o enquadramento **começar** a mudar; a duração do trânsito **não** entra na conta | `SC-012` |
| Âncora do `FR-015` | vale **a cada quadro** (§7) | `FR-015` |

Um quadro de trânsito é **um transform CSS do painel**: 0 reprojeções, 0 re-renders dos 400 nós, 0
recomputações de extensão. Existe **um** trânsito por vez.

## 7. O que não se interrompe (`FR-015`)

O arrasto de nó do React Flow calcula `posição = ponto_do_plano_sob_o_ponteiro − deslocamento_capturado`.
Se o enquadramento muda sem o ponteiro se mexer, o próximo movimento faz o elemento **saltar** pela
diferença. O contrato exige uma **re-ancoragem O(1)** a cada mudança de enquadramento durante um
arrasto: recalcular o deslocamento capturado a partir do transform corrente, de modo que a posição do
elemento **no plano** fique invariante.

Roda em três situações: zoom por roda/tecla/controle, arrasto do enquadramento, e **a cada quadro do
trânsito**. Onde o zoom é ancorado no ponteiro (`FR-002`), a conta dá **zero** por construção — o que
serve de asserção natural nos testes.

| Garantia | Requisito |
|---|---|
| **0** arrastos cancelados, **0** concluídos à força, **0** gestos inertes | `FR-015`, `SC-010` |
| O ponto do plano que o arrasto pegou continua sob o ponteiro | `FR-015`, `SC-010` |
| **0** deslocamentos do elemento arrastado além do que o ponteiro pediu | `FR-015`, `SC-010` |
| Rótulo em edição continua aberto e acompanha o elemento; seleção inalterada | `FR-015`, `SC-010` |

Seleção e edição sobrevivem **por não serem tocadas**: nenhum gesto desta spec escreve em `Modelo`,
seleção ou foco, e mudar `(x, y, zoom)` não desmonta componente algum. O que quebraria isso é a
remontagem — já proibida pela invariante de reuso (ADR-004/ADR-005), que esta feature não toca.
