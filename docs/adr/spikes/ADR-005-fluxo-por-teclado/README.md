# Spike ADR-005 — o ciclo principal roda ponta-a-ponta só com teclado?

Evidência de execução do [ADR-005 — Fluxo por teclado no ciclo principal](../../ADR-005-fluxo-por-teclado.md).
Código descartável: existe para produzir um veredito, não para virar base do produto.

## A pergunta

O discovery dá ao teclado um bloco próprio no `### Faz` — *"executar o ciclo principal — criar caixa →
rotular → conectar → rotular a conexão — de ponta a ponta, sem alternar para o mouse"* — e o chama de
**inegociável** dentro do ciclo. É uma das três dores que definem a persona.

Nenhum spike anterior encostou nisso, e os dois registram o buraco por escrito. O ADR-002: *"todos os
gestos foram testados com mouse — o teclado, que o discovery chama de inegociável no ciclo principal,
não foi tocado"*. O ADR-004: *"fluxo por teclado segue intocado desde o ADR-002 … continua sem
evidência de nenhum tipo"*.

A pergunta que só se resolve rodando:

> O ciclo principal roda **do começo ao fim sem um único evento de ponteiro**, dentro do React Flow e
> com o modelo próprio como fonte — sem que o teclado da engine e o do produto disputem as mesmas
> teclas, e sem que o foco se perca no meio?

A barra é o ciclo **inteiro**. Criar um nó por teclado e ter que pegar o mouse para conectar já
reprova: é exatamente a alternância que a persona relata como dor.

## O que foi rodado

`@xyflow/react` **12.11.2** · React 18 · Vite 5 · Chromium headless via Playwright · 1440×900 ·
Linux WSL2, AMD Ryzen 7 5800H, 8 vCPU.

O verificador **não afirma nada por inspeção visual**: sobe o build, dirige tudo com eventos de
teclado reais e lê o veredito em `window.__spike.modelo()`. Duas guardas sustentam a afirmação
"sem mouse":

- um contador instalado em `main.jsx` conta `pointerdown`, `mousedown`, `click`, `wheel` e afins — o
  ciclo completo terminou com **0**;
- nem o foco inicial é dado por clique: vai para o palco por `.focus()`.

Um diário registra qual callback da engine disparou em cada gesto — é o que separa "a lib entregou
esse gesto" de "eu escrevi esse gesto".

```
npm install
npm run build
npm run verify        # -> resultados/veredito.json + capturas
node verify/sonda.mjs # a evidência de remontagem da aresta (achado 2)
```

Desenho da prova, em `src/`:

- `modelo.js` — a verdade. Sem coordenada: a posição é derivada do índice, nunca guardada.
- `teclado.js` — a máquina de estados do ciclo (`navegando`, `editando-no`, `conectando`,
  `editando-conexao`). É código de produto, não da engine.
- `projecao.js` — modelo → nós/arestas, com o reuso de objeto que o ADR-004 fixou como invariante.
- `App.jsx` — o único ouvinte de teclado, a perseguição do foco, e a projeção para mermaid.

Braços de controle, por query string: `memo=0` (projeção sem reuso), `a11y=1` (teclado nativo da
engine ligado), `rot=0|1|2` (desenho da aresta), `cam=1` (câmera acompanha o foco),
`n=400&arestas=500` (o envelope do ADR-004).

## Veredito: **roda ponta-a-ponta sem mouse — com três atritos e duas restrições de desenho**

13/16 verificações passaram (`resultados/veredito.json`). As três que falharam são os achados, e cada
uma tem o contorno medido no mesmo spike.

| Verificação | Passou | Quem entregou |
|---|---|---|
| Criar nó por teclado | sim | código próprio |
| Tecla perigosa (Backspace/Delete) no rótulo não destrói o elemento | sim | **a lib** — guarda contra tecla vinda de input |
| Conectar por teclado | sim | código próprio — **nenhum** callback de conexão da lib disparou |
| Rotular a conexão por teclado | sim | código próprio |
| Ciclo completo, 9 elementos, **0 eventos de ponteiro** | sim | — |
| Foco encadeia para o próximo ciclo | sim | código próprio |
| Modelo segue sem coordenada depois de 9 elementos | sim | — |
| Seta dentro do rótulo não move o nó (com a11y da lib ligado) | sim | **a lib** |
| Backspace dentro do rótulo não apaga o nó (com a11y ligado) | sim | **a lib** |
| Nó novo nasce dentro da viewport | **não** | atrito 3 — contornado com `setCenter` (8/8) |
| Foco sobrevive à projeção sem reuso de objeto | **não** | restrição 1 — sem contorno |
| Tecla dentro da barra de 50ms no envelope | **não** | restrição 2 — contornado com aresta híbrida |

O custo do ciclo em teclas: **4 teclas de controle por elemento** (`c`, `n`, `Enter`, `Enter`), fora o
texto dos dois rótulos. Nenhuma delas é gesto de mouse.

### Atrito 1 — o foco é responsabilidade inteira do produto, e corre atrás da engine

A engine não move foco por conta própria. Isso já era esperado; o que não era é *quando* o DOM existe
para receber o foco.

A engine monta o nó num commit **posterior** ao da mudança do modelo — ela mede o container antes de
renderizar os filhos. No commit em que a máquina de estados diz "edite o rótulo de n7", o input de n7
ainda não está no DOM. E como a mudança acontece dentro da engine, **nenhuma dependência de efeito
nossa acorda depois**: a primeira versão do spike simplesmente perdia o foco e a digitação caía no
vazio.

O contorno é perseguir o alvo por `requestAnimationFrame` até ele aparecer. Medido: **2 frames** de
espera. Numa máquina a 60Hz isso é ~33ms de janela em que a tecla digitada não chega a lugar nenhum —
e é justamente a janela em que uma pessoa que digita rápido está começando a escrever o rótulo do
elemento que acabou de criar.

### Atrito 2 — conectar por teclado é 100% código próprio

O contraste com o spike do ADR-002 é o achado. Lá, criar e reconectar mensagem **eram gestos da lib**
(`onConnectStart → onConnect → onConnectEnd`) porque o gesto era arrastar de um handle a outro. Aqui,
no gesto por teclado, o diário registra apenas `onNodesChange` e `onSelectionChange` — nenhum callback
de conexão disparou. A conexão nasce direto no modelo.

O significado prático: os handles de conexão, que são a razão de a lib entregar o gesto de mouse de
graça, **não participam** do caminho por teclado. Toda a semântica de "de onde para onde" — escolher a
origem, percorrer os candidatos a destino, confirmar — é máquina de estados do produto.

### Atrito 3 — a câmera não segue o teclado

A engine posiciona o que recebe e não tem noção de "traga o elemento novo para a tela". No ciclo de 8
elementos, **7 nasceram visíveis e 1 não** (`n5`, o que caiu na borda direita da grade): a pessoa
estaria digitando um rótulo que não está vendo.

Contorno medido no próprio spike: chamar `setCenter` do produto a cada troca de foco leva o placar a
**8/8**. É API pública da lib, e o custo é código nosso decidindo o que "acompanhar o foco"
significa — o que já é decisão de produto, não de engine.

A frequência do nascimento cego depende do **layout**, que segue decisão aberta desde o ADR-002. Aqui
a posição vem de uma grade fixa de 5 colunas; um motor de layout de verdade espalha mais, e o
problema tende a piorar, não a melhorar.

### Restrição 1 — o reuso do objeto projetado é condição de **correção**, não só de performance

O ADR-004 fixou "a projeção reusa o objeto de nó quando nada que a vista enxerga mudou" como
restrição de arquitetura, com o argumento de **latência**. Este spike encontra uma segunda razão, mais
dura, e do lado das **arestas**.

Com `memo=0`, o ciclo por teclado **quebra**: o rótulo da conexão congela na primeira letra. A sonda
(`verify/sonda.mjs`) mostra o mecanismo, marcando o elemento do DOM e vendo se a marca sobrevive:

```
memo=1 -> apos "v": foco=input-conexao-c2 | mesmo DOM=true  | rotulo="v"
          apos "i": foco=input-conexao-c2 | mesmo DOM=true  | rotulo="vi"
          apos "a": foco=input-conexao-c2 | mesmo DOM=true  | rotulo="via"

memo=0 -> apos "v": foco=null            | mesmo DOM=false | rotulo="v"
          apos "i": foco=null            | mesmo DOM=false | rotulo="v"
          apos "a": foco=null            | mesmo DOM=false | rotulo="v"
```

Marca perdida = o input foi **remontado**, não re-renderizado. O foco vai para o `body` e todas as
teclas seguintes se perdem. E há uma assimetria que importa: o input **dentro do nó** sobrevive ao
mesmo tratamento — só a aresta é remontada.

O contorno óbvio foi testado e **não resolve**: incluir as arestas nas dependências da perseguição do
foco não adianta, porque a remontagem acontece depois que a perseguição já se acomodou. Recuperar o
foco exigiria observar mutação de DOM, o que é lutar contra a engine.

### Restrição 2 — rótulo editável por conexão só cabe na conexão que está em edição

Dentro do envelope do ADR-004 (400 nós / 500 conexões), a tecla estourou a barra de 50ms: **77,6ms de
mediana**. O braço de controle isola de quem é o custo — mesma ação (12 letras no rótulo de um nó),
mesma densidade, mudando só o desenho da aresta:

| Desenho da aresta | Mediana | p95 |
|---|---|---|
| Componente próprio com rótulo editável em **todas** as conexões | 83,5ms | 88,9ms |
| Aresta embutida da engine em todas (controle — rótulo não editável) | 28,2ms | 35,3ms |
| **Híbrida**: embutida em todas, própria só na conexão em edição | **28,8ms** | 36,4ms |

A tecla em si é barata. O que estoura o orçamento é montar um componente de rótulo editável — com
portal de DOM próprio — nas 500 conexões, quando no máximo uma está em edição. A híbrida devolve a
tecla para dentro da barra **e preserva a edição do rótulo por teclado** (verificado: a troca de tipo
de aresta na conexão em edição não quebra o fluxo).

É exatamente o que o ADR-004 previu ao escrever que "toda capacidade nova que acrescente elementos ao
DOM por nó consome orçamento do envelope" — aqui a capacidade é o rótulo de conexão, e o orçamento
foi consumido inteiro antes de qualquer outra coisa.

### O que deu certo sem ressalva

- **Zero eventos de ponteiro** em 9 elementos criados, rotulados, conectados e com as conexões
  rotuladas. O código mermaid saiu completo na outra vista (`resultados/02-ciclo-8-elementos.png`).
- **O teclado nativo da engine não atropelou o do produto.** Com `a11y=1` — os defaults dela ligados,
  incluindo `Backspace` como tecla de apagar e setas movendo o nó focado — nem a seta moveu o nó
  enquanto o cursor andava no texto, nem o Backspace apagou o elemento. A lib guarda contra tecla
  originada de `input`. O medo de disputa de keymap não se materializou.
- **O modelo continuou sem coordenada.** Nenhum `x`/`y` vazou para a verdade depois de 9 elementos
  nascidos por teclado. A disciplina do ADR-003 sobreviveu ao caminho de entrada novo.
- **Em diagrama vazio a tecla é folgada:** mediana de 14,7ms no texto e 11,4ms no controle.

## Limites conhecidos deste spike

Escrito para não superestimar o veredito:

- **Só Flowchart.** Class, State, ER e Sequence não foram tocados por teclado. Sequence é o suspeito
  óbvio: no desenho do ADR-002 o participante é a coluna inteira e a mensagem é uma aresta ancorada
  num handle por instante — navegar isso por teclado não tem relação com navegar um grafo livre.
- **Só o ciclo principal.** Ficaram de fora, todos do `### Faz` do discovery: seleção múltipla por
  teclado, aplicar uma alteração a uma seleção inteira, repetir a última alteração, trocar tipo/shape,
  desfazer/refazer, e **colar texto de fora para dentro do rótulo** — que é uma das três dores da
  persona e envolve a área de transferência, não o teclado puro.
- **O keymap é do spike, não é proposta de produto.** `n`, `c`, `Enter` foram escolhidos para provar
  que o ciclo fecha. Qual tecla faz o quê, e como isso convive com digitar texto, é decisão de design
  que este spike não toma.
- **Sem editor de código de verdade.** O painel é um `<pre>`. Digitar **no código** — com destaque de
  sintaxe, cursor e seleção — continua sem medição, exatamente como o ADR-004 registrou.
- **Fluxo por teclado ≠ acessibilidade por teclado.** Não houve leitor de tela, nem ordem de tabulação
  revisada, nem composição de IME (que é justamente onde remontar um input durante a digitação
  costuma doer). Este spike mediu o primeiro, não o segundo.
- **Uma máquina, sem GPU.** Os números de latência são desta máquina; o que se lê com confiança é a
  razão entre os braços (3× entre aresta própria e híbrida), não o valor absoluto.
