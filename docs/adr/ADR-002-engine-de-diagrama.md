# ADR-002 — Engine de diagrama

- **Status:** Aceito
- **Data:** 2026-07-19
- **Decisores:** Tuyoshi Vinicius
- **Evidência:** docs/adr/spikes/ADR-002-engine-de-diagrama/ — spike de execução que prova o tipo
  Sequence, o caso extremo do escopo, dentro do vocabulário nó/aresta da lib: renderização e gestos
  de edição executados com mouse real em Chromium headless contra `@xyflow/react` 12.11.2, com o
  veredito lido do modelo interno e não por inspeção visual (6/6). O racional da escolha da engine em
  si — que chegou dada, não aberta — está no Contexto, em "Por que a decisão é dada e não aberta".

## Contexto

O ADR-001 fechou a stack de UI e nomeou explicitamente o buraco que sobrou: "como a área do diagrama
é renderizada … é uma decisão estruturante separada, ainda em aberto, e é ela que carrega esse
risco". Este ADR ocupa esse buraco.

A área do diagrama não é um painel de visualização. Pelo discovery, é onde a sessão da Marina
acontece: criar nós, conexões e agrupamentos direto na tela; selecionar (individual e múltipla);
mover, duplicar, excluir; reconectar uma conexão para outro nó; navegar com zoom e cursor hand;
ajustar à tela. E ela é, ao mesmo tempo, a **prévia** que acompanha o que se digita no editor de
código — porque canvas e código são duas vistas do mesmo modelo interno, não dois artefatos a
reconciliar.

Isso descarta o caminho mais óbvio: renderizar com o próprio `mermaid.js` e sobrepor uma camada de
interação. O SVG que o mermaid produz é **saída de layout**, não estrutura editável — e a posição
dos nós é calculada por ele, sem entrada para a posição que a pessoa arrastou. O discovery trata
posição como conforto de sessão que vive no modelo; um canvas que não pode segurar essa posição não
serve. Editar por ali significaria fazer todo gesto dar a volta pelo código e re-renderizar, o que
inverte a relação entre modelo e vista que a descoberta estabeleceu.

Por que a decisão é **dada e não aberta**: o critério de seleção herda o ADR-001 — desempenho da LLM
na geração de código, não mérito técnico comparado —, e o que fecha a porta é o custo de construção
própria. O que restaria depois de descartar o SVG do mermaid é construir a interação de grafo do zero
sobre canvas ou SVG puro: drag, zoom, pan, handles de conexão, reconexão e seleção múltipla são meses
de trabalho genérico que não são o produto — o produto é o custo unitário de materializar um elemento
cair perto de zero, não uma engine de canvas. React Flow abstrai essa complexidade e é a lib de
canvas com maior densidade de código de treino no ecossistema React. Não há orçamento para provar
alternativa a algo que já se sabe caro.

O que **não** era dado, e por isso foi provado rodando, é a pergunta que a decisão deixa em pé: se o
escopo dos cinco tipos de diagrama cabe nesse vocabulário. A dúvida se concentra no **Sequence**, que
não é grafo livre, e o desfecho de um "não cabe" reescreveria a PRD inteira — Sequence sairia do
escopo, ou a área do diagrama passaria a ter duas engines e o modelo interno deixaria de alimentar
uma vista só. Daí o spike registrado na Evidência.

## Decisão

Adotar **React Flow (`@xyflow/react`)** como engine da área do diagrama.

- **Escolhido:** React Flow (`@xyflow/react`) — nós e arestas como primeiro conceito, nós e arestas
  customizados em React, handles de conexão, reconexão, seleção múltipla, subflows (agrupamento),
  zoom/pan e fit-view nativos.
- **Descartado:** **SVG do próprio `mermaid.js` + camada de interação por cima** — uma vista só e
  fidelidade garantida com o código, mas o SVG é saída de layout e não estrutura editável, e não
  comporta a posição arrastada pela pessoa.

Alternativas não avaliadas: canvas de baixo nível (Konva, PixiJS, SVG + d3 na mão), bibliotecas de
diagrama prontas (JointJS, GoJS, Cytoscape.js) e whiteboards embarcáveis (tldraw, Excalidraw). A
premissa da decisão dada já as exclui — pelo critério de densidade de código de treino, no caso das
libs alternativas, e pelo custo de construção própria, no caso do canvas de baixo nível.

## Consequências

**Fica mais fácil.** O bloco "Área de trabalho" do discovery — zoom, cursor hand, ajustar à tela,
resetar zoom — vem pronto, e boa parte de "Criar e editar elementos" mapeia quase um-a-um em
primitivas da lib: handles para conectar, reconexão de aresta, seleção múltipla, subflow para
agrupamento. Nós e arestas customizados são componentes React, o que mantém a área do diagrama
dentro da mesma stack do resto da UI (ADR-001) e sob o mesmo critério de geração de código.

**Fica mais difícil.** A engine impõe seu vocabulário de nó/aresta a tudo que for desenhado ali, e
cada tipo de diagrama do escopo terá que caber nele — inclusive os que o discovery já marca como
diferentes (nós estruturados em Class e ER; Sequence, que não é grafo livre). O spike mediu esse
"caber" no caso extremo, e o desenho que serve para Sequence é: participante = um nó cuja altura é a
lifeline inteira, mensagem = uma aresta de caminho horizontal, instante do tempo = um handle. Cabe —
e o preço aparece em três lugares:

- **A engine entrega o canvas, não o desenho.** Zoom, pan, arrasto, conexão, reconexão e seleção vêm
  prontos, e criar e reconectar mensagem saíram como gesto nativo da lib. Mas ponta de seta,
  auto-mensagem, barra de ativação e fragmento `alt`/`loop` não são primitivas: são desenho próprio
  por cima.
- **Reordenar no tempo é gesto que a lib não tem.** No vocabulário dela aresta não tem posição, então
  não existe arrastar aresta. E reordenar uma mensagem invalida as faixas de ativação e de fragmento,
  que são índices de tempo que a engine desconhece — o remapeamento é responsabilidade do produto.
- **A camada do nó cobre o diagrama.** A lib pinta os nós acima das arestas e dos rótulos; num grafo
  comum isso é inofensivo, mas no Sequence o nó do participante é a coluna inteira e engole todos os
  gestos sobre mensagem. Contornável, e o contorno está registrado no spike.

**Trade-offs aceitos.**

- **Fluidez não provada.** O ADR-001 delegou a esta decisão a promessa de "diagrama grande continua
  fluido" e de mudança "sem espera perceptível". O spike **não** endereça isso: rodou com 4
  participantes e 7 mensagens. Pior, ele acrescenta motivo de suspeita — ancorar o instante do tempo
  num handle põe `participantes × mensagens` handles no DOM, e é justamente o diagrama denso da
  Marina que multiplica os dois fatores. O risco de performance da descoberta segue sem evidência.
- **Teto da lib.** O que React Flow não faz vira contorção ou fork, e parte dos recursos avançados
  vive no React Flow Pro, que é pago. Uma capacidade da PRD que esbarre nesse teto vira custo não
  previsto.
- **Dependência de detalhe interno da lib.** Fazer Sequence funcionar exigiu mexer na ordem das
  camadas e na especificidade do CSS que a lib publica — que não é API pública. Um upgrade de versão
  pode quebrar a área do diagrama por CSS, sem quebrar nenhuma chamada de código.
- **Modelo interno acoplado — não se materializou neste recorte.** O discovery põe o modelo interno
  no centro, como fonte única que alimenta canvas e código, e o risco era esse modelo colar no formato
  de nós/arestas da lib. No spike o modelo se manteve **sem coordenada** — tempo é ordem, coluna é
  ordem —, com (x, y) existindo só na derivação para a vista, e sobreviveu a quatro gestos de edição
  sem que a engine virasse fonte da verdade. O risco continua de pé como disciplina a manter, não
  como fatalidade da engine.

**Limite conhecido — o que este ADR não decide.**

- **Layout automático.** React Flow não calcula layout; posiciona o que recebe. O discovery promete
  que "o layout automático dá o ponto de partida" e que o código entregue não leva posição, ficando
  a cargo do motor de layout do mermaid. Qual motor roda no canvas e quanta divergência é tolerável
  entre o que a Marina vê e o que o destinatário do código vê é decisão separada, ainda aberta.
- **Forma do modelo interno.** Este ADR escolhe a engine da vista, não a estrutura da verdade nem
  como ela propaga para canvas e código. O spike mostra que dá para manter a verdade sem coordenada,
  mas não decide qual é essa estrutura — o trade-off do acoplamento acima só se resolve ali.
- **Ida e volta com o código mermaid.** O spike parou na vista: não gerou `sequenceDiagram` a partir
  do modelo nem leu texto de volta. Provar que "canvas e código são duas vistas da mesma verdade"
  depende da forma do modelo interno, ainda em aberto.
- **Vocabulário completo de Sequence e fluxo por teclado.** O spike cobriu `loop` e `alt`; ficaram de
  fora `par`, `critical`, `break`, `note`, criação/destruição de participante e numeração automática.
  E todos os gestos foram testados com mouse — o teclado, que o discovery chama de inegociável no
  ciclo principal, não foi tocado.

## Status

Proposto → **Aceito**.
