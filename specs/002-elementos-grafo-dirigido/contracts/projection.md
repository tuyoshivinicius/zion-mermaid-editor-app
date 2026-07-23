# Contrato — Projeção modelo → vista (React Flow), R1

ADR-004. A projeção `projetar(modelo, arranjo)` é o componente entre o modelo e a área do diagrama. A
**invariante de reuso é portão** (Princípio III), não otimização: o objeto de vista de um elemento é
**reusado (identidade referencial)** quando nada que a vista enxerga mudou. O R0 projetava só nós; o R1
projeta **nós, arestas e nós-container**, cada família com o seu cache de reuso.

## Superfície

```ts
function projetar(modelo: Modelo, arranjo: Arranjo): {
  nodes: RFNode[]   // nós E nós-container (agrupamentos), pai ANTES de filho
  edges: RFEdge[]   // conexões
}

interface RFNode {                 // nó comum
  id; type: 'caixa'; position; width; height
  parentId?: string                // NOVO — o agrupamento a que pertence (aninhamento via container)
  data: { rotulo, forma:'retangulo', marcado }
}
interface RFNodeContainer {        // agrupamento
  id; type: 'agrupamento'; position; width; height
  parentId?: string                // container pai (aninhado)
  data: { titulo, marcado }
}
interface RFEdge {                 // conexão
  id; source: origem; target: destino
  data: { texto, marcado }
  // sem posição própria: acompanha as pontas
}
```

## Chaves de cache (reuso por id, por família)

| Família | Chave de cache | Muda quando… |
|---|---|---|
| Nó | `rotulo\|forma\|marcado\|parentId\|x\|y` | rótulo, marca, pertencimento ou posição mudam |
| Conexão (aresta) | `origem\|destino\|texto\|marcado\|conectivo` | pontas, texto, marca ou conectivo mudam |
| Agrupamento (container) | `titulo\|marcado\|parentId\|x\|y\|w\|h` | título, marca, aninhamento, posição ou tamanho da moldura mudam |

Mover **um** nó muda só o objeto daquele nó: a aresta referencia as pontas por **id string** (não muda);
o container só muda se a moldura mudar de geometria. Trocar o rótulo de **um** nó muda só aquele objeto.
Mudar pertencimento muda o `parentId` do membro (1 objeto) e o `membros` dos dois agrupamentos (2
objetos) — o resto é reusado.

## Regras de projeção

- **Ordem pai-antes-de-filho** (exigência do React Flow para nós aninhados): agrupamentos externos, depois
  internos, depois nós-membro. Ordenação **estável** (por profundidade de aninhamento + ordem do modelo)
  para não quebrar o reuso.
- **Moldura é arranjo**: `position`/`width`/`height` do agrupamento derivam do arranjo dos membros
  (bounding box + folga), **nunca** do modelo estrutural — não viajam no código (Princípio V). Enquadrar
  a moldura por gesto explícito é `layout-automatico`; aqui a moldura só contém o que os membros ocupam.
- **Marca observável** (`FR-006`): `data.marcado = alertas.length > 0`, para nó, aresta e agrupamento;
  a aparência definitiva é `codigo-de-entrada` (RF-22).
- **Conexão sem entrada de arranjo**: a aresta não tem posição; entra/sai da projeção com as pontas.
- **Bloco vazio** (M5): um agrupamento de `membros: []` (escrito à mão) projeta uma moldura sem filhos —
  exibida enquanto o código o declara (`FR-019`).

## Envelope e custo por elemento (Princípio III)

| Elemento | Custo de projeção | Consome do envelope |
|---|---|---|
| Nó | 1 `RFNode` + 1 entrada de arranjo | 1 das **400** |
| Agrupamento | 1 `RFNodeContainer` + 1 moldura (arranjo) | 1 das **400** (conta como nó, sem número novo) |
| Conexão | 1 `RFEdge` (sem arranjo) | 1 das **500** |

## Invariantes verificáveis (portões)

| Invariante | Teste | Requisito |
|---|---|---|
| Reuso das 3 famílias | projeta 2×, muda 1 elemento → identidade referencial de nós, arestas **e** agrupamentos não mudados | Princípio III |
| Pai antes de filho | ordem estável; nós aninhados montam sem erro do React Flow | ADR-002 |
| Moldura fora do código | posição/tamanho de moldura **nunca** aparecem na saída do serializador | Princípio V · SC-004 |
| Latência no envelope | edição pontual ≤100ms mediana; tecla ≤50ms; gesto contínuo ≥50fps — em 400 nós+grupos / 500 conexões | SC-005 · SC-010 |
| Custo declarado | o `plan.md` declara o custo por conexão e por agrupamento; os 3 números medidos no envelope cheio | NFR-03 |
