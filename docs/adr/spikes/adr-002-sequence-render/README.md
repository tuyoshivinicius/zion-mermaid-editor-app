# Spike — Renderizar Sequence no modelo nós+arestas do React Flow

Código descartável que fecha o **único risco técnico deixado aberto** pelos ADR-001 e
ADR-002: a pesquisa apontou que "React Flow é para editores, não para sequence diagrams"
(mantenedor xyflow, discussions #3121) — a semântica de Sequence (lifelines, tempo
vertical, e fragmentos `loop/alt/opt/par` **aninhados**) não é um grafo genérico
nós+arestas. O spike do ADR-002 (`adr-002-roundtrip/`) provou o round-trip **textual**,
mas explicitamente **não** provou a **representação no canvas React Flow**. É essa lacuna
que este spike ataca.

## O que este spike prova (e o que não prova)

- **Prova (o risco real):** a **modelagem + layout** — mapear o modelo de Sequence para
  primitivas do React Flow (custom nodes, **group nodes com `parentNode`**, edges) com
  coordenadas coerentes, incluindo **fragmentos aninhados** (`loop ⊃ alt/else ⊃ opt`),
  ativações e ordem temporal. Validado por **9 invariantes geométricas/estruturais**.
- **NÃO prova:** o render em DOM do **próprio componente React Flow** — o ambiente do spike
  não tem browser (jsdom não faz o layout/medição do React Flow de forma fiel). O
  `sequence-render.svg` é uma **visualização da mesma geometria** (sanity visual), **não** o
  renderer do React Flow. Ver "Limites honestos" abaixo.

## Como rodar

```bash
mkdir spike && cd spike
npm init -y
npm install mermaid@11.16.0 jsdom@22.1.0   # jsdom 22: jsdom 27 quebra com ERR_REQUIRE_ESM no Node 20
cp .../sequence-render.mjs .
node sequence-render.mjs                    # imprime o relatório e escreve sequence-render.svg
```

## O que o spike faz

1. **Entrada (parse):** o mesmo mecanismo do ADR-002 —
   `mermaid.mermaidAPI.getDiagramFromText(text)` → `diagram.db` (API interna/depreciada).
   Sequence: `getActors()` (Map, ordem de declaração) + `getMessages()` (fragmentos e
   ativações vêm como mensagens com `type` numérico).
   Códigos confirmados no mermaid 11.16.0: `0/1`=sinal sólido/pontilhado, `10/11`=loop
   start/end, `12/13/14`=alt start/else/end, `15/16`=opt, `19/20/21`=par start/and/end,
   `17/18`=activate/deactivate.
2. **Mapeamento → React Flow:** produz `{ nodes, edges }`:
   - `actorHeader` (topo de cada lifeline) e `lifeline` (coluna vertical) por ator;
   - `edge` por mensagem, ligando os lifelines de origem/destino, com `y` crescente;
   - **`group` por fragmento**, com `parentNode` quando aninhado e **posição relativa ao
     pai** (contrato do React Flow), caixa calculada a partir dos atores envolvidos e do
     intervalo de `y` das mensagens internas; divisores (`else`/`and`) como linhas internas;
   - `activation` (barra) por par activate/deactivate.
3. **Invariantes (a prova):** ver resultado.
4. **SVG:** desenha a mesma geometria como sanity visual.

## Resultado (Node 20.17, mermaid 11.16.0, jsdom 22.1.0 — 2026-07-13)

Amostra exercida: `loop ⊃ (alt/else, opt)` aninhados, ativação `+/-`, aliases de
participante, mensagens sólidas e pontilhadas.

```
atores: 3 | mensagens: 6 | grupos(fragmentos): 3 (aninhados: 2) | ativações: 1
nós React Flow por tipo: actorHeader=3 lifeline=3 group=3 activation=1

  [PASS] fragmentos balanceados (pilha vazia)
  [PASS] ativações balanceadas
  [PASS] toda edge de mensagem liga dois lifelines existentes
  [PASS] ordem temporal preservada (y estritamente crescente)
  [PASS] todo grupo contém geometricamente suas mensagens (sem clipping)
  [PASS] fragmentos aninhados: box filho ⊂ box pai (parentNode == geometria)
  [PASS] divisores (else/and) ficam dentro da caixa do fragmento
  [PASS] contrato React Flow: posRel(filho) + posAbs(pai) reconstrói o box absoluto
  [PASS] sem problemas acumulados no mapeamento

>>> TODAS AS INVARIANTES PASSARAM
```

Nesting resultante (posição **relativa ao pai**, como o React Flow consome):

```
frag-3 kind=alt  parent=frag-1(loop)  posRel=(0,94)    size=280x184
frag-6 kind=opt  parent=frag-1(loop)  posRel=(0,286)   size=280x100
frag-1 kind=loop parent=(root)        posRel=(260,140) size=280x400
```

**Leitura:** a semântica de Sequence **mapeia** para o modelo do React Flow. Fragmentos
aninhados viram **group-nodes aninhados via `parentNode`** com posição relativa correta
(reconstrói o box absoluto), mensagens viram edges temporalmente ordenadas entre lifelines,
e nada vaza da sua caixa. O encaixe que a pesquisa dizia "difícil" é **viável**.

## Limites honestos deste spike (o que NÃO foi provado)

1. **Render em browser não exercido.** Prova a **geometria/modelo**, não os pixels do
   componente React Flow (sem browser no ambiente). Risco residual **baixo**: o modelo usa
   só primitivas padrão do React Flow (custom nodes, group/parent nodes, edges), cujo render
   é caminho batido — o risco novo era o *mapeamento*, e esse está retirado. Fica como
   verificação da fatia de canvas: montar em browser e conferir o pixel.
2. **Auto-numbering, `Note`, `create/destroy` de ator e mensagens a si-mesmo** não foram
   exercidos (mesmo mecanismo de mensagens/tipos se aplica; auto-layout de self-message é
   detalhe de `plan.md`).
3. **Cobertura amostral:** um diagrama rico, não a matriz completa de fragmentos. `par`,
   `critical`, `break`, `rect` estão mapeados no código mas exercidos só por construção.
4. **Depende da mesma API interna depreciada** (`getDiagramFromText`/`diagram.db`) do
   ADR-002 — coberto pela camada anticorrupção já decidida ali.
