# Fase 1 — Data Model: GraphModel canônico (efêmero)

O `GraphModel` é a **fonte de verdade única** em memória durante a sessão (FR-004). É **efêmero**: nunca
persistido, nunca serializado com posições, nunca export além do texto Mermaid (ADR-003 / FR-011). Tanto a
textarea quanto o canvas são **derivados** dele. As posições de nó **não fazem parte** do modelo canônico —
são computadas pelo layout e vivem só na camada de view (React Flow).

## Entidades

### GraphModel

| Campo | Tipo | Regras |
|-------|------|--------|
| `direction` | `'TD' \| 'LR' \| ...` | Lida do import (FR-010); `TD` por padrão em diagramas iniciados no canvas. É conteúdo estrutural (sobrevive ao ciclo). |
| `nodes` | `Node[]` | Ordem = índice de inserção canônico (base da ordenação estável do gerador — FR-009). |
| `edges` | `Edge[]` | Idem ordenação estável. |
| `subgraphs` | `Subgraph[]` | Preservados intactos do import (FR-007). Canvas **não** adiciona nós a subgraphs em S0 (novos nós vão à raiz). |
| `preservedStyles` | `StyleBlock[]` | Blocos opacos de passagem (`style`/`classDef`/`class`/`:::`/`linkStyle`). Conteúdo opaco, mas referências de ID são rastreadas. |

> **Não** contém: coordenadas de nó, zoom, pan, estado de colapso do painel (todos efêmeros de view — VIII/FR-013),
> nem comentários `%%` ou ordem de declaração original (perdas admissíveis — FR-008).

### Node

| Campo | Tipo | Regras |
|-------|------|--------|
| `id` | `string` | Slug derivado do rótulo; único no diagrama (sufixo determinístico `slug`,`slug-2`,… — FR-003). Nunca funde nós. |
| `label` | `string` | Rótulo exibido; qualquer texto aceito. O gerador aplica aspas/escape para emitir Mermaid válido (FR-003). |
| `shape` | `'rect' \| <shape importado>` | Nós criados no canvas: `rect` (retângulo, único formato de S0). Outros formatos só quando importados (preservados no ciclo — FR-003/FR-007). |
| `subgraphId?` | `string \| null` | Pertença a subgraph importado; `null`/ausente para nós criados no canvas (nível raiz). |

### Edge

| Campo | Tipo | Regras |
|-------|------|--------|
| `id` | `string` | Identidade interna estável (para foco/remoção); não emitida no texto. |
| `source` / `target` | `string` (Node.id) | Referenciam nós existentes. |
| `connector` | `'-->' \| '---' \| '-.->' \| '==>' \| '--o' \| '--x'` | Preservado exato da aresta importada (FR-007). Arestas criadas no canvas: `-->` (FR-003). |
| `label?` | `string \| null` | Preservado do import; **não editável pelo canvas** em S0 (FR-003). |

### Subgraph

| Campo | Tipo | Regras |
|-------|------|--------|
| `id` / `title` | `string` | Preservados intactos do import (FR-007). |
| `nodeIds` | `string[]` | Membros importados; não recebe novos nós pelo canvas em S0. |

### StyleBlock (passagem opaca)

| Campo | Tipo | Regras |
|-------|------|--------|
| `raw` | `string` | Texto opaco do bloco (`style`/`classDef`/`class`/`:::`/`linkStyle`), reemitido como está. |
| `refIds` | `string[]` | IDs de nó que o bloco referencia — rastreados para: **reescrever** no rename (ID antigo→novo) e **descartar** o bloco/ref quando aponta exclusivamente para elemento removido (FR-003/FR-007). Nenhuma referência pendente pode sobrar no texto gerado. |

## Mutações (puras, `src/core/model/`)

Cada mutação recebe e devolve um `GraphModel` novo (imutável), sem efeitos colaterais, base do determinismo:

1. **addNode(label)** → cria `Node` `shape:'rect'` na raiz, `id` = slug único do label; anexa ao fim de `nodes`.
2. **renameNode(id, newLabel)** → novo `id'` = slug único do novo label; reescreve `label`; **reescreve todas as
   `edges` que referenciam `id`** para `id'`; **reescreve `refIds`** dos `preservedStyles` (id→id') (FR-003/FR-007).
3. **connect(sourceId, targetId)** → cria `Edge` `connector:'-->'`, `label:null` (FR-003).
4. **removeNode(id)** → remove o nó, **todas as arestas incidentes**, e **descarta** as referências de estilo que
   apontem exclusivamente para ele (sem refs pendentes — FR-003/FR-007).
5. **removeEdge(id)** → remove a aresta e as refs de estilo (`linkStyle`) exclusivas a ela.

Todas preservam a ordem canônica dos elementos não afetados (estabilidade do gerador — FR-009).

## Estado transitório (fora do modelo canônico — camada `state/editorStore.ts`)

| Campo | Papel |
|-------|-------|
| `model: GraphModel` | Fonte de verdade única. |
| `editorText: string` | Overlay do que o usuário digitou; pode divergir do modelo enquanto inválido (FR-012). |
| `lastValidModel` | Último modelo válido, mantido quando o texto atual é não interpretável (FR-012). |
| `status: 'ok' \| 'uninterpretable' \| 'unsupported-type'` | Alimenta o indicador e a região ARIA (FR-012/FR-014). |
| view (posições, zoom, pan, colapso) | Efêmero, só no React Flow; **nunca** entra no modelo nem no texto (VIII/FR-013). |
