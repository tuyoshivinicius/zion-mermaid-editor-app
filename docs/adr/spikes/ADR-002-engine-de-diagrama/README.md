# Spike ADR-002 — o tipo Sequence cabe no vocabulário nó/aresta do React Flow?

Evidência de execução do [ADR-002 — Engine de diagrama](../../ADR-002-engine-de-diagrama.md).
Código descartável: existe para produzir um veredito, não para virar base do produto.

## A pergunta

O ADR-002 adota React Flow para a área do diagrama e, na própria seção *Fica mais difícil*, deixa o
risco em aberto: *"cada tipo de diagrama do escopo terá que caber nele — inclusive os que o discovery
já marca como diferentes (… Sequence, que não é grafo livre)"*.

Sequence é o caso extremo porque não é um grafo posicionado: é uma **sequência temporal de mensagens
entre participantes**. O vocabulário da engine é `nó tem (x, y)` e `aresta liga dois handles`. A
pergunta que só se resolve rodando:

> O tipo Sequence cabe nesse vocabulário — **renderizando** (participante com lifeline, mensagem
> ordenada, barra de ativação, fragmento `alt`/`loop`) e **editando** (criar mensagem, reordenar no
> tempo, reconectar destino) —, mantendo o modelo interno sem coordenada?

A barra é renderizar **e** editar porque o discovery diz que os gestos de edição *"valem igualmente
nos cinco tipos desde o começo"*. Um Sequence que só desenha já reprova ali.

## O que foi rodado

`@xyflow/react` **12.11.2** · React 18 · Vite 5 · Chromium headless via Playwright 1.61.1 · 1440×900.

O verificador **não afirma nada por inspeção visual**: sobe o build, executa cada gesto com mouse
real no navegador e depois lê a verdade em `window.__spike.modelo`. Um diário registra qual callback
da lib disparou em cada gesto — é o que separa "a engine deu esse gesto" de "eu escrevi esse gesto".

```
npm install
npm run build
npm run verify     # -> resultados/veredito.json + capturas
node verify/sonda.mjs   # dump do DOM/CSS que a engine gera (diagnóstico)
```

Desenho da prova, em `src/`:

- `model.js` — a verdade. **Não tem coordenada**: o tempo é o índice do array `messages`, a coluna é
  o índice do array `participants`. Ativações e fragmentos guardam faixas de índice de tempo.
- `layout.js` — a derivação modelo → nós/arestas com (x, y). Roda a cada mudança.
- `nos.jsx` — participante = 1 nó, com a lifeline desenhada **dentro do mesmo nó** e um `Handle` por
  instante do tempo.
- `arestas.jsx` — mensagem = 1 aresta com caminho horizontal, seta própria e rótulo arrastável.

## Veredito: **cabe, com quatro atritos e um custo estrutural**

6/6 verificações passaram (`resultados/veredito.json`). Nenhum gesto exigiu abandonar a engine.

| Gesto | Passou | Quem entregou |
|---|---|---|
| Renderizar participante + lifeline + ativação + fragmento `alt`/`loop` | sim | derivação própria sobre nó customizado |
| Criar mensagem (arrastar da lifeline até outro participante) | sim | **a lib** (`onConnectStart → onConnect → onConnectEnd`) |
| Reordenar no tempo (arrastar o rótulo na vertical) | sim | **código próprio** — nenhum callback da lib disparou |
| Reconectar destino (arrastar a ponta da seta) | sim | **a lib** (`onReconnectStart → onReconnect → onReconnectEnd`) |
| Trocar a coluna do participante | sim | a lib move o nó; o snap para índice de coluna é próprio |
| Modelo interno segue sem coordenada depois de 4 gestos | sim | — |

### Atrito 1 — a camada do nó cobre o diagrama inteiro (o mais caro)

A engine empilha o viewport nesta ordem: `edges` → `edgelabel-renderer` → **`nodes` por último**.
Num grafo comum isso é inofensivo: a aresta encosta na borda do nó e ninguém disputa pixel. No
Sequence o nó do participante **é a coluna inteira**, da caixa do topo ao pé da lifeline — então ele
cobre todas as mensagens e todos os rótulos. Antes do contorno, o ponteiro no centro do rótulo da
mensagem atingia `DIV.react-flow__node-participante`, e **todo** gesto sobre mensagem virava arrasto
de participante (a sonda registra isso).

O contorno tem duas partes, ambas mexendo no CSS da lib:

1. Furar o nó (`pointer-events: none`) e reabrir só na caixa do topo e nos handles. Exige **empatar a
   especificidade da lib**, que declara `.react-flow__node.draggable { pointer-events: all }` (0,2,0)
   — um seletor de classe única perde.
2. Subir a camada dos rótulos acima da dos nós (`z-index` no `.react-flow__edgelabel-renderer`).

Custo real: a área do diagrama passa a depender de detalhe interno de CSS da lib, que não é API
pública e pode mudar entre versões.

### Atrito 2 — reordenar no tempo não é gesto da engine

No vocabulário da lib aresta não tem posição, logo não existe arrastar aresta. O gesto foi escrito à
mão sobre `EdgeLabelRenderer`: pointer capture, delta de tela dividido pelo zoom, snap ao passo de
linha. A lib contribuiu com `useReactFlow().getZoom()` e nada mais — o diário confirma que **nenhum**
callback dela disparou nesse gesto.

Pior que o gesto: reordenar mensagem **invalida as faixas de ativação e de fragmento**, que são
índices de tempo. Foi preciso remapeá-las na mão (`remapearIndices`), e a engine não sabe que esses
objetos existem. O remapeamento implementado aqui é deliberadamente ingênuo — as capturas
`03-reordenar-tempo.png` mostram um fragmento `alt` passando a envolver mensagem que antes estava
fora dele. Qual é a semântica correta é decisão de produto, não de engine, e este spike não a decide.

### Atrito 3 — as primitivas de desenho não cobrem Sequence

Três coisas tiveram que ser desenhadas à mão:

- **Ponta de seta**: `markerEnd` da lib não acompanha caminho customizado; a seta é um `<path>` próprio.
- **Auto-mensagem** (`from == to`): origem e destino caem no mesmo handle e a lib degenera o caminho;
  o laço é desenhado a partir do modelo.
- **Fragmento `alt`/`loop`**: não é primitiva. Virou nó decorativo, `zIndex` negativo,
  `pointer-events: none`, `draggable: false`.

Nenhum desses é bloqueio — são pontos de extensão legítimos da lib —, mas somados significam que a
engine entrega o **canvas** (zoom, pan, arrasto, conexão, reconexão, seleção) e quase nada do
**desenho** de Sequence.

### Atrito 4 — um handle por instante por participante

O instante do tempo precisou ser codificado no id do handle (`linha-N`) para que `onConnect` soubesse
*quando* a mensagem nasce. Isso põe `participantes × (mensagens + 1)` handles no DOM. Com 4
participantes e 6 mensagens são 28; num diagrama denso — o cenário que a Marina do discovery vive —
isso cresce por multiplicação. **Este spike não mediu isso**: ver limites abaixo.

### O que deu certo sem ressalva

- **O modelo interno sobreviveu sem coordenada.** Depois de quatro gestos, nenhum campo `x`/`y` vazou
  para a verdade; a coordenada existe só na derivação. O trade-off *"modelo interno acoplado"* do
  ADR-002 **não se materializou** neste recorte: a engine consome a derivação e nunca é a fonte.
- **Criar e reconectar são gestos da lib.** `onConnect` e `onReconnect` funcionaram em cima de
  handles posicionados na lifeline, com `ConnectionMode.Loose`. Só o mapeamento para o modelo é código
  próprio.

## Limites conhecidos deste spike

Escrito para não superestimar o veredito:

- **Não mede fluidez.** 4 participantes e 6–7 mensagens. A promessa do discovery — *"diagrama grande
  continua fluido"* — segue sem evidência, exatamente como o ADR-002 registra. O atrito 4 dá motivo
  para suspeitar, não para concluir.
- **Não gera código mermaid.** O ida-e-volta com o texto `sequenceDiagram` ficou fora: a forma do
  modelo interno é decisão ainda aberta, e construir o gerador aqui seria erguer sobre chão não
  decidido.
- **Não trata layout automático.** As posições saem de constantes fixas (`COL_W`, `ROW_H`), não de um
  motor de layout. O ADR-002 já registra isso como decisão separada.
- **Não cobre o vocabulário completo de Sequence.** Ficaram de fora `par`, `critical`, `break`, `note`,
  `create`/`destroy` de participante e numeração automática. Os quatro fragmentos testados são
  `loop` e `alt`.
- **Gestos testados em mouse, não em teclado.** O discovery diz que o teclado é inegociável no ciclo
  principal; este spike não tocou nisso.
