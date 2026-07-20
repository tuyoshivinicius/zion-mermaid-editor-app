# ADR-005 — Fluxo por teclado no ciclo principal

- **Status:** Aceito
- **Data:** 2026-07-20
- **Decisores:** Tuyoshi Vinicius
- **Evidência:** docs/adr/spikes/ADR-005-fluxo-por-teclado/ — spike de execução que dirige o ciclo
  principal (criar caixa → rotular → conectar → rotular a conexão) só com eventos de teclado, contra
  `@xyflow/react` 12.11.2 em Chromium headless. O veredito é lido do modelo interno, e a afirmação
  "sem mouse" é sustentada por um contador de eventos de ponteiro que terminou em **0** depois de 9
  elementos criados, rotulados e conectados. 13/16 verificações passaram; as três que falharam são os
  achados, e cada uma tem o contorno medido no mesmo spike.

## Contexto

Esta decisão existe porque o discovery chama o teclado de **inegociável** e nenhum spike o havia
tocado.

O discovery dá ao teclado um bloco próprio no `### Faz` — *"executar o ciclo principal — criar caixa →
rotular → conectar → rotular a conexão — de ponta a ponta, sem alternar para o mouse"* — e, na
*Estrutura do produto*, desempata: *"dentro do ciclo principal a alternância entre teclado e mouse
pesa mais que a quantidade de cliques, e o teclado é inegociável"*. É uma das três dores que definem
Marina, e a promessa de experiência depende dela: *"ela não sente a troca entre teclado e mouse no
ciclo principal"*.

O rastro do buraco está escrito nos ADRs anteriores:

- O **ADR-002** provou a engine com Sequence e fechou registrando: *"todos os gestos foram testados
  com mouse — o teclado, que o discovery chama de inegociável no ciclo principal, não foi tocado"*.
- O **ADR-004** mediu a fluidez e repetiu o mesmo limite: *"fluxo por teclado segue intocado desde o
  ADR-002 … o discovery chama o teclado de inegociável no ciclo principal, e ele continua sem
  evidência de nenhum tipo"*.

O risco é de **execução**: nenhuma documentação diz se *este* desenho — modelo próprio como fonte,
projetado para nós/arestas da engine — sustenta o ciclo sem mouse. React Flow é uma biblioteca de
canvas cujas primitivas de conexão são gestos de ponteiro; se o ciclo por teclado não fechasse ali, o
desfecho não seria um ajuste. Ou o ADR-002 cairia (a área do diagrama precisaria de camada de input
própria, ou de outra engine), ou o bloco "Fluxo por teclado" sairia do `### Faz` — e com ele a
promessa central do produto. Nos dois casos a PRD é outra.

O spike dirigiu o ciclo inteiro por teclado em três frentes: os quatro passos isolados, o ciclo
repetido oito vezes, e o ciclo dentro do envelope de densidade que o ADR-004 fixou (400 nós / 500
conexões). Rodou também três braços de controle — o teclado nativo da engine ligado, a projeção sem
reuso de objeto, e três desenhos de aresta.

Quatro resultados mudam o que está em aberto:

1. **O ciclo fecha sem um único evento de ponteiro.** Nove elementos criados, rotulados, conectados e
   com as conexões rotuladas, ao custo de 4 teclas de controle por elemento, com o código mermaid
   saindo completo na outra vista.
2. **A disputa de keymap não se materializou.** Com os defaults de teclado da engine ligados, seta
   dentro de um rótulo em edição não moveu o nó e `Backspace` não apagou o elemento: a lib guarda
   contra tecla originada de `input`. Era o medo mais óbvio, e não se confirmou.
3. **Nada do ciclo é gesto da engine.** No spike do ADR-002, criar e reconectar mensagem **eram** da
   lib (`onConnectStart → onConnect → onConnectEnd`), porque o gesto era arrastar entre handles. Por
   teclado, nenhum callback de conexão disparou — os handles não participam do caminho.
4. **Duas propriedades do desenho passaram de otimização a condição.** Sem reuso do objeto projetado,
   a aresta em edição é **remontada** a cada tecla e o rótulo congela na primeira letra; e um rótulo
   editável montado em todas as conexões estoura sozinho o orçamento de tecla dentro do envelope
   (83,5ms contra a barra de 50ms).

## Decisão

**O ciclo principal por teclado se sustenta sobre a engine e o modelo já escolhidos; ADR-002 e
ADR-003 ficam de pé.** O que este ADR fixa são as quatro condições sob as quais ele se sustenta.

1. **O ciclo por teclado é máquina de estados do produto, e o foco do DOM é responsabilidade do
   produto.** A engine não contribui com nenhuma primitiva do caminho: não move foco, não conecta por
   teclado, não sabe onde a pessoa está no ciclo. Toda feature que crie um elemento por teclado
   assume junto o dever de colocar o foco onde a próxima tecla é esperada.

2. **A projeção reusa o objeto projetado — de nós *e de arestas* — quando nada que a vista enxerga
   mudou.** É a mesma invariante do ADR-004, estendida às arestas e promovida de **restrição de
   latência** a **condição de correção**: sem ela o fluxo por teclado não funciona, não apenas fica
   lento. O contorno de recuperar o foco depois da remontagem foi testado e não resolve.

3. **Componente de edição existe só no elemento que está em edição.** Concretamente: a conexão em
   edição usa o desenho próprio com rótulo editável; as demais usam o desenho leve. Foi o que devolveu
   a tecla para dentro da barra (83,5ms → 28,8ms) sem perder a edição por teclado. A regra generaliza
   para qualquer controle de edição que venha a ser pendurado por elemento.

4. **A câmera acompanha o elemento que o teclado acabou de criar.** A engine posiciona o que recebe e
   não traz nada para a tela; sem isso, elemento nasce fora da vista e a pessoa digita às cegas — o
   spike pegou 1 em 8 nascendo assim. Com o produto centralizando a cada troca de foco, 8 em 8.

**Descartado — camada de input própria ou outra engine para o ciclo por teclado.** Era o desfecho a
temer, e o spike o tornou desnecessário: as quatro condições acima são código de produto sobre a
engine, não contorno contra ela.

**Descartado — rebaixar o teclado a atalhos parciais**, com o ciclo completando no mouse. O discovery
não deixa: dentro do ciclo principal o teclado é inegociável, e a alternância é a dor.

## Consequências

**Fica mais fácil.**

- **O último risco pendurado desde o ADR-002 fecha.** A promessa de que Marina "não sente a troca
  entre teclado e mouse no ciclo principal" deixa de ser esperança: o ciclo foi executado ponta a
  ponta com zero eventos de ponteiro.
- **A PRD ganha um NFR binário e verificável** — o ciclo principal completa sem nenhum evento de
  ponteiro —, além de herdar a barra de tecla do ADR-004 (≤50ms de mediana dentro do envelope). É a
  forma que a `constitution` do Spec Kit consegue derivar em princípio decidível.
- **O medo de brigar com a engine por teclas some.** A lib já protege o que vem de campo de texto, o
  que libera o keymap do produto para ser decidido por design, e não por sobras.

**Fica mais difícil.**

- **O foco vira estado de primeira classe, e ele corre atrás da engine.** A engine monta o nó num
  commit posterior ao da mudança do modelo, então existe uma janela — medida em 2 frames — em que a
  máquina de estados já diz "editando" e o campo ainda não existe. Tecla digitada nessa janela cai no
  vazio. Todo ponto do produto que cria elemento por teclado herda esse problema.
- **A invariante da projeção passa a ter duas razões e nenhuma delas é visível em teste comum.**
  Quebrá-la já custava latência em densidade alta (ADR-004); agora quebra o fluxo por teclado nas
  arestas. Continua sendo o tipo de propriedade que uma refatoração inocente derruba sem quebrar
  teste nenhum, e agora com consequência funcional.
- **Cada controle de edição pendurado por elemento tem que provar que não está montado onde não é
  usado.** O rótulo de conexão sozinho consumiu o orçamento inteiro da tecla no envelope.
- **A câmera vira decisão de produto recorrente.** "Acompanhar o foco" tem semântica — centralizar,
  aproximar pela borda, não mexer se já está visível — e cada resposta muda a sensação de uso.

**Trade-offs aceitos.**

- **Só Flowchart foi dirigido por teclado.** Class, State, ER e Sequence não. Sequence é o suspeito
  declarado: no desenho do ADR-002 o participante é a coluna inteira e a mensagem é uma aresta
  ancorada num handle por instante — navegar isso por teclado não tem relação com navegar um grafo
  livre. O ADR é aceito sabendo que esse caso pode exigir vocabulário próprio.
- **Só o ciclo principal.** Ficaram fora, todos do `### Faz`: seleção múltipla por teclado, aplicar
  uma alteração a uma seleção inteira, repetir a última alteração, trocar tipo/shape, desfazer/refazer
  e **colar texto de fora para dentro do rótulo** — que é uma das três dores da persona e depende da
  área de transferência, não do teclado puro.
- **A janela de 2 frames não foi resolvida, só medida.** Nada no spike bufferiza a tecla digitada
  antes de o campo existir. Numa pessoa que digita rápido — a persona, por definição — a primeira
  letra do rótulo pode se perder.
- **Fluxo por teclado não é acessibilidade por teclado.** Não houve leitor de tela, ordem de tabulação
  revisada nem composição de IME — e IME é exatamente onde remontar um campo durante a digitação
  costuma doer. Se acessibilidade entrar na PRD, é outra decisão, com outra evidência.
- **Uma máquina, sem GPU.** Os números de latência são do mesmo Ryzen 7 5800H em WSL2 do ADR-004. O
  que se lê com confiança é a razão entre os braços (3× entre o desenho ingênuo e o híbrido), não o
  valor absoluto.

**Limites conhecidos — o que este ADR não decide.**

- **O keymap.** `n`, `c` e `Enter` foram escolhas do spike para provar que o ciclo fecha. Qual tecla
  faz o quê, e como isso convive com digitar texto, é decisão de design que cabe no `spec.md`/
  `plan.md` da feature.
- **Motor de layout automático.** Segue aberto desde o ADR-002. Este ADR o toca por tabela: a
  frequência com que um elemento nasce fora da vista depende de como o layout espalha os elementos, e
  a grade fixa do spike é o caso mais fácil.
- **Digitar no editor de código.** O painel do spike é um `<pre>`. O caminho texto → modelo continua
  sem medição, exatamente como o ADR-004 registrou.
- **Sessão longa.** Cada cenário do spike dura segundos. Se o foco degrada, vaza ou se perde ao longo
  de uma sessão de horas, este spike não vê.

## Status

Proposto → **Aceito**.
