# Contrato — Área visível, e a superfície que o `R-05` consome

Este é o contrato que esta spec **paga para as outras**. O ADR-005 diz que quem cria um elemento por
teclado tem o dever de trazê-lo para a área visível; até aqui "área visível" era palavra sem dono.
Aqui ela tem definição, medida e uma superfície chamável.

Módulos: `src/areatrabalho/areaVisivel.ts` · `src/modelo/store.ts` (as ações).

## Superfície

```ts
type Quadro = { x: number; y: number; w: number; h: number }   // coordenadas de TELA

/** O quadro: o que a pessoa VÊ do plano — não o que a proporção reservou. */
function quadroVisivel(retanguloDaArea: DOMRect, janela: Retangulo, oclusoes: Oclusao[]): Quadro

/** O mesmo quadro em coordenadas do PLANO, dado o enquadramento corrente. */
function quadroNoPlano(q: Quadro, e: Enquadramento): Caixa

/** Um controle persistente declara a faixa que tapa, ao montar. */
function registrarOclusao(o: Oclusao): () => void      // devolve o cancelamento

// ── as duas ações do store — a superfície que `ciclo-por-teclado` chama ──
estaNaAreaVisivel(id: string): boolean
trazerParaAreaVisivel(id: string): void
```

`ciclo-por-teclado` chama `useSessao.getState().trazerParaAreaVisivel(id)` **sem saber que existe React
Flow**: o `Canvas` registra um `piloto` no store ao montar, e é ele que aplica. **Quando** e por qual
gesto isso é acionado continua sendo de lá (`FR-012`); esta spec só oferece a capacidade.

## Como o quadro é calculado (`FR-011`)

```
quadro = retângulo da área do diagrama
       ∩ retângulo da janela                    ← a página rolada encolhe a área visível
       − faixas de sobreposição persistente      ← o que o produto tapa não conta
```

- **A interseção com a janela** resolve o caso da janela abaixo da soma dos mínimos (`FR-006`) **sem
  código especial**: o pedaço da área do diagrama que ficou fora da tela sai da conta sozinho. Sem
  rolagem de página, as duas coisas coincidem, como a spec diz.
- **As sobreposições são registradas, não presumidas.** Cada controle persistente declara
  `{ borda, espessura }`; o quadro recua pela **maior** espessura declarada em cada borda. Recuar por
  borda (em vez de subtrair polígonos) mantém o quadro **retangular**, que é o que a aritmética de
  centralizar e de deslocamento mínimo exige. Quem paga hoje: a barra de controles desta feature
  (borda inferior) e a barra de gestos do R1 (borda superior).
- **`FR-008`, `FR-011` e `FR-012` medem contra este mesmo quadro.** Não há segunda régua.

## `estaNaAreaVisivel` (`FR-011`)

Verdadeiro quando a **extensão desenhada** do elemento (ver
[extensao-desenhada.md](./extensao-desenhada.md)) está **inteira** dentro do quadro **recuado de
`FOLGA_BORDA`**.

| Caso | Resposta | Requisito |
|---|---|---|
| Elemento inteiro, com folga | `true` | `FR-011` |
| Elemento **encostado** na borda | `false` | `FR-011`, `SC-008` |
| Elemento **pela metade** | `false` | `FR-011`, `SC-008` |
| Nó dentro, mas o **arco do laço** / o **rótulo da conexão** / a **moldura** fora | `false` | `SC-008` |
| Elemento sob controle ou painel **persistente** | `false` | `FR-011`, `SC-008` |
| Elemento na parte da área do diagrama que a **página rolada** não mostra | `false` | `FR-011`, `SC-008` |

A resposta é sempre **sobre o agora**: nada aqui promete que um elemento *fique* visível.

## `trazerParaAreaVisivel` (`FR-012`)

| Propriedade | Valor | Requisito |
|---|---|---|
| O que muda | **só o enquadramento** (`x`, `y`) | `FR-012` |
| Nível de zoom | **inalterado** | `FR-012`, `SC-008` |
| Elementos movidos | **0** | `FR-012`, `SC-002` |
| Código | **byte-idêntico** | `FR-012`, `SC-001` |
| Deslocamento | o **mínimo** que satisfaz `estaNaAreaVisivel` | `FR-012` |
| Elemento já visível | deslocamento **nulo** | `FR-012`, `SC-008` |
| Elemento **maior** que o quadro | traz o que cabe, alinhando o **canto de partida da ordem de leitura** ao canto correspondente do quadro recuado | `FR-012` |
| Trânsito | o mesmo do `FR-008` — interrompe e assume | `FR-012` |
| Entradas de histórico | **0** | `FR-014` |

### O canto de partida da ordem de leitura

Uma regra só para nó, conexão e agrupamento, sobre a extensão desenhada, relativa à **orientação
corrente** — que é de `layout-automatico` (`RF-16`, ADR-007) e entra por uma costura de um valor só
(`src/areatrabalho/orientacao.ts`):

| Orientação | Canto |
|---|---|
| `TB` / `TD` | superior-esquerdo |
| `BT` | inferior-esquerdo |
| `LR` | superior-esquerdo |
| `RL` | superior-direito |

Mesmo sentido que o termo tem na constitution (Princípio VI), **medido nas 4 orientações** por teste
de unidade. Um diagrama lido de baixo para cima ancorado no topo mostraria a ponta que a pessoa lê por
último — é esse erro que a tabela impede.

## Invariantes

1. Nenhuma das duas operações abre transação, muta o `Modelo` ou produz entrada de histórico.
2. Nenhuma das duas muda a seleção ou o foco corrente.
3. As duas leem a **mesma** extensão desenhada e a **mesma** folga que o `FR-008` — divergir entre
   "está visível" e "ajustar à tela" é violação de contrato.
4. `trazerParaAreaVisivel` sobre um id inexistente é **silenciosa** (0 efeitos), não um erro.
