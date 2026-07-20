# Spike ADR-004 — a promessa de fluidez sobrevive ao diagrama denso da Marina?

Evidência de execução do [ADR-004 — Fluidez em diagrama denso](../../ADR-004-fluidez-em-diagrama-denso.md).
Código descartável: existe para produzir um veredito, não para virar base do produto.

## A pergunta

O discovery promete, em prosa, duas coisas sobre tempo: *"a mudança aparece no diagrama e no código
sem espera perceptível"* e *"a densidade do diagrama não muda essa sensação — diagrama grande
continua fluido"*.

Três ADRs empurraram essa promessa adiante sem prová-la. O ADR-001 declarou que nada nele a
sustentava. O ADR-002 passou o risco adiante **e acrescentou motivo de suspeita**: ancorar o instante
do tempo num `Handle` põe `participantes × (mensagens + 1)` handles no DOM, e é justamente o diagrama
denso que multiplica os dois fatores. O ADR-003 endereçou a promessa por *argumento arquitetural* —
modelo em memória mutado incrementalmente em vez de re-parse a cada tecla — e registrou, explícito,
que segue "sem evidência empírica".

A pergunta que só se resolve rodando:

> O desenho **modelo-como-fonte projetado sobre React Flow** sustenta a promessa na densidade de uma
> sessão da Marina? Onde fica o teto, e o que o determina?

## As barras, declaradas antes de medir

São premissa deste spike, não achado. Vêm do limiar clássico de Nielsen (resposta acima de ~100ms
deixa de ser sentida como instantânea) e do modelo RAIL (orçamento de ~50ms por evento para caber
nos 100ms percebidos; gesto contínuo precisa caber no frame).

| Métrica | Barra |
|---|---|
| Edição pontual, até estar pintada | mediana ≤ 100ms · p95 ≤ 200ms |
| Cada tecla no rótulo | mediana ≤ 50ms |
| Gesto contínuo (arrastar) | ≥ 50fps |

## O que foi rodado

`@xyflow/react` **12.11.2** · React 18 · Vite 5 · Chromium **149** headless via Playwright · 1440×900
· AMD Ryzen 7 5800H (8 vCPU), WSL2, **sem aceleração de GPU**.

```
npm install
npm run build
npm run verify     # -> resultados/veredito.json + capturas
```

O verificador não afirma nada por inspeção visual: cronometra com o relógio do próprio navegador e,
em cada cenário, **valida que mediu alguma coisa** — a edição precisa ter chegado ao canvas *e* ao
código projetado, senão o número é descartado. Passou 17/17.

Duas medições diferentes do mesmo gesto, porque uma sozinha engana:

- **Até o paint** — do disparo até depois do frame ser pintado (`rAF` + macrotask). É o que a Marina
  sente. Tem **piso de ~16,7ms**: a 60Hz, nada aparece antes do próximo frame. Um valor de 16,7ms
  aqui significa "abaixo da resolução do instrumento", não "custou 16,7ms".
- **Só trabalho** — `flushSync` cercado por relógio, mais um layout forçado. Mede CPU sem esperar
  frame. É o que separa "custou 2ms" de "custou 15ms" dentro do mesmo 16,7ms aparente.

Desenho da prova, em `src/`:

- `modelo.js` — a verdade, no desenho do ADR-003: sem coordenada na estrutura, posição num campo
  efêmero, e a projeção para mermaid simplesmente não a emite.
- `derivar.js` — a projeção modelo → nós/arestas, com **cache por id**: reusa o objeto de nó quando
  nada que a vista enxerga mudou. É a variável independente do experimento (`memo=0|1`).
- `nos.jsx` — caixa de flowchart (2 handles) e participante de Sequence **no desenho que o ADR-002
  provou**: a coluna inteira é um nó e cada instante do tempo é um `Handle`.

## Veredito: **a promessa se sustenta com ~16× de folga — e quem a sustenta é a projeção memoizada, não a engine**

13/17 cenários dentro das barras (`resultados/veredito.json`). O discovery descreve "dezenas de
elementos"; o teto medido é **~800 nós**.

| Cenário | DOM | Edição até o paint | Só trabalho | Tecla | Arrasto | Ajustar à tela | |
|---|---|---|---|---|---|---|---|
| flowchart n=25 | 293 el. | 16,7ms | 0,9ms | 16,7ms | 60fps | 3ms | passa |
| flowchart n=100 | 1.105 el. | 16,5ms | 2,4ms | 16,6ms | 60fps | 7,7ms | passa |
| flowchart n=200 | 2.193 el. | 16,8ms | 5,6ms | 16,8ms | 60fps | 12ms | passa |
| flowchart n=400 | 4.373 el. | 16,8ms (p95 26,8) | 7,6ms | 16,6ms | 60fps | 21,2ms | passa |
| **flowchart n=800** | 8.733 el. | 33,3ms (p95 43,5) | 17,5ms | 32,4ms | 60fps | 44,5ms | **passa (teto)** |
| flowchart n=1600 | 17.465 el. | 65,6ms | 36ms | 72,9ms | 48fps | 108ms | reprova |
| flowchart n=3200 | 34.937 el. | 129,9ms | 74,4ms | 143,9ms | 27,1fps | 205,9ms | reprova |
| n=100 **sem memo** | 1.105 el. | 20,7ms | 2,8ms | 15,6ms | 60fps | 8,7ms | passa |
| n=400 **sem memo** | 4.373 el. | 64,9ms | 13,4ms | 62ms | 46,8fps | 22,2ms | reprova |
| n=800 **sem memo** | 8.733 el. | 126,2ms | 26,2ms | 119,9ms | 29,6fps | 42,5ms | reprova |
| n=800 **+ virtualização** | 384 el. | 17,1ms | 8,7ms | 16,6ms | 60fps | **227,8ms** | passa |
| n=3200 **+ virtualização** | 392 el. | 39,8ms | 32,5ms | 39,8ms | 60fps | **991,4ms** | passa |
| sequence 4×8 (36 handles) | 137 el. | 16,7ms | 0,6ms | 16,7ms | 60fps | 2,1ms | passa |
| sequence 12×50 (612 handles) | 1.039 el. | 16,7ms | 1,0ms | 16,7ms | 60fps | 7ms | passa |
| sequence 20×100 (**2.020 handles**) | 2.829 el. | 16,7ms | 1,9ms | 16,6ms | 60fps | 15,1ms | passa |

### Achado 1 — o custo é linear no número de nós, e a constante é ~22µs por nó

| n | 25 | 100 | 200 | 400 | 800 | 1600 | 3200 |
|---|---|---|---|---|---|---|---|
| µs por nó | 36 | 24 | 28 | 19 | 22 | 22,5 | 23,3 |

A constante não sobe com a escala — de 100 a 3200 nós ela fica entre 19 e 23µs. **Não há termo
quadrático**: o custo por elemento é o mesmo num diagrama de 100 e num de 3200. É o que valida por
medição o argumento arquitetural do ADR-003 (mutar o modelo em memória em vez de re-parsear o
documento a cada tecla), e é a razão pela qual a densidade do discovery cabe com folga de mais de uma
ordem de grandeza.

### Achado 2 — a suspeita do ADR-002 sobre os handles **não se confirmou**

O ADR-002 registrou que `participantes × mensagens` handles no DOM era motivo para suspeitar da
fluidez. Medido: **2.020 handles custam 1,9ms de trabalho e 60fps**, enquanto 800 handles espalhados
por 400 nós custam 7,6ms. O que pesa é o **número de nós** (componentes React a reconciliar e caixas
a posicionar), não o número de handles — um handle é um `div` absoluto barato dentro de um nó que já
existe.

Com uma ressalva honesta: **criar** uma mensagem em `20×100` custou 38,3ms, contra 16,7ms para editar
um rótulo. Criar mensagem muda o número de instantes e portanto remonta os 20 participantes com seus
2.000 handles. Handles não pesam na edição; pesam na **mudança estrutural**.

### Achado 3 — a memoização da projeção é o que sustenta a promessa (e é disciplina, não otimização)

É a comparação mais acionável do spike, com tudo o mais igual:

| n | com memo | sem memo | |
|---|---|---|---|
| 100 | 16,5ms · 0 tarefas longas | 20,7ms · 0 tarefas longas | ambos passam |
| 400 | 16,8ms · 2 longas | 64,9ms · **11 longas** (máx 167ms) | só com memo |
| 800 | 33,3ms · 2 longas | 126,2ms · **86 longas** (máx 341ms) | só com memo |

Sem o reuso do objeto de nó, o teto desaba de ~800 para menos de 400 — e a diferença aparece muito
mais na latência até o paint (3,8×) do que no trabalho síncrono (1,5×), porque o custo real é a
engine remontar e repintar nós cujo dado não mudou. **A projeção precisa reusar o objeto de nó quando
nada que a vista enxerga mudou.** Não é micro-otimização a fazer depois: é o que separa passar de
reprovar na densidade-alvo.

### Achado 4 — virtualizar não é ganho grátis: transfere o custo para "ajustar à tela"

`onlyRenderVisibleElements` derruba o DOM de 8.733 para 384 elementos e leva a edição em 3200 nós de
129,9ms para 39,8ms. Mas o gesto **"ajustar o diagrama à tela"** — capacidade explícita do discovery
— vai de 44,5ms para 227,8ms (n=800) e de 205,9ms para **991,4ms** (n=3200): o zoom-out traz todos os
nós para dentro do viewport e a engine monta o mundo inteiro de uma vez. A virtualização troca uma
latência frequente e pequena por uma rara e grande, quase um segundo. É escolha de produto, não
técnica óbvia.

### Achado 5 — o serializador do ADR-003 não é o gargalo

Projetar o modelo inteiro para texto mermaid custa **0,2ms em 800 nós e 1,1ms em 3200** — duas ordens
de grandeza abaixo do custo da vista. O par parser/serializador que o ADR-003 assume como caro de
*escrever e manter* não é caro de *rodar*. O que custa é o canvas.

### Achado 6 — a posição não vazou para o código em nenhum cenário

Verificado nos 17: depois de arrastar nós, nenhuma coordenada apareceu na projeção. A promessa "não
leva posição de nó no código entregue" se cumpre por construção, como o ADR-003 desenhou — serializar
é projetar, não despejar.

## Limites conhecidos deste spike

Escrito para não superestimar o veredito:

- **Uma máquina, sem GPU.** Chromium headless em WSL2 num Ryzen 7 5800H. Os números absolutos são
  desta máquina; máquina modesta terá teto menor. O que o spike lê com confiança é a **curva** (linear)
  e a **ordem de grandeza** da folga — não o valor 800.
- **60fps é o teto do vsync.** O spike não distingue "60fps" de "poderia ser mais"; só acusa quando cai.
- **O nó tem tamanho fixo.** `width`/`height` são declarados na projeção, então o custo de o nó crescer
  com o rótulo (medição por `ResizeObserver`) **não está na conta**. O teto real é menor que o medido.
- **O painel de código é um `<pre>`.** Um editor de verdade — destaque de sintaxe, cursor, seleção,
  desfazer — custa mais a cada tecla. O caminho medido é modelo → texto.
- **O caminho inverso não foi medido.** Texto → modelo não existe: o parser é o que o ADR-003 assume
  escrever, e não há como cronometrar o que não foi escrito. Digitar **no editor de código** de um
  diagrama denso segue sem evidência.
- **Nenhuma sessão longa.** O discovery fala de "sessões longas"; cada cenário aqui dura segundos.
  Vazamento de memória e degradação ao longo de horas não foram medidos.
- **Dois tipos, um deles simplificado.** Flowchart e um Sequence deliberadamente mais pobre que o do
  spike ADR-002 (sem ativação, sem fragmento, sem seta própria) — o objeto ali era a densidade de
  handles. Class, State e ER não foram medidos.
- **Um gesto de edição, o mais frequente.** Editar rótulo, criar elemento e arrastar. Seleção
  múltipla, aplicar alteração a uma seleção inteira, desfazer/refazer e colar diagrama grande ficaram
  de fora — e o discovery promete que o ato sobre uma seleção inteira é um só.
