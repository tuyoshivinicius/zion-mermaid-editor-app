# ADR-009 — Ato em bloco e histórico de edição

- **Status:** Aceito
- **Data:** 2026-07-20
- **Decisores:** Tuyoshi Vinicius
- **Evidência:** docs/adr/spikes/ADR-009-ato-em-bloco-e-historico-de-edicao/ — spike de execução que
  escreve a camada de comando/transação e o histórico que o ADR-003 decidiu por pesquisa e nunca
  rodou, sobre o núcleo do ADR-008 entrando **verbatim** como linha de base, com o **mermaid 11.16.0
  de verdade como oráculo**: depois de cada desfazer, o código que sai do modelo é submetido ao
  `mermaid.parse()` e ao `mermaid.render()`, e a assinatura do SVG é comparada com a de antes do ato.
  174/174 checagens passaram (108 em Node, 66 em Chromium headless) sobre os 30 documentos do corpus
  e o envelope de 400 nós. O veredito vem dos braços de controle, e um deles derruba a premissa do
  próprio spike: o ato em bloco **empata em latência** com N transações separadas, e o histórico
  ingênuo por cópia custa **133×** mais memória que o por diferença.

## Contexto

Esta decisão existe porque o **ADR-003** prometeu por escrito uma propriedade que nunca foi executada,
e três ADRs seguintes registraram o buraco pelo mesmo nome.

O discovery promete o ato em bloco em três linhas do `### Faz`, e as três são a resposta direta à dor
nº 1 da Marina — a quantidade de cliques por elemento: *"trocar o tipo, shape ou estilo de um elemento
já criado — **ou de uma seleção inteira de uma vez**"*, *"repetir a última alteração em outro
elemento, sem refazer o caminho até o controle"* e *"desfazer e refazer ações; **um ato aplicado a uma
seleção inteira desfaz como um só**"*.

O ADR-003 decidiu como isso funcionaria, e decidiu **lendo**: *"desfazer sobre uma seleção inteira é um
ato só, porque é uma transação no modelo"* e *"o editor de código vira produtor de comandos, não dono
de um histórico rival — o que dissolve o conflito clássico entre a pilha de undo do editor de texto e
a do documento"*. É a última promessa daquele ADR sem lastro de execução; o ADR-006 já havia rodado a
outra metade (o ciclo código ↔ modelo) e encontrado lá coisas que a pesquisa não previa.

Os três ADRs de medição registraram a ausência com todas as letras:

- **ADR-004**: *"seleção múltipla, aplicar uma alteração a uma seleção inteira, desfazer/refazer e
  colar um diagrama grande de uma vez ficaram de fora… o custo desse ato em densidade alta não foi
  medido."*
- **ADR-005**: *"ficaram fora, todos do `### Faz`: seleção múltipla por teclado, aplicar uma alteração
  a uma seleção inteira, repetir a última alteração…"*
- **ADR-006**: *"colar diagrama grande, desfazer/refazer e edição sobre seleção múltipla… continuam
  fora."*

O risco é de **execução**: nenhuma leitura diz como *esta* transação, sobre *este* modelo, se comporta
com *esta* densidade — nem quanto o histórico de uma sessão pesa. Só se resolve rodando. E o que
estava em jogo não era um ajuste: se a transação não se sustentasse dentro do envelope do ADR-004, ou
o ato em bloco sairia do release 1 — e com ele a resposta à dor nº 1 —, ou o envelope encolheria.

O spike varreu seleções de 1 a 400 alvos dentro do envelope de 400 nós/500 conexões, contra barras
declaradas **antes** de medir (as do ADR-004: edição pontual ≤100ms na mediana; colar, gesto raro,
≤1s), com cinco variáveis independentes: o lote, a coalescência da digitação, o modo do histórico, a
posição dentro ou fora dele, e o reuso da projeção. Quatro resultados mudam o que está em aberto:

1. **A promessa se confirma, e se confirma exata.** Um ato sobre uma seleção é uma entrada e um
   desfazer, e o desfazer devolve o código **byte a byte** nos 30 documentos das três famílias — com o
   renderer do mermaid como juiz, não a minha comparação.
2. **O ato em bloco não se justifica por latência.** O braço ingênuo — o mesmo ato como N transações —
   **empata** dentro do ruído (71,5ms contra 73,7ms em 400 alvos). O que o lote compra é 1 desfazer em
   vez de 400 e 5 entradas de histórico em vez de 2.000.
3. **Desfazer custa mais que fazer, e no topo do envelope encosta na barra.** Aplicar sobre 400 custa
   73,7ms; desfazer custa 96,2ms com p95 de 107,7ms — e numa rodada anterior a mediana ficou fora
   (102,7ms).
4. **O modo do histórico decide a memória por duas ordens de grandeza.** Mil atos retêm 450 KiB por
   diferença, 1.567 KiB por referência compartilhada e **59.874 KiB** por cópia profunda.

## Decisão

**A transação do ADR-003 fica de pé, e o ato em bloco entra no release 1.** O que este ADR fixa são as
seis condições sob as quais ela se sustenta.

1. **Toda mutação do modelo é uma transação, e a transação é a unidade do desfazer.** Um ato sobre uma
   seleção de N elementos é **uma** entrada no histórico, seja qual for N, e reverte com um só
   desfazer. Isso vale inclusive para o ato que toca dois agregados — remover um nó remove as ligações
   que o citam, e o desfazer devolve os dois nos índices originais.

2. **A justificativa do ato em bloco é a promessa e a memória, não o frame.** Fica registrado, contra a
   intuição: a transação em lote **não é otimização de latência**. Quem for simplificá-la um dia
   precisa saber que o que se perde não é velocidade — é o desfazer único e o tamanho do histórico.

3. **O histórico guarda diferença, não cópia.** Cada entrada registra os campos que mudaram, dos
   elementos que mudaram. A cópia profunda do modelo por entrada fica **fora** do desenho base: custa
   133× em memória e 64× em tempo. A saída por referência compartilhada (3,5× o custo da diferença, e
   muito mais simples de escrever) fica registrada como alternativa legítima para quem implementar,
   não como default.

4. **Uma rajada de digitação é um ato.** O editor de código é produtor de comandos (ADR-003), mas isso
   sozinho não dissolve a pilha rival: sem coalescência, desfazer uma palavra de 12 letras custa 12
   Ctrl+Z. A coalescência é **restrição de arquitetura, não polimento**; a regra de janela é design de
   feature.

5. **O histórico governa as duas metades do estado — modelo e posição.** Manter a posição fora do
   modelo (ADR-003/007) não implica mantê-la fora do histórico. Com ela fora, o Ctrl+Z dado logo depois
   de um arrasto desfaz uma alteração estrutural anterior enquanto o arrasto permanece — a pessoa perde
   o que não pediu para desfazer. É a resposta à pergunta que o ADR-007 deixou aberta ("dá para
   desfazer?"), na metade que é de arquitetura.

6. **O ato sobre a seleção inteira do envelope é o pior caso declarado.** Selecionar ~100 elementos
   ("dezenas de elementos", como o discovery descreve) tem folga de 2× sobre a barra; selecionar os 400
   do envelope não tem — o desfazer fica em cima dos 100ms. O limite é conhecido e comunicado, na mesma
   disciplina da quarta condição do ADR-004.

Descartadas: o histórico por cópia profunda do modelo (condição 3); a digitação como uma entrada por
tecla (condição 4); o histórico só do modelo, com a posição fora (condição 5); e o ato em bloco como
açúcar sobre N transações independentes (condição 1 — que empata em tempo, mas não entrega a promessa
do discovery).

## Consequências

**O que fica mais fácil.**

- **A última promessa do ADR-003 fecha, e fecha com o mermaid como juiz.** Depois do ADR-006 (ciclo
  código ↔ modelo) e do ADR-008 (as três famílias), esta era a peça daquele ADR decidida por pesquisa e
  nunca rodada. As 30 checagens de desfazer conferidas pelo `mermaid.render()` a fecham.
- **Três linhas do `### Faz` saem do "prometido" para o "medido"** — o ato sobre uma seleção inteira, o
  desfazer como um só, e o repetir a última alteração. Esta última nem precisa de mecanismo próprio: o
  histórico já guarda o **valor** do último ato, e repetir é reexecutá-lo noutro alvo.
- **Colar um diagrama grande sai da lista de buracos.** 400 nós de uma vez custam 29,9ms — 33× abaixo da
  barra de 1s, e uma entrada só no histórico. Era item aberto desde o ADR-004.
- **A camada de comando é barata.** 0,3ms de um gesto de 73,7ms. Nada do que este ADR fixa disputa
  orçamento sério com a projeção, que continua sendo onde o tempo mora.

**O que fica mais difícil, e as invariantes que nascem daqui.**

- **A invariante do reuso de objeto agora tem cinco donos.** ADR-004 (latência), ADR-005 (foco),
  ADR-006 (entrada por texto), ADR-008 (as três famílias) e agora a transação — que a preserva por
  compartilhamento estrutural (390 de 400 objetos reusados num ato de 10). Continua sendo o tipo de
  propriedade que uma refatoração inocente derruba sem quebrar teste nenhum, e sem ela o mesmo ato vai
  de 20,2ms para 58,4ms.
- **Duas invariantes novas, da mesma família frágil.** A coalescência da digitação e a presença da
  posição no histórico não quebram teste comum quando somem: o produto continua funcionando, só fica
  irritante de um jeito difícil de nomear. Precisam de teste próprio.
- **O teto do histórico, se existir, é silêncio.** Com limite de 100 entradas e 200 atos, os 100 mais
  antigos ficam fora do alcance do desfazer sem aviso. Quem escolher o teto escolhe esse silêncio
  junto; quem não escolher teto escolhe a memória crescer com a sessão.
- **A barra de 100ms passa dentro do envelope, não fora dele.** É a primeira vez que um gesto do
  discovery fica na fronteira **dentro** do envelope declarado. O ADR-004 mediu 16,8ms de mediana para
  a edição pontual; o desfazer de uma seleção de 400 mede 96,2ms. O envelope continua de pé, mas ele
  agora tem um gesto no limite, e toda capacidade nova que encareça a projeção come dessa margem
  primeiro.

**Limites conhecidos — o que este ADR não decide.**

- **O gesto de selecionar.** Este ADR mede o ato **sobre** uma seleção; selecionar continua não medido —
  por teclado o ADR-005 o deixou de fora explicitamente, e por mouse ninguém mediu em densidade alta.
- **A regra da coalescência.** Que exista é decisão de arquitetura; qual é a janela, e se ela quebra por
  tempo, por posição do cursor ou por tipo de edição, é design que cabe no `spec.md`/`plan.md`.
- **O keymap do desfazer/refazer e do repetir.** Mesmo destino que o keymap do ADR-005.
- **`remover` em Sequence.** O corpo de Sequence é árvore temporal (ADR-008) e tirar um participante
  exigiria varrer blocos aninhados. O ato de dois agregados foi provado em Flowchart e Class; em
  Sequence é estimativa.
- **A sessão intercalada.** Cada cenário aplica um tipo de ato por vez. Uma sessão real intercala
  rotular, mover, colar e desfazer, e o efeito disso sobre a coalescência e sobre o cache da projeção
  não foi medido.
- **A persistência do histórico.** Fechar a aba leva a pilha junto. O que sobrevive ao fechar a aba, e
  se o histórico vai junto, é a decisão do ADR-010.
- **Uma máquina, sem GPU.** Mesmo Ryzen 7 5800H em WSL2 dos ADR-004/005/006/007/008. Lê-se com confiança
  a razão entre os braços (133× de memória, 2,9× do reuso), não o valor absoluto — e foi exatamente a
  margem de ±10ms que fez o desfazer de 400 dar 96,2ms numa rodada e 102,7ms na anterior.
- **Sessão longa.** Os 1.000 atos do braço de memória rodam em 9ms, não em horas. Se o histórico
  degrada, fragmenta o heap ou perde o ponto fixo ao longo de uma sessão de verdade, este spike não vê —
  mesma ressalva dos cinco ADRs anteriores, e é o buraco que o ADR-010 ocupa.

## Status

Aceito em 2026-07-20. As 108 checagens em Node e as 66 de navegador foram rodadas na mesma versão do
código que está no spike dir, e os números citados aqui são os do `resultados/veredito.json` e do
`resultados/historico.json` daquela rodada. Duas correções entraram durante a execução e ficam
registradas: o braço de controle passou a somar — e não sobrescrever — o tempo das N transações (sem
isso ele reportaria 0ms onde reporta 3,8ms), e o desfazer da seleção de 400 foi remedido com nove
amostras em vez de cinco, por cair em cima da barra.
