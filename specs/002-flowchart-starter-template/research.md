# Fase 0 — Research: Fatia S1 (Template Starter de Flowchart)

Consolidação das decisões técnicas que S1 encontra em aberto. **Nenhuma decisão de ADR-001..ADR-004 é
reaberta**, e nenhuma decisão A–E do plano de S0 é revisitada. Cada item traz Decisão / Racional /
Alternativas consideradas.

O `spec.md` desta fatia passou por uma sessão de clarificação longa e **já resolveu** as perguntas de
produto (conteúdo do starter, predicado de confirmação, tetos, instrumento de aferição, fronteira de S0).
Este documento **não as re-decide**: ele registra as escolhas de *engenharia* que as realizam, e resolve os
`NEEDS CLARIFICATION` que sobraram no Technical Context.

## NEEDS CLARIFICATION resolvidos

| Incógnita | Resolução | Onde |
|---|---|---|
| Como pôr o starter no primeiro paint sem redefinir o estado inicial do store de S0? | Semeadura síncrona no bootstrap (`main.tsx`) via `setState` externo, **antes** do `render` | Decisão G |
| Como a limpeza cancela um timer module-private do store sem alterar o comportamento do store? | Export aditivo `cancelPendingParse()`; a correção permanece **na limpeza** | Decisão H |
| Qual primitivo entrega o diálogo de FR-016? | shadcn/ui `AlertDialog` sobre `@radix-ui/react-alert-dialog` — única dependência nova | Decisão I |
| Como medir SC-012 contra o build de produção sem alterar `playwright.config.ts`? | Config adicional + sufixo `.perf.ts`, que **não casa** com o `testMatch` default | Decisão J |
| A cláusula "MUST NOT alterar nenhum arquivo de código-fonte de S0" é satisfazível? | **Não**, literalmente; lida como imutabilidade **comportamental** + lista aditiva exaustiva | Decisão F |
| O ciclo `Aprovado? → Revisar` é um caso novo de layout? | Não — o dagre de S0 quebra ciclos internamente (verificado contra `src/core/layout/`) | Decisão L |
| O modelo de S0 carrega o que o starter precisa (formato de nó, rótulo de aresta)? | Sim — `Node.shape` e `Edge.label` existem; `SHAPE_DELIMITERS` emite `diamond → {}`. **Nenhuma extensão do modelo de S0 é prevista** | Decisão L |

---

## Decisão F — Fronteira do "não alterar S0"

**Decisão:** FR-014/FR-014a são honradas como **imutabilidade comportamental**. Nenhum comportamento
entregue em S0 pode ser redefinido; mudanças **estritamente aditivas** em arquivos de S0 são o mecanismo
legítimo da fatia, e a lista delas é **exaustiva (6 arquivos)** e é portão de merge.

**Racional:** a leitura literal ("MUST NOT alterar nenhum arquivo de código-fonte de S0") é
**autocontraditória dentro do próprio spec**: FR-006c manda o `CanvasPanel` (arquivo de S0) sair do modo de
edição quando o nó sumir do modelo; FR-006 manda oferecer uma ação de limpar, que algum componente precisa
renderizar; FR-001a manda o starter no primeiro paint, o que exige um ponto de entrada no bootstrap. As três
recusas concretas do spec — validação nas mutações (FR-006a), guard em `applyParsedText` (FR-006b), mover
estado ao store / reescrever o canvas (FR-006c) — miram todas **redefinição de comportamento**, não a
existência de um diff. O contexto de FR-014a é a fronteira **código × fixture de teste**.

**Alternativas consideradas:**
- *Cumprir a letra (zero diff sob `src/`)*: exigiria não entregar a fatia. Rejeitada.
- *Duplicar os componentes de S0 numa árvore S1* (fork de `App`/`Toolbar`/`CanvasPanel`): satisfaz a letra e
  destrói o espírito — dois renderizadores divergindo, e FR-004 ("o starter é desenhado pelo mesmo
  renderizador, sem tratamento especial") passaria a ser falso. Rejeitada.
- *Monkey-patch do store em runtime* (substituir `setEditorText` via `setState`): evita o diff, torna o
  comportamento de S0 imprevisível a partir do seu próprio código. Rejeitada.

---

## Decisão G — Semeadura no bootstrap, não no estado inicial do store

**Decisão:** `seedStarter(input)` em `src/starter/seed.ts`, chamada **sincronamente** por `main.tsx` antes de
`createRoot(...).render(<App />)`, aplicando `useEditorStore.setState({ model, lastValidModel, editorText })`.

**Racional:** a chamada é anterior ao primeiro render, logo o primeiro paint **já contém** o starter — o
vazio de S0 não é "vazio por um instante", é **nunca renderizado** (FR-001a). Isso só é lícito porque nada da
semeadura é assíncrono: starter constante, `generate` puro e síncrono, dagre síncrono, sem rede. Manter
`createEmptyModel()` como estado inicial preserva o "estado vazio já definido em S0" como alvo **literal** da
limpeza (FR-006) e mantém `editorStore.ts` sem nenhuma ação nova de S1. FR-008 (semear uma vez por sessão)
decorre do local: o bootstrap roda uma vez por carregamento, sem marcador de sessão a consultar — o que
preserva FR-010/ADR-003 e o `sessionStorageLength === 0` que `ephemeral.spec.ts` afirma.

**Alternativas consideradas:**
- *Starter como estado inicial do store* (`create<EditorState>({ model: STARTER_MODEL, ... })`): redefine
  comportamento de S0 (FR-014), apaga a definição do alvo da limpeza e impede FR-011a de receber a entrada de
  decisão. Rejeitada.
- *`useEffect` de semeadura no `App`*: roda **depois** do primeiro paint → exibe o estado vazio de S0 por um
  frame, violando FR-001a e SC-001 ("em zero dessas aberturas o estado vazio é exibido"). Rejeitada.
- *Semear no `main.tsx` com `flushSync` pós-render*: mesma falha, com mais maquinário. Rejeitada.
- *Suprimir a semeadura no reload por marcador de `sessionStorage`*: violaria FR-010 e o próprio
  `ephemeral.spec.ts`. Rejeitada (a spec já a recusa).

---

## Decisão H — Limpeza como módulo S1 sobre `setState`

**Decisão:** `src/starter/clear.ts` expõe `needsClearConfirmation(editorText, canonicalText)` (pura) e
`clearSession()`, que chama `cancelPendingParse()` **e então** restaura o estado vazio integral
(`model`, `lastValidModel`, `editorText`, `status`, `connectMode`, `connectSourceId`).
`cancelPendingParse()` é um **export novo e aditivo** de `editorStore.ts`.

**Racional:** o predicado sobre `editorText` é a única leitura sem perda silenciosa (FR-007) — pega o texto
não interpretável (onde o `model` ainda é o starter) e o texto válido-mas-não-canônico (`%%`, ordem de
declaração) que o modelo não registra. O invariante de FR-006a — *nenhum ponteiro sobrevive à destruição do
conteúdo que referencia* — é necessário porque `mutations.connect` **não valida ids**: um `connectSourceId`
pendurado faz o gerador emitir uma aresta sem definição de origem, que o Mermaid materializa como **nó
implícito**, ressuscitando um nó do starter apagado (FR-008/SC-006). O timer do debounce é module-private:
`cancelPendingParse()` é a única forma de a limpeza alcançá-lo, e ele não altera comportamento algum
(`setEditorText` e `applyParsedText` ficam idênticos). Precedente no próprio arquivo: S0 já exporta
`_flushEditorTextForTests()`, que é controle externo do mesmo timer.

**Alternativas consideradas:**
- *Guard de staleness em `applyParsedText`*: **explicitamente recusado por FR-006b** — corrigiria a classe
  toda, mas alterando o caminho de parse de S0 e contrariando o precedente de FR-006a (corrigir na limpeza,
  não nas mutações). Rejeitada.
- *Re-armar o debounce com `setEditorText('')`*: cancela o parse velho mas **agenda um parse de `''`** →
  `importFlowchart('')` falha → `status: 'invalid'` → "texto não interpretável" sobre um painel recém-limpo.
  Troca um bug por outro. Rejeitada.
- *Aceitar a corrida*: deixaria FR-008 apoiado na lentidão do usuário; um `fill()` + `click()` do Playwright
  vence os 80 ms sem esforço → flakiness garantida. Rejeitada (a spec já a recusa).
- *`clear()` como ação do store*: é a forma arquiteturalmente natural, mas FR-006b diz que a correção
  "MUST NOT ser feita alterando o store de S0". Rejeitada.
- *Validar ids em `mutations.connect`*: recusado por FR-006a (redefiniria S0). Rejeitada.

---

## Decisão I — Diálogo de confirmação: shadcn/ui `AlertDialog`

**Decisão:** `@radix-ui/react-alert-dialog` + `src/components/ui/alert-dialog.tsx` (primitivo shadcn novo).
Única dependência nova da fatia.

**Racional:** FR-016 exige foco que entra, `Escape` que cancela, foco que **retorna ao controle de origem**,
nome/papel acessíveis e operação integral por teclado. Radix entrega focus trap, restauração de foco,
`role="alertdialog"` e `Escape` como comportamento do primitivo — o piso de acessibilidade sai da biblioteca,
não de código de foco à mão, que é onde esse requisito costuma apodrecer. Estende a camada de UI **já fixada
pelo ADR-004** em vez de introduzir outra.

**Alternativas consideradas:**
- *`window.confirm`*: proibido explicitamente por FR-016; bloqueia a thread e é inauditável do jeito que os
  critérios exigem. Rejeitada.
- *Diálogo próprio com gestão de foco à mão*: zero dependência nova, mas reimplementa focus trap e
  restauração de foco — exatamente os pontos que FR-016 existe para garantir. Rejeitada.
- *Confirmar sempre (inclusive o starter intocado)*: simplifica o predicado e põe atrito no **único fluxo que
  a fatia existe para servir**. Rejeitada (a spec já a recusa).

---

## Decisão I-bis — Anúncio da semeadura pós-montagem

**Decisão:** `<StarterAnnouncer />` chama `announce(...)` num `useEffect` de montagem, só se a sessão semeou.
SC-013 afere a **transição** da live region.

**Racional:** `role="status" aria-live="polite"` só é falado quando o leitor de tela observa uma **mudança**
depois de a região ser registrada. Uma região que nasce preenchida é lida como conteúdo estático — o anúncio
seria feito a ninguém, e um teste que afirme apenas o texto final ficaria **verde sobre um recurso mudo**.
Não conflita com FR-001a: aquele governa o estado **visual**; um anúncio um tick depois não exibe estado
intermediário a ninguém.

**Alternativas consideradas:**
- *`announcement` no estado inicial do store*: mudo na prática, e ainda redefiniria o estado inicial de S0.
  Rejeitada.
- *`aria-live="assertive"`*: interromperia o usuário na abertura por um evento não urgente; S0 fixou
  `polite`. Rejeitada.

---

## Decisão J — Portão de SC-012 em configuração e2e separada

**Decisão:** `tests/e2e/starter-boot-latency.perf.ts` + `playwright.perf.config.ts` (chromium; `vite preview`
sobre o build de produção; `testMatch: '**/*.perf.ts'`; 30 amostras após aquecimento; p95 pelo helper de
percentil de S0).

**Racional:** SC-012 só é portão de regressão se o relógio incluir **bundle, boot e render** — é
exatamente o que `tests/perf/` exclui **por decisão declarada de S0** ("React Flow's own DOM render … not
re-timed here"), e a semeadura sequer percorre o `importFlowchart` que aquele harness mede. O dev server
entrega ESM não empacotado e transforma sob demanda: medido ali, o teto descreveria a ferramenta de
desenvolvimento, não o artefato entregue. A configuração de S0 fica **literalmente inalterada** (FR-018)
porque o default `testMatch` do Playwright é `**/*.@(spec|test).?(c|m)[jt]s?(x)` e um arquivo `.perf.ts` não
casa com ele — o portão vive em `tests/e2e/` (como SC-012 manda) sem ser coletado pela config existente.
30 amostras é o tamanho já praticado por `tests/perf/preview-latency.test.ts` e o menor N em que o helper de
percentil de S0 devolve um p95 real em vez do máximo literal.

**Alternativas consideradas:**
- *Medir em `tests/perf/` (vitest)*: cronometraria `generate` + `layout` de 5 nós em microssegundos — verde
  garantido, afirmação não sustentada. Rejeitada (a spec já a recusa).
- *Medir contra o dev server, reusando a config de S0*: mede um artefato que nenhum usuário recebe e é fonte
  previsível de flakiness. Rejeitada.
- *Acrescentar `testIgnore` a `playwright.config.ts`*: funcionaria, mas **altera a configuração existente**,
  que FR-018 manda preservar. O sufixo `.perf.ts` alcança o mesmo resultado com zero diff. Rejeitada.
- *Rodar o portão nos 3 browsers*: SC-012 afere regressão de inicialização, não paridade entre browsers;
  triplicaria o custo e a variância. Rejeitada (FR-018 dispensa).
- *Amostra única*: não sobrevive à variância de um runner compartilhado. Rejeitada.

---

## Decisão K — Aborto do rename derivado do modelo

**Decisão:** `useEffect` novo no `CanvasPanel`: se `editingNodeId` não está em `model.nodes`, sair do modo de
edição.

**Racional:** o rename vive em `useState` **local do `CanvasPanel`**, fora do alcance de qualquer `setState`
do store — a limpeza não pode comandá-lo. Derivar do modelo torna o invariante de FR-006a verdadeiro **onde o
ponteiro vive**. O resíduo eliminado não é ressurreição de conteúdo (o `onKeyDown` de S0 já só renomeia se o
nó existir), e sim um **ponteiro de edição obsoleto** que mantém o `onKeyDownCapture` em modo de digitação e
**engole as teclas destinadas a nós criados depois da limpeza**. Vale para toda destruição do nó em edição —
fecha de brinde o mesmo caminho latente no `removeNode` de S0.

**Alternativas consideradas:**
- *Elevar o rename ao store*: pagaria uma reescrita de S0 (FR-014) para alcançar um estado que a derivação já
  invalida. Rejeitada (a spec já a recusa).
- *Relaxar FR-006a quanto ao rename*: deixaria o teclado do canvas quebrado até o usuário adivinhar `Escape`.
  Rejeitada.

---

## Decisão L — Starter como constante de modelo, ids por slug de S0

**Decisão:** `STARTER_MODEL: GraphModel` congelado + `STARTER_TEXT = generate(STARTER_MODEL)` derivado.
5 nós / 5 arestas / 11 linhas, `direction: 'TD'`, ids = `deriveSlug(label)`, edge ids `e0..e4` (convenção de
`nextEdgeId` de S0).

**Racional:** semear o **modelo** e gerar o texto com o `generate` de S0 torna a forma canônica verdadeira
**por construção** (FR-003) — não por coincidência. Isso é o que sustenta SC-003 (texto do primeiro contato
idêntico ao gerado) e o predicado de FR-007 (`editorText === STARTER_TEXT`), que de outro modo dependeriam de
alguém manter duas representações em sincronia à mão. **Nenhuma extensão do modelo de S0 é necessária.**

**Verificação executada (não presumida).** O `STARTER_MODEL` acima foi rodado contra o código entregue
(`generate`, `deriveSlug`, `importFlowchart`) no passo de plano. Resultados:

- ✅ `generate(STARTER_MODEL)` produz **exatamente** as 11 linhas documentadas em `data-model.md`.
- ✅ `node.id === deriveSlug(node.label)` para os 5 nós — `Aprovado?` → `aprovado` (o `?` cai na
  normalização), `Início` → `inicio`; `fim` não é slug reservado.
- ✅ `importFlowchart(STARTER_TEXT).ok === true` — o starter é válido e o ciclo preserva o conteúdo
  estrutural (nós, shape `diamond` incluído, arestas, rótulos `Sim`/`Não`, e o retorno `aprovado → revisar`).
- ⚠ **Duas normalizações do reimport, descobertas aqui** e registradas em `data-model.md` / ST4: o Mermaid
  devolve `direction: 'TB'` para um `TD` (mesma orientação), e a ACL redefine os edge ids
  (`e0` → `e0-inicio-revisar`). Nenhuma é perda de conteúdo — mas o teste de FR-015 MUST comparar
  estruturalmente (`TD ≡ TB`, edge id fora da comparação), senão fica **vermelho sobre código correto** e
  convida a "consertar" o starter até o verde, quebrando FR-002 ou ST3.

`Node.shape` e `Edge.label` existem em `src/core/model/types.ts` e `SHAPE_DELIMITERS` emite `diamond → {}`
(verificado por leitura); o dagre quebra o ciclo `aprovado → revisar` internamente (Decisão A de S0).

**Alternativas consideradas:**
- *Starter como string Mermaid pré-escrita, importada pela ACL na abertura*: tornaria a forma canônica
  verdadeira por coincidência, faria a semeadura percorrer o parse (com a lentidão e o modo de falha do
  best-effort num caminho que não pode falhar) e criaria um caminho de fallback que FR-015 proíbe.
  Rejeitada (a spec já a recusa).
- *Construir o starter por composição de `mutations.addNode`/`connect`*: derivaria os ids automaticamente, mas
  as mutações de S0 **não sabem** definir `shape: 'diamond'` nem `Edge.label` — o starter perderia a decisão e
  os rótulos `Sim`/`Não`, que são metade do que FR-002 existe para ensinar. Rejeitada; em vez disso, um teste
  unitário **afirma** `id === deriveSlug(label)`, o que verifica a regra de S0 em vez de copiá-la.
- *Emissão inline (`inicio[Início] --> revisar[Revisar]`, 6 linhas)*: reescreveria a saída de **todo** diagrama
  do usuário e os testes que a afirmam, para ganhar 5 linhas contra um teto que é invenção desta fatia.
  Rejeitada (a spec já a recusa; FR-003a ratifica a linha-própria como G9).
- *Renderizar o losango no canvas*: acrescentaria ao `FlowNode` uma capacidade que **nenhum requisito de S0
  pediu**, numa fatia cujo valor é remover o passo zero. Rejeitada — FR-002a fixa o formato como construto do
  painel de código nesta release; renderização de formato pertence a fatia posterior.
