# Contrato — Semeadura (`src/starter/seed.ts`)

Separa a **decisão** (pura, testável isolada) do **efeito** (escrita no store no bootstrap).

## Interface

```ts
export type RestorableDraft = { readonly text: string }
export interface SeedInput { restorableDraft: RestorableDraft | null }

export function shouldSeedStarter(input: SeedInput): boolean   // PURA
export function seedStarter(input: SeedInput): boolean          // efeito; devolve se semeou
export function starterWasSeeded(): boolean                     // leitura do resultado do bootstrap
```

## Garantias (verificáveis)

- **SD1 — Decisão pura, entrada explícita (FR-011a):** `shouldSeedStarter` é uma função pura de `SeedInput`.
  A regra de precedência de FR-011 vive **nela**, e não no caminho de inicialização da interface. Não lê
  store, `window`, storage nem relógio. Portão: `tests/unit/starter-seed.test.ts`.
- **SD2 — Precedência do rascunho (FR-011/SC-008):** `shouldSeedStarter` devolve `false` para **qualquer**
  `restorableDraft` não nulo — **inclusive um que represente um canvas vazio** (`{ text: '' }`). Devolve
  `true` **somente** para `null`. O starter nunca é mesclado ao rascunho nem escrito por cima dele.
  Portão: teste unitário passando um rascunho **simulado** — SC-008 é aferida **sem que nada do buffer do
  RN-06 seja construído** (FR-011).
- **SD3 — Nenhum produtor real de rascunho (FR-011):** esta fatia MUST NOT introduzir qualquer produtor de
  conteúdo restaurável. `main.tsx` passa `{ restorableDraft: null }` **literal**. A entrada existe; o buffer
  que a preencheria, não. Portão: grep — nenhum `localStorage`/`sessionStorage`/IndexedDB em `src/`
  (`ephemeral.spec.ts` de S0 já afirma `storageLength === 0` e continua verde).
- **SD4 — Efeito síncrono, pré-render (FR-001a):** quando semeia, `seedStarter` aplica **uma única**
  `useEditorStore.setState({ model: STARTER_MODEL, lastValidModel: STARTER_MODEL, editorText: STARTER_TEXT })`.
  É chamada por `main.tsx` **antes** de `createRoot(...).render(<App />)`, sincronamente. Não há `await`,
  `setTimeout`, `Promise` nem rede em nenhum ponto do caminho. Consequência: o **primeiro paint já contém o
  starter** e o estado vazio de S0 **nunca é renderizado** — não é "vazio por um instante", é vazio nunca
  exibido (SC-001).
- **SD5 — Uma vez por sessão (FR-008):** decorre do **local** da chamada — o bootstrap roda uma vez por
  carregamento de página. Nenhuma decisão de semeadura consulta estado acumulado: não há marcador de sessão,
  nem storage, nem re-semeadura por esvaziamento de texto ou qualquer outra transição. `starterWasSeeded()`
  **não participa dessa decisão** — é apenas a leitura, pós-fato, do resultado do bootstrap, consumida
  exclusivamente pelo anúncio de FR-017a (SD7). Recarregar é sessão nova (Edge Cases). Portão:
  `tests/e2e/clear.spec.ts` (starter não volta depois de limpo) + `ephemeral.spec.ts` (nenhum storage).
- **SD6 — Estado inicial do store intocado (FR-014):** `editorStore.ts` continua nascendo com
  `createEmptyModel()`/`editorText: ''`. A semeadura **empurra** estado de fora; ela não redefine o estado
  inicial de S0 — que é, literalmente, o alvo da limpeza (FR-006). Portão: diff de `editorStore.ts` restrito
  ao export aditivo `cancelPendingParse` (Decisão F).
- **SD7 — Resultado do bootstrap legível (FR-017a):** `seed.ts` mantém um flag **module-private**, escrito
  **uma única vez** por `seedStarter`, e o expõe por `starterWasSeeded()`. É o canal pelo qual
  `<StarterAnnouncer />` sabe se deve anunciar: `main.tsx` chama `seedStarter` **antes** do render (SD4) e
  não tem como entregar o retorno a um componente montado depois, sem alterar a assinatura do `App`
  (FR-014). Nesta fatia o flag é sempre `true` na execução real — `restorableDraft` é `null` literal (SD3)
  —; ele existe para que o anúncio continue **correto** quando a fatia do RN-06 passar a suprimir a
  semeadura, em vez de anunciar um starter que não foi semeado. Não é marcador de sessão e não é lido por
  `shouldSeedStarter` (SD1/SD5). Portão: `tests/unit/starter-announce.test.tsx`.

## Não-garantias (declaradas)

- **Enquadramento (FR-013):** o fit-to-view é do `fitView` que o `CanvasPanel` de S0 **já aplica**; a
  semeadura não o comanda. É estado de **viewport efêmero**: não muta o modelo nem altera o texto
  (Princípio VIII).
- **Anúncio (FR-017a):** a semeadura **não** anuncia. O anúncio é emitido pós-montagem por
  `<StarterAnnouncer />` — uma live region que nasce preenchida não é falada (Decisão I-bis).
