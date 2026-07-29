# Contrato — Extensão desenhada

A geometria **única** de `FR-008` e `FR-011`. A spec é explícita em que os dois requisitos medem a
mesma coisa; aqui isso deixa de ser disciplina e vira estrutura: **uma função, dois consumidores**.

Módulo: `src/areatrabalho/extensao.ts` · gerador de caminho: `src/canvas/caminho.ts`.

## Superfície

```ts
type Caixa = { x: number; y: number; w: number; h: number }   // coordenadas do PLANO

/** A extensão desenhada de UM elemento — nó, conexão ou agrupamento. Regra única. */
function extensaoDoElemento(p: Projecao, id: string): Caixa | null

/** A extensão desenhada do diagrama INTEIRO (não a seleção, não o que está visível). */
function extensaoDesenhada(p: Projecao): Caixa | null          // null ⇔ diagrama vazio

/** Medidor de texto injetável — navegador (canvas 2D) em runtime, determinístico em teste. */
type MedirTexto = (texto: string) => { w: number; h: number }
```

## Como cada geometria é obtida

| Elemento | Extensão | Fonte |
|---|---|---|
| **Nó** | `position + (CAIXA_W, CAIXA_H)` | direto de `RFNode` (posição absoluta, resolvendo `parentId`) |
| **Agrupamento** | a moldura: `position + (width, height)` do nó-container | direto de `RFNode` — já é a moldura que `projetar` calcula |
| **Conexão** | caixa dos **pontos de controle** do caminho | `caminho.ts` — a mesma função que `Conexao.tsx` usa para pintar |
| **Rótulo de conexão** | caixa centrada em `(labelX, labelY)`, dimensão `medirTexto(texto) + padding + borda` declarados | `caminho.ts` + `MedirTexto` |

A extensão de uma conexão é a **união** do traçado com o seu rótulo. A do diagrama inteiro é a união
de todas — nós, conexões (com rótulo) e molduras.

## Invariantes

1. **Superset, nunca recorte.** Uma curva de Bézier está contida no casco convexo dos seus pontos de
   controle. A caixa devolvida pode sobrar; **não pode faltar**. Consequência direta de `SC-004`:
   0 arcos de laço, 0 arestas paralelas, 0 rótulos de conexão e 0 molduras cortados pela borda.
2. **Uma função, dois consumidores.** `caminho.ts` é chamado por quem **desenha** (`Conexao.tsx`) e
   por quem **mede** (`extensao.ts`). Não existe estado em que o desenho arqueia para fora e a medida
   não sabe. Quando laço e arestas paralelas ganharem desenho próprio, a medida acompanha no mesmo
   commit — sem alterar este contrato.
3. **`FR-008` e `FR-011` leem daqui, e só daqui.** Nenhum outro módulo calcula geometria de elemento.
   Um segundo cálculo é violação de contrato, não otimização.
4. **Determinismo.** Mesma projeção → mesma caixa, bit a bit. É o que sustenta o "**0** desvios" da
   centralização em `SC-004`: produto e teste chamam a mesma função.
5. **Reuso.** O cache é chaveado pela **identidade referencial** dos objetos de `Projecao`
   (ADR-004, Princípio III). Enquanto a projeção reusa, a extensão reusa junto; quebrar a invariante
   de reuso degrada esta função em vez de apenas encarecer a pintura — mais um dono para ela.

## Custo

O(n + m) sobre nós e conexões, com cache. Roda **apenas** em ajustar à tela (`FR-008`), na abertura
(`FR-017`) e nas perguntas de visibilidade (`FR-011`, `FR-012`) — **nunca por quadro** de gesto
contínuo. Entra na barra de `SC-012` (≤100ms de mediana até o enquadramento começar a mudar) e é
medida no envelope cheio.

## Não faz parte deste contrato

- **Ler o DOM.** Nada de `getBBox` nem `getBoundingClientRect` sobre arestas: forçaria *layout* de 500
  elementos dentro da barra de 100ms e deixaria de funcionar se a virtualização do ADR-004 (saída
  conhecida, hoje desligada) fosse acionada.
- **Caixa exata da cúbica.** Resolver as raízes da derivada daria uma caixa mais apertada; o superset
  já entrega o que a spec cobra. Fica registrado como refinamento possível, não como dívida.
- **Posição de elemento.** Esta função **lê** o arranjo (via projeção) e nunca o escreve — é por isso
  que `SC-002` é verdadeiro por assinatura.
