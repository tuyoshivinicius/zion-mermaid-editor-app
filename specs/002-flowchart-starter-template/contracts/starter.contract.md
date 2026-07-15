# Contrato — Template Starter (`src/starter/model.ts`)

Constante **pura**, sem React e sem I/O. O starter é um **modelo de grafo**, nunca uma string (FR-003).

## Interface

```ts
export const STARTER_MODEL: GraphModel     // congelado; tipo de S0, INALTERADO
export const STARTER_TEXT: string          // = generate(STARTER_MODEL) — derivado, nunca escrito à mão
```

## Garantias (verificáveis)

- **ST1 — Forma exata (FR-002):** 5 nós (`Início`, `Revisar`, `Aprovado?` com `shape: 'diamond'`, `Publicar`,
  `Fim`) e 5 arestas (`Início→Revisar`; `Revisar→Aprovado?`; `Aprovado?→Publicar` rotulada `Sim`;
  `Aprovado?→Revisar` rotulada `Não`; `Publicar→Fim`), `direction: 'TD'`, pt-BR.
  Portão: `tests/unit/starter-model.test.ts`.
- **ST2 — Ids pela regra de S0 (FR-002):** para todo nó, `node.id === deriveSlug(node.label)`, ids únicos;
  edge ids seguem a convenção `e{índice}` de `nextEdgeId`. Portão: asserção contra `src/core/slug/` — a regra
  de S0 é **verificada**, não copiada à mão.
- **ST3 — Canonicidade por construção (FR-003):** `STARTER_TEXT` é produzido **exclusivamente** por
  `generate(STARTER_MODEL)`. Nenhuma string Mermaid do starter existe no código-fonte. Consequência: o texto
  do primeiro contato é a forma canônica **por construção** (SC-003) e o predicado de FR-007 compara contra a
  única representação que existe.
- **ST4 — Validade em tempo de teste, sem runtime e sem fallback (FR-015):** `importFlowchart(STARTER_TEXT)`
  retorna `ok: true`, e o ciclo `STARTER_MODEL → STARTER_TEXT → modelo` preserva o **conteúdo estrutural** —
  nós (id, rótulo, shape), arestas (origem, destino, conector, rótulo) e orientação —, em comparação
  **order-insensitive**. Perdas admissíveis de S0 (ordem de declaração e `%%`) não se aplicam: o starter não
  tem comentários. Um starter inválido **quebra a build**; nenhuma verificação em runtime é embarcada e
  **nenhum caminho de fallback existe**. Portão: `tests/unit/starter-model.test.ts`.

  > ⚠ **Duas normalizações do reimport — verificadas contra o código entregue.** A comparação MUST as
  > acomodar; um `expect(reimportado).toEqual(STARTER_MODEL)` fica **vermelho sobre código correto**, e a
  > "correção" tentadora (mexer no starter até o verde) quebraria FR-002 ou ST3:
  >
  > 1. **`direction: 'TD'` volta como `'TB'`** — o Mermaid normaliza `TD`→`TB` e a ACL repassa. São a mesma
  >    orientação (top-down) e ambas são `Direction` válidas em S0. Compare **`TD ≡ TB`**; MUST NOT trocar o
  >    starter para `TB` (o texto canônico de FR-002/SC-003 é `flowchart TD`).
  > 2. **Edge ids não sobrevivem** — o modelo usa `e0..e4` (convenção `nextEdgeId`, ST2) e a ACL devolve
  >    `e0-inicio-revisar`. O id de aresta é **handle interno**, não conteúdo estrutural: compare arestas por
  >    **(origem, destino, conector, rótulo)** e **exclua o id** da comparação.
  >
  > Nenhuma das duas é perda de conteúdo, e por isso nenhuma delas contradiz o Princípio II ou G8: o que o
  > round-trip garante é conteúdo estrutural, e ele está integralmente preservado.
- **ST5 — Tetos de tamanho (FR-013/SC-009):** `STARTER_MODEL.nodes.length ≤ 6` **e**
  `STARTER_TEXT.trimEnd().split('\n').length ≤ 14`. Valores atuais: **5 e 11**. O teto **limita crescimento**;
  não fixa o tamanho de hoje. Portão: `tests/unit/starter-model.test.ts`.
- **ST6 — Sem marca de origem (FR-004):** o modelo não carrega nenhum campo que distinga o starter de conteúdo
  colado (`isStarter`, `readonly`, `locked`, …), e nenhum consumidor ramifica sobre a identidade do starter
  fora de `needsClearConfirmation` (que compara **texto**, não identidade). Portão: revisão + ausência de tal
  campo no tipo `GraphModel` de S0, que S1 não estende.

## Não-garantias (declaradas)

- **Formato de nó no canvas (FR-002a):** `shape: 'diamond'` é emitido no código (`aprovado{Aprovado?}`) e
  **não** é desenhado no canvas — o `FlowNode` de S0 desenha todo nó como retângulo. A paridade canvas ↔
  código afirmada por esta fatia cobre **nós, arestas e rótulos**, não formato. Nenhum critério de S1 MUST ser
  lido como exigindo renderização de formato; isso pertence a fatia posterior.
- **Determinismo:** não re-aferido aqui — é garantia G1 do gerador de S0, herdada.
