# Spike ADR-002 — Round-trip Mermaid ↔ modelo de grafo

Código descartável que sustenta o **ADR-002**. Prova o ciclo
`texto Mermaid → modelo estruturado → (editar) → gerar Mermaid → re-parsear` e mede a
fidelidade estrutural para Flowchart e Sequence.

## Como rodar

```bash
mkdir spike && cd spike
npm init -y
npm install mermaid@11.16.0 jsdom@22.1.0   # jsdom 22: jsdom 27 quebra com ERR_REQUIRE_ESM no Node 20
cp .../roundtrip.mjs .
node roundtrip.mjs
```

## O que o spike faz

- **Entrada (parse):** `mermaid.mermaidAPI.getDiagramFromText(text)` → `diagram.db`
  (API interna/depreciada). Flowchart: `getVertices/getEdges/getSubGraphs/getDirection`.
  Sequence: `getActors` (é um `Map`) + `getMessages` (fragmentos loop/alt/opt aparecem como
  mensagens com `type` numérico: 10=loopStart, 11=loopEnd, 12=altStart, 13=altElse,
  14=altEnd, 15=optStart, 16=optEnd…).
- **Saída (gerador determinístico):** modelo → texto Mermaid, escrito à mão.
- **Fidelidade:** re-parseia o texto gerado e compara com o modelo original, separando
  **conteúdo** (order-insensitive — o que o diagrama É) de **ordem de declaração**.
- **Cenário de edição:** muta o modelo (adiciona nó + aresta, renomeia) e confirma que a
  edição sobrevive ao `gerar → re-parsear` (prova a direção canvas → código).

## Resultado (Node 20.17, mermaid 11.16.0, jsdom 22.1.0 — 2026-07-13)

```
[FLOW] shapes+subgraph+labels+dotted: content 100% | declaration-order preserved: NO
[FLOW] LR + hexagon + open edge:      content 100% | declaration-order preserved: YES
[EDIT] canvas edit -> Mermaid survived re-parse: YES
[SEQ]  loop+alt fragments + aliases:  fidelity 100%
[SEQ]  opt + nested:                  fidelity 100%
```

- **Flowchart:** conteúdo (nós, shapes, rótulos, arestas, rótulos de aresta, tipo de traço,
  direção, subgraphs) fez round-trip **100%**. A **ordem de declaração** não é preservada
  quando o nó pertence a um subgraph (cosmético — não muda o diagrama renderizado).
- **Sequence:** **100%**, incluindo fragmentos loop/alt/opt e aliases de participante. O
  round-trip *textual* de sequence é limpo.

## Limites honestos deste spike (o que NÃO foi provado)

1. **Só serialização, não renderização.** O spike prova a fidelidade texto ↔ modelo. NÃO
   prova a representação do modelo no **canvas React Flow** — em especial a de Sequence
   (lifelines/tempo vertical), que a pesquisa apontou como o encaixe mais difícil. Esse
   risco é de UI/render, não de serialização, e segue aberto.
2. **Depende de API interna depreciada** (`getDiagramFromText`/`diagram.db`) — funciona em
   11.16.0, pode quebrar em upgrades. Reforça a camada anticorrupção do ADR-002.
3. **Não preservado:** comentários (`%%`), ordem de declaração, e o que não foi exercido
   (classDef/style ricos, click events, notes). Perda de ordem é cosmética; perda de
   comentário é real mas aceitável (não é semântica).
4. **Cobertura amostral**, não exaustiva: 5 shapes de flowchart + loop/alt/opt de sequence.
   Class, State e ER não foram exercidos aqui (mesmo mecanismo de DB interno se aplica).
