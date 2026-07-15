# Implementation Plan: Fatia S1 — Template Starter de Flowchart

**Branch**: `002-flowchart-starter-template` | **Date**: 2026-07-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/002-flowchart-starter-template/spec.md`

## Summary

S1 troca o **estado vazio de abertura** por um **ponto de partida vivo**: ao abrir, o canvas mostra um
Flowchart starter e o painel de código mostra o Mermaid correspondente, desde o **primeiro paint**,
imediatamente editável pelas cinco ações centrais de S0 e descartável numa única ação. O `spec.md` é a
fonte da verdade dos **requisitos** (FR-001..FR-018, SC-001..SC-013); este plano descreve **a stack, a
arquitetura e as restrições técnicas** que os realizam dentro dos ADR-001..ADR-004 — que **não são
re-decididos aqui** — e fixa as decisões que S1 encontra em aberto (Decisões F–K).

**Abordagem técnica (uma frase):** o starter é uma **constante de modelo de grafo** (não uma string
Mermaid), semeada **sincronamente no bootstrap da SPA antes do primeiro render** via `setState` do store
de S0; o texto do painel é produzido pelo **gerador determinístico de S0**, o que torna a forma canônica
verdadeira **por construção**; a limpeza é um **módulo S1** que restaura o estado vazio de S0 por inteiro
(inclusive estado só-de-UI e trabalho em voo); e o portão de 1 s é um **e2e Playwright contra o build de
produção**, isolado numa configuração própria.

**Nenhuma capacidade nova de edição, sincronização ou geração é introduzida.** S1 muda **o estado com que
a sessão nasce** e acrescenta **uma ação de saída** (limpar). Todo o resto é S0 inalterado.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), ES2022; Node 20 LTS — inalterado (S0)
**Primary Dependencies**: as de S0 (React 18 · `@xyflow/react` ADR-001 · Vite 5 ADR-004 · shadcn/ui +
  Tailwind ADR-004 · `mermaid` 11.x só na ACL ADR-002 · `dagre` · `zustand`) **+ uma única adição**:
  `@radix-ui/react-alert-dialog` (primitivo shadcn/ui do diálogo de confirmação — FR-016). Nenhuma
  dependência nova de runtime de diagrama, layout ou estado.
**Storage**: N/A — a sessão permanece **efêmera** (ADR-003 / FR-010). S1 **não** introduz `localStorage`,
  `sessionStorage`, IndexedDB, cookie ou marcador de sessão de espécie alguma.
**Testing**: Vitest + React Testing Library (modelo do starter, decisão de semeadura, predicado e efeitos
  da limpeza, foco do diálogo, transição da live region) · Playwright (US1–US3, limpeza, portão SC-012)
**Target Platform**: navegador desktop moderno, mouse + teclado — inalterado (S0). Viewport de **aferição**
  de SC-009: **1280×800** (não restringe os tamanhos suportados — FR-013 enquadra em qualquer viewport)
**Project Type**: Single-project SPA (Vite) — sem `backend/`, sem `app/`/`pages/`, sem `'use client'`,
  sem `next/*` (ADR-004), inalterado
**Performance Goals**: **p95 ≤ 1 s** do `page.goto('/')` até o starter simultaneamente desenhado no canvas
  e escrito no painel (SC-012/FR-001), aferido no **build de produção**, **30 amostras**, **chromium**,
  runner de CI como hardware de referência. O p95 ≤ 150 ms de input→render de S0 (Princípio I) permanece
  inalterado e **não é re-aferido** aqui: S1 não acrescenta caminho de input.
**Constraints**: (a) **imutabilidade comportamental de S0** — nenhum comportamento entregue em S0 pode ser
  redefinido (FR-014); as mudanças em arquivos de S0 são **estritamente aditivas** e enumeradas
  exaustivamente na Decisão F; (b) semeadura **síncrona**, sem etapa assíncrona e sem estado intermediário
  (FR-001a); (c) o starter entra como **modelo**, nunca como string pré-escrita (FR-003); (d) validade do
  starter garantida **em tempo de teste**, sem verificação em runtime e **sem caminho de fallback**
  (FR-015); (e) **nenhuma superfície de escolha de template** (FR-012); (f) os 8 portões da constitution
  v1.0.0 permanecem verdes
**Scale/Scope**: conteúdo fixo de **5 nós / 5 arestas / 11 linhas**, dentro do teto de **6 nós / 14 linhas**
  (FR-013). O teto de 60/90 de S0 (Decisão C) **não se aplica** — ele governa conteúdo arbitrário do
  usuário; o starter é conteúdo fixo nosso.

## Constitution Check

*GATE: deve passar antes da Fase 0 e ser reavaliado após a Fase 1.*

S1 não introduz caminho de parse, geração, layout ou export novo — ela **reusa** o núcleo de S0 e muda o
**valor inicial** do modelo. Por isso a maior parte dos portões é satisfeita **por herança**, e o plano
declara o que muda em cada um:

| # | Princípio | Como S1 satisfaz | Portão nesta fatia |
|---|-----------|------------------|--------------------|
| I | Prévia ao vivo ≤ 150 ms | S1 **não acrescenta caminho de input**: o starter é semeado como modelo, sem parse (FR-003). O teto de 60/90 de S0 segue governando o conteúdo do usuário | `tests/perf/` de S0 **inalterado**. S1 acrescenta um portão **distinto** (inicialização, SC-012) — ver Decisão J |
| II | Round-trip por tipo (Flowchart pleno) | Nenhuma mudança no gerador nem na ACL. O starter é um caso concreto **submetido** ao ciclo | `tests/roundtrip/` de S0 inalterado + **FR-015**: teste novo afirma que `STARTER_MODEL → texto → modelo` não perde nada |
| III | Cobertura de 5 tipos E2E | Escopo segue **só Flowchart** (S0, FR-006); S1 não anuncia tipo novo. FR-012 proíbe qualquer seletor de template | E2E de Flowchart existente + os novos de S1; nenhum tipo novo declarado. FR-012/SC-011 ganham portão próprio: `tests/contract/no-template-selector.test.ts` (starter singular + nenhuma superfície de escolha) |
| IV | Determinismo da geração | O gerador não é tocado. FR-003a **eleva ao contrato (G9)** a forma de emissão que o gerador **já implementa** — documentação de comportamento existente, zero mudança de código ou teste | `tests/unit/` determinismo de S0 inalterado; G9 acrescentada a `contracts/generator.contract.md` de S0 (docs) |
| V | Canvas é grafo editável; layout é da aplicação | O starter é desenhado pelo **React Flow** com o mesmo `FlowNode` de S0 (ADR-001, FR-004/FR-002a); posições vêm do **dagre** (Decisão A de S0), nunca do modelo nem do texto. `STARTER_MODEL` **não carrega coordenada** | `tests/contract/no-coordinates.test.ts` inalterado; o texto do starter é gerado pelo mesmo `generate` |
| VI | ACL da API interna do Mermaid | S1 **não importa** `mermaid` em lugar nenhum: a semeadura não percorre o parse (FR-003) | `tests/contract/acl-isolation.test.ts` inalterado e continua verde |
| VII | Texto Mermaid é a única fonte da verdade | O starter é **valor inicial do modelo efêmero**, não documento nem estado salvo (FR-010). Nenhum export de imagem | `tests/contract/no-image-export.test.ts` inalterado; `ephemeral.spec.ts` continua a exigir `storageLength === 0` |
| VIII | Viewport nunca serializa | O **fit-to-view** da semeadura (FR-013) é o `fitView` que o `CanvasPanel` de S0 já aplica — estado de viewport efêmero que não muta o modelo nem o texto | `tests/e2e/viewport-invariance.spec.ts` inalterado |

**Resultado do gate (inicial):** PASS — nenhuma violação. Registro de transparência (Princípio III coberto
só para Flowchart) segue o de S0 e está em Complexity Tracking.

**Reavaliação pós-Fase 1:** PASS — o desenho (constante de modelo + semeadura no bootstrap + limpeza por
`setState` externo + portão e2e isolado) não introduz acoplamento à API interna fora da ACL, coordenada no
texto, viewport serializado, caminho de export de imagem, persistência nem artefato Next.js.

## Decisões técnicas abertas (fixadas nesta fatia)

Os ADRs fecharam: engine = React Flow (**ADR-001**); round-trip assimétrico — gerador próprio determinístico
como caminho de fidelidade primário, import best-effort pelo DB interno atrás de ACL, layout recalculado
pela aplicação (**ADR-002**); Postura A — texto Mermaid é a única fonte persistida/copiável, modelo efêmero,
posição por auto-layout, sem documento nativo/persistência/export de imagem (**ADR-003**); host Vite + React
SPA com shadcn/ui + Tailwind, sem Next.js (**ADR-004**). O plano de S0 fixou as Decisões **A–E**. **Nada
disso é re-decidido aqui.** S1 fixa o que encontra em aberto:

### Decisão F — Fronteira do "não alterar S0": **imutabilidade comportamental + lista aditiva exaustiva**

**O problema (resolvido na spec).** FR-014a dizia, originalmente, que esta fatia "MUST NOT alterar nenhum
arquivo de **código-fonte** de S0". Lida ao pé da letra, essa cláusula **tornava a fatia impossível**, e o
próprio `spec.md` a contradizia em três pontos: **FR-006c** MUST fazer o `CanvasPanel` (arquivo de S0) sair
do modo de edição quando o nó sumir do modelo; **FR-006** MUST oferecer uma ação de limpar alcançável por
teclado — que precisa ser renderizada por algum componente de S0; e **FR-001a** MUST pôr o starter no
primeiro paint — o que exige um ponto de entrada no bootstrap de S0. Nenhuma dessas três coisas é alcançável
sem tocar um arquivo sob `src/`. **FR-014a foi emendada** para a formulação abaixo, de modo que esta decisão
não diverge mais da spec: ela é a spec. A Clarification que produziu a redação antiga carrega a nota de
supersedimento.

**A decisão (agora também em FR-014a).** FR-014/FR-014a são honradas como **imutabilidade comportamental**: nenhum comportamento
entregue em S0 pode ser **redefinido**, e nenhuma correção de S1 pode ser feita mudando **como um caminho
existente de S0 se comporta**. Mudanças **estritamente aditivas** em arquivos de S0 — que só acrescentam um
ponto de montagem, um export ou um efeito novo, sem alterar nenhum caminho existente — são o mecanismo
legítimo da fatia. Isso é exatamente a leitura que o próprio spec.md sustenta em toda parte: FR-006a recusa
"acrescentar **validação às mutações** de S0"; FR-006b recusa "**blindar `applyParsedText`** com um guard de
staleness"; FR-006c recusa "**mover estado** de S0 para o store" e "**reescrever** o componente de canvas".
Todas as três recusas miram **redefinição de comportamento**, não a existência de um diff.

**A lista é exaustiva.** Exatamente **seis** arquivos de S0 recebem mudança, cada uma aditiva e
comportamentalmente neutra sobre os caminhos existentes:

| Arquivo de S0 | Mudança aditiva | Requisito | Por que não redefine S0 |
|---|---|---|---|
| `src/main.tsx` | 1 import + 1 chamada `seedStarter(...)` **antes** de `createRoot().render()` | FR-001a, FR-008, FR-011a | Não altera o render; o estado inicial do store continua sendo o vazio de S0 (Decisão G) |
| `src/state/editorStore.ts` | 1 export novo: `cancelPendingParse()` | FR-006b | Só expõe o handle do timer já existente; **não** toca `setEditorText`, `applyParsedText` nem nenhuma ação (Decisão H) |
| `src/components/Toolbar.tsx` | monta `<ClearAction />` | FR-006, FR-016 | Acrescenta um controle; os controles de S0 não mudam |
| `src/App.tsx` | monta `<StarterAnnouncer />` | FR-017a | Acrescenta um emissor de anúncio; o `StatusRegion` de S0 não muda |
| `src/components/CanvasPanel.tsx` | 1 `useEffect` de aborto derivado do modelo | FR-006c | Novo efeito; o `onKeyDown`, o `onConnect` e o mapeamento modelo→React Flow ficam intactos (Decisão K) |
| `src/strings.ts` | chaves pt-BR novas | FR-006/016/017 | Módulo de strings é aditivo por natureza; nenhuma string existente muda |

**Fixtures de teste** seguem a regra que FR-014a de fato estabelece: as **duas** asserções e2e cuja premissa
é o estado vazio de abertura são emendadas (`tests/e2e/ephemeral.spec.ts`, `tests/e2e/us1-preview.spec.ts`);
os demais e2e de S0 permanecem intactos. Se um **terceiro** teste de S0 quebrar durante a implementação,
isso é sinal de que a premissa de FR-014a falhou — o caso vira decisão explícita, **nunca** emenda até o
verde (Assumptions, "Fronteira do não alterar S0").

**Portão:** o diff da fatia sob `src/` MUST estar contido nesses seis arquivos + os arquivos **novos** de S1.
Qualquer outro arquivo de S0 tocado é violação de FR-014 e bloqueia o merge.

### Decisão G — Semeadura: **no bootstrap da SPA**, não no estado inicial do store

**Escolha:** um módulo S1 `src/starter/seed.ts` expõe `seedStarter(input)`, que decide por FR-011a e, quando
semeia, aplica `useEditorStore.setState({ model, lastValidModel, editorText })` com o modelo constante e o
texto **produzido por `generate(STARTER_MODEL)`**. `src/main.tsx` a chama **sincronamente antes** de
`createRoot(...).render(<App />)`.

**Por que satisfaz o primeiro paint (FR-001a):** a chamada é síncrona e anterior ao primeiro render, logo o
componente monta já lendo o starter do store. Não existe tick em que o React tenha pintado o estado vazio —
não é "vazio por um instante", é **vazio nunca renderizado**. Isso só é possível porque a semeadura não tem
etapa assíncrona: o starter é constante, `generate` é puro e síncrono, o layout é do dagre (síncrono,
Decisão A de S0) e não há rede. É a premissa que a spec declara e que esta decisão consome. **Se ela cair**
(ex.: o layout virar assíncrono numa fatia futura), FR-001a precisa ser revisitada — a saída não é indicador
de carregamento, e um flash do vazio nunca é aceitável.

**Por que não no estado inicial do store:** `createEmptyModel()` no `create<EditorState>` é **comportamento
de S0** — é o "estado vazio já definido em S0" ao qual FR-006 manda a limpeza retornar. Trocá-lo pelo starter
redefiniria S0 (FR-014), apagaria a definição do alvo da limpeza e amarraria a decisão de FR-011a a um módulo
que não pode recebê-la como entrada. Mantendo o vazio como estado inicial, o alvo da limpeza permanece
literal e a semeadura fica **fora** do núcleo de S0, como um passo de bootstrap que S1 possui inteiramente.

**Por que `setState` externo e não uma ação no store:** o Zustand expõe `setState` no vanilla store; usá-lo
de um módulo S1 mantém `editorStore.ts` sem nenhuma ação nova de S1 — a fatia empurra estado para dentro do
store sem reescrever o store.

**Semeadura única por sessão (FR-008):** decorre do local — o bootstrap roda uma vez por carregamento de
página. Nada re-semeia depois: a limpeza escreve o vazio e ninguém chama `seedStarter` de novo. Não há
marcador de sessão a consultar, o que é o que permite a FR-010/ADR-003 continuarem verdadeiras (nenhum
`sessionStorage`; `ephemeral.spec.ts` segue exigindo `sessionStorageLength === 0`). Recarregar é uma sessão
nova e semeia de novo — coerente com os Edge Cases e com a efemeridade de S0.

**Decisão de semeadura pura (FR-011a):** `shouldSeedStarter(input: SeedInput): boolean` é uma função pura que
recebe `{ restorableDraft: RestorableDraft | null }` e devolve `restorableDraft === null`. Nesta fatia
`main.tsx` passa `null` **literal**: a entrada existe, o buffer do RN-06 que a preencheria **não é
construído aqui** (FR-011). SC-008 é aferida por teste unitário passando um rascunho simulado — inclusive um
que represente canvas vazio — sem que nada do buffer exista.

### Decisão H — Limpeza: **módulo S1 sobre `setState`**, com o parse pendente cancelado na origem

**Escolha:** `src/starter/clear.ts` expõe duas coisas:

1. `needsClearConfirmation(editorText: string, canonicalText: string): boolean` — **função pura**:
   `editorText !== '' && editorText !== canonicalText` (FR-007). Comparação de **string**, sobre o
   `editorText`, nunca sobre o `model`. É o predicado que a spec fixou e a única leitura sem perda
   silenciosa: pega o texto não interpretável digitado por cima do starter (onde o `model` ainda é o
   starter) **e** o texto válido porém não canônico (comentários `%%`, ordem de declaração — perdas
   admissíveis de S0, FR-008) que o modelo não registra. O viés é o do falso positivo: perguntar de mais
   custa um clique; perguntar de menos destrói trabalho de forma irreversível.
2. `clearSession(): void` — restaura o **estado vazio integral de abertura**:
   `cancelPendingParse()` **primeiro**, depois
   `setState({ model: createEmptyModel(), lastValidModel: createEmptyModel(), editorText: '', status: 'ok',
   connectMode: false, connectSourceId: null })`.

**Ordem importa.** `cancelPendingParse()` vem antes do `setState` porque o inverso deixa uma janela em que o
timer já armado dispara sobre o estado recém-limpo.

**Por que `cancelPendingParse()` é um export novo no store, e por que isso não é "alterar o store" no sentido
que FR-006b proíbe.** O timer do debounce é **module-private** em `editorStore.ts`; nenhum `setState` externo
o alcança. A alternativa que FR-006b **explicitamente rejeita** é outra: *"blindar `applyParsedText` com um
guard de staleness"* — isto é, mudar **como o caminho de parse de S0 se comporta**, corrigindo a classe toda
nas mutações em vez de na limpeza. Um export que apenas dá `clearTimeout` no handle existente não muda
comportamento nenhum de S0: `setEditorText` continua idêntico, `applyParsedText` continua idêntico, e a
correção fica **na limpeza**, exatamente onde FR-006b e o precedente de FR-006a a colocam. O módulo já
precedente isso: S0 exporta `_flushEditorTextForTests()` do mesmo arquivo, que já é controle externo do mesmo
timer.

**Alternativa rejeitada:** re-armar o debounce com `setEditorText('')` para descartar o closure antigo. Ela
cancela o parse velho, mas **agenda um parse de `''`** que 80 ms depois chama `importFlowchart('')` → falha →
`set({ status: 'invalid' })`, exibindo "texto não interpretável" sobre um painel vazio que o usuário acabou
de limpar. Trocar um bug por outro.

**O que FR-006a cobre e por que é a limpeza que corrige:** as mutações de S0 **não validam ids** —
`mutations.connect(model, sourceId, targetId)` aceita uma origem inexistente e o gerador a emite. Um
`connectSourceId` sobrevivente faria a conexão seguinte emitir `revisar --> <nó novo>` sem definição de
`revisar`, e o **Mermaid materializa isso como nó implícito**, ressuscitando no canvas um nó do starter que o
usuário apagou (FR-008/SC-006). A correção MUST NOT ser validação acrescentada às mutações (seria redefinir
S0 — FR-014): o invariante é **nenhum ponteiro para conteúdo sobrevive à destruição do conteúdo que ele
referencia**, e ele se cumpre zerando os ponteiros na limpeza.

**Superfície (FR-006/FR-016):** `<ClearAction />` (componente S1) é montado no **`Toolbar`** — que vive no
lado do canvas e é operável por Tab/Enter, de modo que a ação **não depende do painel de código estar
expandido** e cumpre o piso de teclado de S0 (Decisão E de S0). O anúncio de conclusão (FR-017 item **b**)
usa o `announce()` que S0 já expõe, alimentando o `StatusRegion` existente — a limpeza é, por construção,
uma mudança posterior à montagem, então não precisa do cuidado da Decisão I-bis (FR-017a).

### Decisão I — Confirmação: **shadcn/ui `AlertDialog` (Radix)**, não `window.confirm`

**Escolha:** o primitivo `alert-dialog` do shadcn/ui (sobre `@radix-ui/react-alert-dialog`) — a única
dependência nova da fatia, e uma que **estende a camada de UI já fixada pelo ADR-004** em vez de introduzir
outra. Adicionado como `src/components/ui/alert-dialog.tsx` (arquivo **novo**; nenhum primitivo existente
muda).

**Por que ele:** FR-016 exige diálogo da própria aplicação com foco que **entra** ao abrir, `Escape` que
cancela, foco que **retorna ao controle de origem** ao fechar, nome e papel acessíveis e operação integral
por teclado. Radix entrega focus trap, restauração de foco, `role="alertdialog"` e `Escape` como
comportamento nativo do primitivo — o piso de acessibilidade de S0 é cumprido pela biblioteca, não por
código de foco escrito à mão, que é onde esse requisito costuma apodrecer.

**Por que não `window.confirm`:** FR-016 o proíbe explicitamente ("não um diálogo nativo do navegador"); ele
também bloqueia a thread e é inauditável por Playwright/RTL da forma que os critérios exigem.

**Semântica:** o diálogo só abre quando `needsClearConfirmation` é verdadeiro. Com o starter **intocado** ou
o painel vazio, a limpeza executa **imediatamente**, sem diálogo — é o fluxo que a fatia existe para servir
(começar limpo), e pôr atrito nele seria trocar o passo zero por outro passo zero.

### Decisão I-bis — Anúncio da semeadura: **efeito pós-montagem**

**Escolha:** `<StarterAnnouncer />` (componente S1, montado no `App`) chama `announce(strings.starter.seeded)`
num `useEffect` de montagem, **apenas** se `starterWasSeeded()` for verdadeiro (SD7) — o canal pelo qual o
resultado do bootstrap alcança um componente montado depois dele. `seed.ts` guarda um flag module-private que
`seedStarter` escreve uma única vez; `main.tsx` roda **antes** do render (SD4) e não tem como passar o retorno
adiante sem mudar a assinatura do `App` (FR-014). O flag não é marcador de sessão e não participa da decisão
de semear (SD1/SD5): nesta fatia ele é sempre `true` na execução real, e existe para que o anúncio siga
correto quando o RN-06 passar a suprimir a semeadura.

**Por que:** o `StatusRegion` de S0 (`role="status" aria-live="polite"`) só é falado quando o leitor de tela
observa uma **mudança** depois de a região ser registrada. Escrever o anúncio no estado inicial do store
deixaria SC-013 verde sobre um recurso **mudo** (região que nasce preenchida = conteúdo estático). O
`useEffect` roda depois do commit, então a região **transiciona** de vazia para a mensagem — que é o evento
que o leitor de tela fala.

**Sem conflito com FR-001a:** aquele requisito governa o estado **visual** (starter desenhado e escrito, sem
o vazio de S0 aparecer). Um anúncio emitido um tick depois do primeiro paint não exibe estado intermediário
a ninguém. As duas exigências governam superfícies diferentes.

**Consequência para o teste:** SC-013 MUST aferir a **transição** — região sem a mensagem no primeiro paint,
mensagem presente em seguida. Um teste que afirme só o texto final passaria igualmente sobre a implementação
muda, que é precisamente a falha que esta decisão existe para excluir.

### Decisão J — Portão de SC-012: **e2e Playwright contra `vite preview`, em configuração separada**

**Escolha:** um arquivo de teste em `tests/e2e/starter-boot-latency.perf.ts` executado por uma configuração
**nova e adicional**, `playwright.perf.config.ts`:

- **alvo:** `webServer.command: 'npm run build && npm run preview -- --port 4173'`, `baseURL
  http://localhost:4173` — o **build de produção**, não o dev server (FR-018);
- **projeto único:** `chromium` (SC-012 afere regressão de inicialização, não paridade entre browsers);
- **amostragem:** ≥ 1 carregamento de **aquecimento**, depois **30** amostras de `page.goto('/')`, p95 pela
  **mesma fórmula de percentil** de S0 (`tests/perf/preview-latency.test.ts:20`), copiada para
  `tests/helpers/percentile.ts` — o helper de S0 é module-private e vive dentro de um módulo de teste Vitest
  com `describe` no topo, que um spec Playwright não importa sem executar a suíte; copiá-lo mantém
  `tests/perf/` intocado e a lista de emendas de FR-014a exaustiva. A cópia é **verbatim** e a fórmula toma um
  array **já ordenado**. 30 é o menor N em que ela devolve um p95 real em vez do máximo literal:
  `floor(30 × 0.95) = 28` seleciona a 29ª de 30 amostras;
- **relógio:** começa antes do `goto` e para quando **os nós do starter estão visíveis no canvas E o texto
  está presente no painel** — começa e termina exatamente onde SC-012 afirma, incluindo bundle, boot e
  render.

**Como a configuração de S0 fica inalterada (FR-018).** `playwright.config.ts` tem `testDir: './tests/e2e'`
sem `testMatch`, e o default do Playwright é `**/*.@(spec|test).?(c|m)[jt]s?(x)`. Um arquivo terminado em
**`.perf.ts`** — sem `.spec`/`.test` — **não casa com esse default** e portanto não é coletado pela
configuração existente, mesmo vivendo dentro de `tests/e2e/`. A configuração nova usa `testMatch:
'**/*.perf.ts'`. Resultado: o portão fica em `tests/e2e/` como SC-012 manda, a configuração de S0 não muda
uma linha como FR-018 manda, e nenhuma das duas coleta o teste da outra. Script novo: `test:e2e:perf`.

**Por que não `tests/perf/`:** a fronteira **declarada** daquele harness é o sub-caminho puro — ele exclui o
render *de propósito* e mede `importFlowchart + layout`, um caminho que a semeadura **nem percorre** (o
starter entra como modelo, sem parse). Medido ali, SC-012 cronometraria `generate` + `layout` de 5 nós em
microssegundos: verde garantido, afirmação não sustentada.

**Por que não o dev server:** ele entrega ESM não empacotado e transforma sob demanda; o teto de 1 s
descreveria a ferramenta de desenvolvimento e não o artefato que o usuário carrega — e viraria fonte
previsível de flakiness.

**Se o p95 encostar no teto num runner ocioso**, o alvo a revisitar é **o teto de 1 s**, não o instrumento:
medir o artefato errado para obter verde derrota o propósito do portão.

### Decisão K — Aborto do rename: **derivado do modelo**, no `CanvasPanel`

**Escolha:** um `useEffect` novo no `CanvasPanel`: quando `editingNodeId` não existir mais em `model.nodes`,
sair do modo de edição (`setEditingNodeId(null)`).

**Por que derivado e não comandado:** o rename em curso é `useState` **local do `CanvasPanel`**
(`editingNodeId`, `editDraft`), fora do alcance de qualquer `setState` do store — a limpeza não tem como
comandá-lo. Derivá-lo do modelo torna o invariante de FR-006a verdadeiro **onde o ponteiro de fato vive**,
sem elevar estado de S0 ao store e sem reescrever o componente.

**O resíduo que isso elimina** não é ressurreição de conteúdo: o `onKeyDown` de S0 já só chama `renameNode`
se o nó ainda existir no modelo, então um rename pós-limpeza não escreve nada. É um **ponteiro de edição
obsoleto**: enquanto `editingNodeId` persistir, o `onKeyDownCapture` trata toda tecla como digitação de um
rótulo morto e **engole a interação com os nós criados depois da limpeza**.

**A derivação vale para toda destruição do nó em edição**, não só para a limpeza — o que fecha de brinde o
mesmo caminho latente no `removeNode` já entregue em S0.

### Decisão L — O starter é uma **constante de modelo** com ids derivados do slug de S0

**Escolha:** `src/starter/model.ts` exporta `STARTER_MODEL: GraphModel` (constante congelada) e
`STARTER_TEXT = generate(STARTER_MODEL)` (derivado, não escrito à mão).

**Forma:** 5 nós — `inicio[Início]`, `revisar[Revisar]`, `aprovado{Aprovado?}` (`shape: 'diamond'`),
`publicar[Publicar]`, `fim[Fim]` — e 5 arestas (`e0..e4`, convenção de `nextEdgeId` de S0), duas com rótulo
(`Sim`, `Não`), incluindo o retorno `aprovado --> revisar`. `direction: 'TD'`.

**Ids por slug (FR-002):** os ids são exatamente `deriveSlug(label)` — `Início→inicio`, `Aprovado?→aprovado`
(o `?` cai na normalização), `Fim→fim`. Um teste unitário afirma essa igualdade contra `src/core/slug/`, de
modo que a regra de S0 seja **verificada**, não copiada à mão.

**Por que modelo e não string (FR-003):** semeando o modelo e gerando o texto com o `generate` de S0, o texto
do primeiro contato é a **forma canônica por construção** — idêntico caractere a caractere ao que o sistema
geraria a partir do modelo. Uma string pré-escrita tornaria SC-003 verdadeira por **coincidência**, e o
predicado de FR-007 (`editorText === canonicalText`) passaria a depender de alguém manter duas
representações em sincronia à mão.

**O ciclo do starter não é caso novo:** `aprovado → revisar` fecha um ciclo no grafo; o dagre (Decisão A de
S0) quebra ciclos internamente.

**Verificado por execução no passo de plano** (não presumido): `generate(STARTER_MODEL)` produz exatamente as
11 linhas documentadas; `node.id === deriveSlug(node.label)` nos 5 nós; `importFlowchart(STARTER_TEXT).ok`.
A execução revelou **duas normalizações do reimport** que o teste de FR-015 MUST acomodar — o Mermaid devolve
`TD` como `TB` (mesma orientação) e a ACL redefine os edge ids (`e0` → `e0-inicio-revisar`). Nenhuma é perda
de conteúdo; mas uma comparação por igualdade profunda ficaria **vermelha sobre código correto** e convidaria
a "consertar" o starter até o verde, quebrando FR-002 ou a canonicidade. Detalhe e tabela em
`data-model.md` e no contrato ST4.

**A divergência de formato é deliberada (FR-002a):** o modelo carrega `shape: 'diamond'` e o gerador o emite
como `{}` via `SHAPE_DELIMITERS` — mas o `FlowNode` de S0 desenha **todo** nó como retângulo, e `shape` nem
chega a ser passado de `CanvasPanel` a `FlowNode`. Nesta release o **formato de nó é um construto do painel
de código**: a paridade canvas ↔ código que S1 afirma cobre **nós, arestas e rótulos**, não formato.
Renderizar o losango seria acrescentar ao canvas uma capacidade que **nenhum requisito de S0 pediu**, numa
fatia cujo valor é remover o passo zero. Pertence a uma fatia posterior.

**Portão (T011):** a divergência é aferida como **igualdade de renderização** — `Aprovado?` e `Início`
carregam a **mesma** classe no canvas e nenhum marcador de losango (`clip-path`, `rotate`, `<polygon>`)
existe —, e não como "é um retângulo". Igualdade é o que FR-002a/FR-004 de fato prometem (o starter não
recebe tratamento especial) e é o que o `FlowNode` entregue faz: uma única `div rounded-md border …` por nó,
sem ramo de formato, com `shape` nunca passado de `CanvasPanel`. Sem esse portão, uma mudança futura que
renderizasse o losango passaria em todos os outros testes enquanto contradiz esta decisão em silêncio.

**FR-013 (≤ 6 nós, ≤ 14 linhas) é portão, não descrição:** o starter ocupa **5 nós e 11 linhas** sob a
emissão linha-própria que FR-003a eleva ao contrato (G9). Um teste unitário afirma os dois tetos contra
`STARTER_TEXT`, de modo que o teto **limite crescimento** em vez de fixar por acidente o tamanho de hoje.

## Project Structure

### Documentation (this feature)

```text
specs/002-flowchart-starter-template/
├── plan.md              # Este arquivo (/speckit-plan)
├── research.md          # Fase 0 — decisões F–L consolidadas
├── data-model.md        # Fase 1 — STARTER_MODEL, SeedInput, estado vazio alvo da limpeza
├── quickstart.md        # Fase 1 — como rodar, testar e aferir o portão de SC-012
├── contracts/           # Fase 1 — contratos internos de S1
│   ├── starter.contract.md      # ST1–ST6: modelo, texto canônico, tetos, validade
│   ├── seed.contract.md         # SD1–SD4: decisão pura + semeadura de bootstrap
│   └── clear.contract.md        # CL1–CL7: predicado, estado alvo, ponteiros, trabalho em voo
├── checklists/          # (já existente)
└── tasks.md             # Fase 2 (/speckit-tasks — NÃO criado aqui)
```

Documento de S0 emendado (docs, sem código): `specs/001-s0-walking-skeleton/contracts/generator.contract.md`
ganha **G9 — Forma de emissão**, ratificando o valor que o gerador já implementa (FR-003a).

### Source Code (repository root)

Single-project SPA (Vite, ADR-004) — inalterado. **`+`** = arquivo novo de S1; **`~`** = arquivo de S0 com
mudança **aditiva** (Decisão F); o resto é S0 intocado.

```text
  package.json                       ~ + @radix-ui/react-alert-dialog · script test:e2e:perf
  playwright.config.ts                 INALTERADO (FR-018)
+ playwright.perf.config.ts           # chromium · vite preview · testMatch **/*.perf.ts (Decisão J)

src/
~ ├── main.tsx                        # + seedStarter({ restorableDraft: null }) antes do render (Decisão G)
~ ├── App.tsx                         # + <StarterAnnouncer />
~ ├── strings.ts                      # + strings pt-BR de S1 (limpar, diálogo, anúncios)
  ├── components/
+ │   ├── ClearAction.tsx             # botão + AlertDialog + announce (FR-006/007/016/017b)
+ │   ├── StarterAnnouncer.tsx        # useEffect pós-mount → announce (FR-017a, Decisão I-bis)
~ │   ├── Toolbar.tsx                 # + monta <ClearAction />
~ │   ├── CanvasPanel.tsx             # + useEffect de aborto derivado do rename (FR-006c, Decisão K)
  │   ├── CodePanel.tsx · FlowNode.tsx · StatusRegion.tsx     INALTERADOS
+ │   └── ui/alert-dialog.tsx         # primitivo shadcn/ui novo (Decisão I)
+ ├── starter/                        # TODO o núcleo de S1 — puro, sem React, testável isolado
+ │   ├── model.ts                    # STARTER_MODEL + STARTER_TEXT = generate(STARTER_MODEL) (Decisão L)
+ │   ├── seed.ts                     # shouldSeedStarter (pura, FR-011a) + seedStarter + starterWasSeeded (SD7)
+ │   └── clear.ts                    # needsClearConfirmation (pura) + clearSession (Decisão H)
~ ├── state/editorStore.ts            # + export cancelPendingParse() (FR-006b, Decisão H)
  └── core/                           # model · mermaid-acl · generator · layout · slug — TODOS INALTERADOS

tests/
+ ├── helpers/percentile.ts           # cópia verbatim da fórmula de p95 de S0 (Decisão J)
+ ├── contract/no-template-selector.test.ts  # FR-012/SC-011 — nenhuma superfície de escolha (idioma dos gates de S0)
+ ├── unit/starter-model.test.ts      # FR-002/003/013/015 · ids=slug · tetos · round-trip sem perda
+ ├── unit/starter-seed.test.ts       # SC-008 — precedência do rascunho (função pura)
+ ├── unit/starter-clear.test.ts      # FR-007 predicado · FR-006/006a estado alvo · FR-006b parse em voo
+ ├── unit/clear-dialog.test.tsx      # FR-016 — foco entra, Escape cancela, foco retorna (RTL)
+ ├── unit/starter-announce.test.tsx  # SC-013 — TRANSIÇÃO da live region (RTL, Decisão I-bis)
+ ├── e2e/starter.spec.ts             # US1 · SC-001/002/003/004/005/009/011 · FR-002a (divergência de formato)
+ ├── e2e/clear.spec.ts               # US2 · SC-006 (inclui cenários 8, 9, 10)
+ ├── e2e/paste-over-starter.spec.ts  # US3 · SC-007
+ ├── e2e/starter-boot-latency.perf.ts# SC-012 — p95 ≤ 1s, build de produção (Decisão J)
~ ├── e2e/ephemeral.spec.ts           # EMENDA autorizada por FR-014a (1 asserção)
~ ├── e2e/us1-preview.spec.ts         # EMENDA autorizada por FR-014a (1 caso, + rename)
  └── (os 5 gates de contract/ de S0 · roundtrip/ · perf/ · demais e2e)   INALTERADOS
```

**Structure Decision**: a arquitetura de S0 é preservada integralmente — núcleo puro em `src/core/`,
superfícies em `src/components/`, store Zustand como fonte de verdade em memória. S1 acrescenta **um módulo
de feature** (`src/starter/`) que é **puro e sem React**: ele define o conteúdo (`model.ts`), a regra de
precedência (`seed.ts`) e a regra de destruição (`clear.ts`) como funções testáveis por unidade, e deixa
para os componentes apenas a montagem. É o que permite aferir SC-008 sem construir nada do buffer do RN-06,
e FR-007 sem inspecionar a UI. `src/core/` **não é tocado por esta fatia** — o que é, sozinho, a garantia
mais forte de que os portões II, IV, V e VI continuam verdes por construção.

## Complexity Tracking

| Item | Por que | Alternativa mais simples rejeitada porque |
|------|---------|-------------------------------------------|
| **FR-014a como imutabilidade comportamental**, e não como "zero diff sob `src/`" (Decisão F) | A leitura literal tornava a fatia **impossível** e contradizia FR-001a, FR-006 e FR-006c do mesmo spec — FR-006c *manda* mudar o `CanvasPanel`. As três recusas do spec (FR-006a/b/c) miram redefinição de comportamento, não a existência de um diff. **FR-014a foi emendada**: isto deixou de ser divergência plano × spec e passou a ser a regra da spec | Cumprir a letra exigiria não entregar a fatia. Mitigação: a lista de arquivos de S0 tocados é **exaustiva (6)**, cada mudança é aditiva e comportamentalmente neutra, e o diff fora dessa lista é portão de merge (T029) |
| `cancelPendingParse()` exportado de `editorStore.ts` (Decisão H) | O timer do debounce é module-private; nenhum `setState` externo o alcança, e FR-006b **exige** que a limpeza cancele o parse em voo | Re-armar o debounce com `setEditorText('')` agenda um parse de `''` que acende "texto não interpretável" sobre o painel recém-limpo. O guard de staleness em `applyParsedText` é **explicitamente recusado** por FR-006b (redefine o caminho de parse de S0) |
| Uma dependência nova (`@radix-ui/react-alert-dialog`) | FR-016 exige focus trap + restauração de foco + `Escape` + `role`/nome acessíveis; Radix é a base do shadcn/ui **já fixado pelo ADR-004** | Diálogo com gestão de foco escrita à mão é exatamente onde esse requisito apodrece; `window.confirm` é proibido por FR-016 |
| Princípio III coberto só para Flowchart | Herdado de S0 (FR-006 de S0): a release tem 1 tipo. FR-012 proíbe até seletor de template | Idem S0: cobrir os 5 tipos contradiz o fatiamento vertical da PRD. S1 **não anuncia** tipo novo, logo não é fidelidade presumida |
