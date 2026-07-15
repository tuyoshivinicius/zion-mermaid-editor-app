# Contrato — Limpeza (`src/starter/clear.ts` + `src/components/ClearAction.tsx`)

Separa o **predicado** (puro) do **efeito** (restauração do estado vazio) e da **superfície** (botão +
diálogo).

## Interface

```ts
// src/starter/clear.ts — puro + efeito, sem React
export function needsClearConfirmation(editorText: string, canonicalText: string): boolean   // PURA
export function clearSession(): void

// src/state/editorStore.ts — export ADITIVO de S0 (Decisão H)
export function cancelPendingParse(): void
```

## Garantias (verificáveis)

- **CL1 — Predicado puro sobre o TEXTO (FR-007):**
  `needsClearConfirmation(t, c) === (t !== '' && t !== c)` — comparação de string, caractere a caractere,
  contra a forma canônica do starter (`STARTER_TEXT`). MUST NOT ler o `model`. Portão:
  `tests/unit/starter-clear.test.ts`.

  Por que o `editorText` e não o `model` — é a única leitura **sem caso de perda silenciosa**:

  | Situação | `model` | `editorText` | Ler o `model` daria | Correto |
  |---|---|---|---|---|
  | Starter intocado | starter | canônico | sem confirmação ✓ | **sem confirmação** |
  | Texto não interpretável digitado por cima (S0, FR-012) | **ainda o starter** | trabalho do usuário | **sem confirmação** ✗ — destrói trabalho | **confirmação** |
  | Válido mas não canônico (`%%`, ordem — perdas de S0, FR-008) | não registra a diferença | trabalho do usuário | **sem confirmação** ✗ | **confirmação** |
  | Painel vazio | vazio | `''` | sem confirmação ✓ | **sem confirmação** |

  O viés é o do **falso positivo**: perguntar de mais custa um clique; perguntar de menos destrói trabalho de
  forma irreversível (não há desfazer nesta release).

- **CL2 — Estado vazio INTEGRAL (FR-006/FR-006a):** `clearSession()` restaura o estado de abertura por
  inteiro, **inclusive o estado só-de-UI**: `model` e `lastValidModel` → `createEmptyModel()`; `editorText`
  → `''`; `status` → `'ok'`; `connectMode` → `false`; `connectSourceId` → `null`. Portão:
  `tests/unit/starter-clear.test.ts` + `tests/e2e/clear.spec.ts`.

- **CL3 — Nenhum ponteiro sobrevive ao conteúdo (FR-006a/SC-006):** um `connectSourceId` pendurado é
  **materialmente perigoso**, não desleixo: `mutations.connect` **não valida ids**, o gerador emite
  `revisar --> <nó novo>` sem definição de `revisar`, e o **Mermaid cria um nó implícito** — ressuscitando no
  canvas um nó do starter que o usuário apagou. A correção MUST estar na **limpeza**, e MUST NOT ser feita
  acrescentando validação às mutações de S0 (FR-014). Portão e2e: limpar com origem pendente → adicionar 2
  nós → conectar → a aresta liga **apenas** os nós novos; **zero** nós implícitos do starter.

- **CL4 — Trabalho em voo cancelado (FR-006b/SC-006):** `clearSession()` chama `cancelPendingParse()`
  **antes** do `setState`. Nenhuma escrita agendada antes da limpeza alcança o modelo depois dela. Sem isso,
  o timer de `setEditorText` (que captura o texto por closure) dispararia em t≤80 ms e `applyParsedText`
  escreveria `model`/`lastValidModel` **sem escrever `editorText`** — canvas repovoado ao lado de um código
  vazio. `cancelPendingParse` **só** dá `clearTimeout` no handle existente: `setEditorText` e
  `applyParsedText` ficam byte-idênticos (a alternativa do guard de staleness é recusada por FR-006b).
  Portão: unitário (parse armado + limpeza + avanço do timer → estado permanece vazio) + e2e (cenário 9).

- **CL5 — Ponteiro de edição derivado do modelo (FR-006c/SC-006):** o `CanvasPanel` MUST sair do modo de
  edição quando `editingNodeId` deixar de existir em `model.nodes`. Derivado, **não comandado** pela limpeza:
  o rename é `useState` local do componente, fora do alcance do store. Vale para **toda** destruição do nó em
  edição — inclusive o `removeNode` já entregue em S0. O resíduo eliminado não é ressurreição de conteúdo (o
  `onKeyDown` de S0 só renomeia se o nó existir), e sim um ponteiro obsoleto que faria o `onKeyDownCapture`
  **engolir as teclas destinadas a nós criados depois da limpeza**. Portão: e2e (cenário 10).

- **CL6 — Superfície e acessibilidade (FR-006/FR-016):** a ação é alcançável **por teclado** (Tab/Enter) e
  **não depende do painel de código estar expandido** — daí `<ClearAction />` ser montado no `Toolbar`, no
  lado do canvas. Quando `needsClearConfirmation` é **falso**, a limpeza executa **imediatamente, sem
  diálogo**. Quando é **verdadeiro**, abre um `AlertDialog` da própria aplicação (**não** `window.confirm`)
  que: leva o foco ao abrir; cancela com `Escape`; **retorna o foco ao controle de limpar** ao fechar
  (confirmando **ou** cancelando); tem nome e papel acessíveis; é integralmente operável por teclado.
  Cancelar MUST deixar o conteúdo **exatamente** como estava. Portão: `tests/unit/clear-dialog.test.tsx`
  (RTL) + `tests/e2e/clear.spec.ts`.

- **CL7 — Conclusão anunciada (FR-017b/SC-013):** ao concluir, `ClearAction` chama o `announce()` que S0 já
  expõe, alimentando o `StatusRegion` existente. A operação é destrutiva e irreversível e **MUST NOT terminar
  em silêncio**. Não precisa do cuidado de FR-017a (Decisão I-bis): a limpeza é, por construção, uma mudança
  **posterior** à montagem, logo a live region já transiciona. Portão: e2e.

## Não-garantias (declaradas)

- **Sem desfazer.** A limpeza é irreversível nesta release — é a razão de CL1 existir.
- **Sem re-semeadura (FR-008).** Depois de limpo, o starter não volta durante a sessão: nada chama
  `seedStarter` fora do bootstrap (SD5).
- **`announcement` não é zerado** por `clearSession()`: a limpeza **escreve** o anúncio de conclusão (CL7).
