# Spike ADR-009 — a transação do ADR-003 sustenta o ato em bloco, e a que custo?

Evidência de execução do [ADR-009 — Ato em bloco e histórico de edição](../../ADR-009-ato-em-bloco-e-historico-de-edicao.md).
Código descartável: existe para produzir um veredito, não para virar base do produto.

## A pergunta

O discovery promete o ato em bloco em três linhas do `### Faz` — *"trocar o tipo, shape ou estilo de
um elemento já criado — **ou de uma seleção inteira de uma vez**"*, *"repetir a última alteração em
outro elemento, sem refazer o caminho até o controle"* e *"desfazer e refazer ações; **um ato
aplicado a uma seleção inteira desfaz como um só**"*. É a resposta direta à dor nº 1 da Marina, a
quantidade de cliques por elemento.

O **ADR-003** decidiu como isso funcionaria — e decidiu **por pesquisa**, sem rodar:

> *"Desfazer sobre uma seleção inteira é um ato só, porque é uma transação no modelo. O editor de
> código vira **produtor de comandos**, não dono de um histórico rival — o que dissolve o conflito
> clássico entre a pilha de undo do editor de texto e a do documento."*

Três ADRs depois registraram por escrito que ninguém tinha medido:

- **ADR-004**: *"Seleção múltipla, aplicar uma alteração a uma seleção inteira, desfazer/refazer e
  colar um diagrama grande de uma vez ficaram de fora… o discovery promete que o ato sobre uma
  seleção inteira desfaz como um só — o custo desse ato em densidade alta não foi medido."*
- **ADR-005**: *"Ficaram fora, todos do `### Faz`: seleção múltipla por teclado, aplicar uma alteração
  a uma seleção inteira, repetir a última alteração…"*
- **ADR-006**: *"Colar diagrama grande, desfazer/refazer e edição sobre seleção múltipla… são os
  mesmos gestos que o ADR-004 deixou de fora, e continuam fora."*

A pergunta que só se resolve rodando:

> A transação do ADR-003 sustenta o ato sobre uma seleção inteira **dentro do envelope do ADR-004**
> (400 nós / 500 conexões) — e quanto custa guardar o histórico de uma sessão inteira?

O desfecho não seria um ajuste. Se a transação não se sustentasse, ou o ato em bloco sairia do
release 1 (e com ele a resposta à dor nº 1), ou o envelope do ADR-004 encolheria — nos dois casos a
PRD, os RF de edição e a ordem de release são outros.

## O que foi rodado

`mermaid` **11.16.0** como oráculo · `@xyflow/react` 12.11.2 · React 18 · Vite 5 · Chromium headless
via Playwright (`--expose-gc --enable-precise-memory-info`) · 1440×900 · Linux WSL2, AMD Ryzen 7
5800H, 8 vCPU, sem GPU.

```
npm install
npm run historico   # 108 checagens em Node — as propriedades da transação
npm run build
npm run verify      #  66 checagens no navegador — latência, oráculo mermaid e heap
```

**O núcleo do ADR-008 entra como linha de base, sem retoque.** `src/nucleo/`, `src/tipos/` (as três
famílias), `src/registro.js`, `src/medir.js` e o corpus de 30 documentos são cópia byte a byte. Duas
peças são novas e uma mudou:

- `src/comandos.js` (**novo**) — a camada de comando/transação e o histórico com três modos.
- `src/App.jsx` (**novo**) — o modelo passa a ser a fonte, e o editor de código vira produtor de
  comandos. No ADR-008 o texto era a fonte e o modelo, derivado; a frase do ADR-003 sob teste exige a
  inversão.
- `src/projecao.js` (**um argumento a mais**) — a sobreposição de posição do ADR-007, dentro da chave
  do cache. O diff é esse e só esse.

Barras declaradas **antes** de medir, herdadas do ADR-004 (Nielsen/RAIL): **edição pontual ≤ 100ms na
mediana**, **tecla ≤ 50ms**, e **colar ≤ 1s** (gesto raro, "fluxo de pensamento").

Braços de controle: `lote=0` (o mesmo ato como N transações), `coalescer=0` (uma entrada por tecla),
`historico=clone` e `historico=referencia` (contra `inverso`), `posicaoNoHistorico=0` (a posição fora
do histórico) e `memo=0` (a projeção sem reuso, do ADR-004).

## Veredito: **a transação se sustenta; o que não se sustenta é desfazê-la no topo do envelope**

**174/174 checagens passaram** (108 em Node, 66 no navegador). O placar não é o achado — e um dos
achados vai contra o que o spike foi escrito esperando.

| Verificação | Resultado |
|---|---|
| Um ato sobre uma seleção, uma entrada no histórico, um desfazer (30 documentos, 3 famílias) | 30/30 |
| O desfazer devolve o código **byte a byte** | 30/30 |
| `mermaid.parse()` aceita e `mermaid.render()` desenha o mesmo diagrama depois do desfazer | 30/30 |
| Ato em bloco sobre 100 de 400 nós, dentro da barra de 100ms | 44,1ms |
| Ato em bloco sobre **400 de 400** | 73,7ms |
| **Desfazer** o ato sobre 400 de 400 | **96,2ms · p95 107,7ms** |
| Colar 400 nós de uma vez (barra de 1s) | 29,9ms |
| Histórico de 1.000 atos, modo `inverso` | **450 KiB** |
| Histórico de 1.000 atos, modo `clone` (**controle**) | **59.874 KiB** |

### Achado 1 — a promessa do ADR-003 se confirma, e se confirma exata

Não "aproximadamente igual": **byte a byte**. Nos 30 documentos do corpus, aplicar um rótulo a uma
seleção e desfazer devolve o mesmo texto que existia antes, e o **mermaid de verdade** desenha o mesmo
diagrama — a assinatura do SVG (quais nós, quantas ligações, quais rótulos) é idêntica. O juiz não é
a minha função de comparação; é o renderer.

Isso vale para as três famílias, inclusive Sequence, onde o ADR-008 mostrou que a ordem do agregado é
**condição de validade** e não ruído. Um desfazer que reordenasse produziria documento que o mermaid
recusa; nenhum reordenou.

E vale para o ato que toca **dois agregados**: remover um nó tira também as ligações que o citam, e um
desfazer devolve os dois — nós e ligações — **nos índices originais**. Se a transação valesse só para
um agregado, é aqui que ela vazaria.

### Achado 2 — o ato em bloco **não se justifica por latência**, e isso corrige a intuição

O braço de controle `lote=0` aplica a mesma alteração como N transações independentes. A expectativa
escrita antes de medir era que ele fosse claramente mais lento. **Não é:**

| Alvos (envelope 400/500) | em lote | **controle** N transações | entradas no histórico após 5 atos |
|---|---|---|---|
| 10 | 24,3ms | 25,0ms | 5 · **50** |
| 50 | 34,1ms | 30,7ms | 5 · **250** |
| 100 | 44,1ms | 35,7ms | 5 · **500** |
| 400 | 73,7ms | 71,5ms | 5 · **2.000** |

A camada de transação custa `0,3ms` em lote e `3,8ms` nas 400 transações separadas — **12× mais, e
invisível**, porque os dois braços pagam a mesma projeção e o mesmo render, que é onde os ~70ms moram.
Dentro do ruído de ±10ms da máquina (a mesma ressalva do ADR-004), os dois empatam.

O ato em bloco **não é uma otimização**. O que ele compra está nas outras duas colunas: a pessoa dá
**1 desfazer em vez de 400**, e o histórico guarda **5 entradas em vez de 2.000**. A justificativa é a
promessa do discovery e a memória da sessão — não o frame. Registrar isso importa porque a
justificativa errada leva à decisão errada quando alguém propuser "simplificar" a transação depois.

### Achado 3 — desfazer custa mais que fazer, e no topo do envelope encosta na barra

A assimetria não estava prevista:

| Seleção | aplicar | desfazer | refazer |
|---|---|---|---|
| 10 | 24,3ms | 46,5ms | 43,6ms |
| 100 | 44,1ms | 65,8ms | 65,7ms |
| **400** | **73,7ms** | **96,2ms** (p95 **107,7**) | 94,9ms (p95 105,9) |

O desfazer da seleção inteira fica **em cima** da barra de 100ms: a mediana passou (96,2ms) com p95
fora, e numa rodada anterior a própria mediana ficou fora (102,7ms). Foi remedido com nove amostras
em vez de cinco justamente por cair ali. O tempo não está no histórico — restaurar os campos custa
`0,1ms`. Está na projeção e no render dos 400 nós que voltam a mudar de rótulo de uma vez.

A leitura honesta: **o ato sobre a seleção inteira do envelope é o pior caso do produto, e ele vive na
fronteira da barra**. Selecionar 100 (o que a Marina descreve como "dezenas de elementos") tem folga
de 2×; selecionar os 400 não tem.

### Achado 4 — o modo do histórico decide a memória, e a diferença é de duas ordens de grandeza

Mil atos sobre o documento do envelope (100 KiB de modelo), pesados no heap do Chromium com `gc()`
forçado antes e depois:

| Modo | retido no heap | por ato | 1.000 atos em |
|---|---|---|---|
| `inverso` — só o que mudou | **450 KiB** | 461 bytes | 9ms |
| `referencia` — o estado anterior inteiro, compartilhado | 1.567 KiB | 1.605 bytes | 9ms |
| `clone` — cópia profunda (**controle**) | **59.874 KiB** | 61.321 bytes | 577ms |

O `clone` é o desenho ingênuo — e custa **133×** o `inverso` em memória e **64×** em tempo. Mil atos
não é uma sessão longa: é uma tarde curta. A conta lógica em Node bate com a do heap e é ainda mais
brutal na escala (101.927 bytes por ato contra 45), porque ali o clone materializa o documento inteiro
sem nenhum compartilhamento.

O `referencia` merece registro à parte: como as transações são **imutáveis com compartilhamento
estrutural**, guardar a referência do estado anterior retém só o delta — 3,5× o `inverso`, não 133×.
É uma saída legítima e muito mais simples de escrever; o preço é que ela retém a *lista* de nós
inteira por entrada (400 ponteiros), enquanto o `inverso` retém só os campos tocados.

### Achado 5 — a pilha rival não é dissolvida pelo modelo único; é dissolvida pela coalescência

O ADR-003 disse que o editor de código como produtor de comandos "dissolve o conflito clássico entre a
pilha de undo do editor de texto e a do documento". Meio certo. Com o modelo como fonte única, a pilha
é **uma** — mas se cada tecla vira uma entrada, a pessoa aperta Ctrl+Z doze vezes para desfazer uma
palavra, que é exatamente a experiência que a pilha rival produzia:

| Digitar `documentacao` (12 teclas) | entradas | Ctrl+Z para voltar |
|---|---|---|
| com coalescência (rajada ≤500ms) | **1** | **1** |
| **controle** `coalescer=0` | 12 | 12 |

E a guarda: a rajada **não engole o ato anterior**. Um ato em bloco seguido de cinco teclas produz
duas entradas, e o primeiro Ctrl+Z para no fim do ato — não atropela o que veio antes.

### Achado 6 — o Ctrl+Z depois de arrastar: a pergunta do ADR-007, com os dois desfechos medidos

O ADR-007 deixou por escrito, sobre o gesto de organizar: *"a câmera acompanha? dá para desfazer? o
que acontece com as posições manuais…"* — e rebaixou a resposta ao `spec.md`. Ela não cabe lá inteira,
porque a metade estrutural é de arquitetura: **o histórico governa uma coisa ou duas?**

Os dois braços, sobre a sequência `rotular A · rotular B · arrastar A`, com um Ctrl+Z em seguida:

| | entradas para 3 atos | o que o Ctrl+Z faz |
|---|---|---|
| histórico único (modelo + posição) | 3 | desfaz **o arrasto**; os rótulos ficam |
| **controle** só o modelo | 2 | o arrasto **continua onde a pessoa soltou** e o **rótulo de B volta** |

A linha do controle é a que decide: a pessoa arrasta uma caixa, se arrepende, aperta Ctrl+Z — e perde
uma alteração de rótulo que não pediu para desfazer, enquanto o arrasto fica. É a definição de
surpresa. Manter a posição fora do modelo (ADR-003/007) **não implica** mantê-la fora do histórico, e
este spike separa as duas coisas.

### Achado 7 — o reuso de objeto sobrevive à transação, e continua sendo o que decide

A invariante que o ADR-004 fixou por latência, o ADR-005 por foco, o ADR-006 pela entrada por texto e o
ADR-008 pelas três famílias agora tem um quinto dono — e o mais fácil de quebrar sem ninguém ver,
porque bastaria a transação remontar a lista inteira. Contado por identidade de objeto:

| Ato sobre | objetos de nó reusados (de 400) |
|---|---|
| 1 nó | 399 |
| 10 nós | 390 |
| 100 nós | 300 |

E o controle `memo=0` continua movendo o veredito: o mesmo ato de 10 alvos custa **20,2ms** com reuso
e **58,4ms** sem — 2,9×, a mesma ordem que os ADR-004/006/008 mediram.

### Achado 8 — "repetir a última alteração" sai de graça do histórico

A linha do discovery — *"repetir a última alteração em outro elemento, sem refazer o caminho até o
controle"* — não precisa de mecanismo próprio: o histórico já guarda o **valor** do último ato, e
repetir é reexecutá-lo noutra seleção. Trocar a forma de A para losango e repetir em B e C produz duas
entradas, e um desfazer tira só o repetido. Não é uma capacidade a construir; é uma consequência de o
comando guardar o valor em vez do caminho até o controle.

### Achado 9 — histórico com teto se comporta, mas o que passa do teto some para sempre

Com `limite=100` e 200 atos, a pilha para em 100, o desfazer anda 100 vezes e o modelo continua íntegro
(o código serializa e é válido). O que o teto custa está dito: os 100 atos mais antigos ficam **fora do
alcance** do desfazer, sem aviso. Medido, não resolvido — quem escolher o teto escolhe esse silêncio
junto.

## Limites conhecidos deste spike

Escrito para não superestimar o veredito:

- **A seleção é sintética.** Os alvos são "os N primeiros nós do modelo", não uma seleção feita com
  mouse ou teclado no canvas. O gesto de *selecionar* — que o ADR-005 deixou fora por teclado e o
  ADR-004 não mediu — continua não medido. Este spike mede o **ato sobre** a seleção, não o ato de
  selecionar.
- **Um ato por vez, sem intercalar.** Cada cenário aplica o mesmo tipo de ato repetidamente. Uma
  sessão real intercala rotular, mover, colar e desfazer, e o efeito disso sobre a coalescência e
  sobre o cache da projeção não foi medido.
- **A coalescência é por tempo, não por intenção.** A janela de 500ms é uma escolha do spike. Digitar
  devagar produz mais entradas; digitar rápido em dois lugares diferentes do documento produz uma só.
  Qual é a regra certa é design de feature — o que o spike fixa é que **alguma** regra é necessária.
- **`remover` não foi escrito para Sequence.** O corpo de Sequence é uma árvore temporal (ADR-008), e
  tirar um participante exigiria varrer os blocos aninhados. O ato de dois agregados foi provado em
  Flowchart e Class; em Sequence ele é estimativa.
- **O histórico não persiste.** Fechar a aba leva a pilha junto. O que sobrevive ao fechar a aba é
  assunto do ADR-010, e a interação entre as duas coisas — rascunho salvo com histórico ou sem — não
  foi medida aqui.
- **Uma máquina, sem GPU.** Mesmo Ryzen 7 5800H em WSL2 dos ADR-004/005/006/007/008. Lê-se com
  confiança a **razão** entre os braços (133× de memória, 2,9× do reuso), não o valor absoluto: cada
  rodada anda ±10ms, e foi exatamente essa margem que fez o desfazer de 400 dar 96,2ms numa rodada e
  102,7ms na anterior. Os números acima são os do `resultados/veredito.json` deste repositório.
- **Sessão longa.** Cada cenário dura segundos; os 1.000 atos do braço de memória rodam em 9ms, não em
  horas. Se o histórico degrada, fragmenta o heap ou perde o ponto fixo ao longo de uma sessão de
  verdade, este spike não vê — mesma ressalva dos cinco ADRs anteriores, e é o buraco que o ADR-010
  vai ocupar.
