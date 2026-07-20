# ADR-008 — Alcance do modelo interno além do Flowchart

- **Status:** Aceito
- **Data:** 2026-07-20
- **Decisores:** Tuyoshi Vinicius
- **Evidência:** docs/adr/spikes/ADR-008-alcance-do-modelo-alem-do-flowchart/ — spike de execução que
  escreve o par parser/serializador de **Class** e **Sequence** sobre o mesmo núcleo, com o Flowchart do
  ADR-006 entrando **verbatim** como linha de base e o **mermaid 11.16.0 de verdade como oráculo**:
  o código que sai de cada modelo é submetido ao `mermaid.parse()` e ao `mermaid.render()`, e a
  permutação de cada agregado é julgada pelo desenho que o renderer produz. 397/397 checagens passaram
  (237 em Node, 160 em Chromium headless) sobre 30 documentos, dez por família. O veredito vem dos
  braços de controle: o custo por família **cai** em vez de subir (631 e 482 linhas contra as 726 do
  Flowchart), e permutar o agregado é ruído em Flowchart e Class mas **invalida o documento** em
  Sequence.

## Contexto

Esta decisão existe porque o **ADR-003** decidiu um modelo de domínio único para os cinco tipos, o
**ADR-006** o provou rodando **só para Flowchart**, e o ponto de retorno ficou escrito com todas as
letras: *"um spike de calibragem escrevendo o par parser/serializador de um tipo não-Flowchart (Class
ou ER) foi considerado e adiado; se a estimativa do primeiro incremento estourar, é aqui que se
volta."*

Os outros ADRs registraram o mesmo buraco, cada um do seu lado:

- O **ADR-004**: *"Class, State e ER. Só Flowchart e um Sequence simplificado foram medidos… 'deve' não
  é 'foi medido'."*
- O **ADR-005**: *"Só Flowchart foi dirigido por teclado. Sequence é o suspeito declarado."*
- O **ADR-006** deu unidade ao custo desconhecido: *"cada tipo de diagrama novo custa um par
  parser/serializador inteiro — **717 linhas** para o tipo mais simples."*

O que o discovery pendura nesse braço é o escopo inteiro. Ele congela cinco tipos no `### Faz` —
*"escolher e trocar o tipo de diagrama entre Flowchart, Class, State, Sequence e ER"* — e ordena o
avanço por **família de modelo mental**: grafo dirigido (Flowchart e State) é o núcleo, nós
estruturados (Class e ER) vêm em seguida, e Sequence é o último *"por ser uma sequência temporal de
mensagens entre participantes e não um grafo livre — precisa de vocabulário de interação próprio"*.

O risco é de **execução**. Nenhuma documentação de terceiro diz como *este* desenho — modelo próprio,
lossless, sem coordenada, com duas listas de severidade — se comporta com um nó que tem corpo e com um
diagrama que não é grafo. O ADR-006 estabeleceu o custo unitário escrevendo código, não lendo; a
extrapolação para os outros quatro era a hipótese a derrubar.

E o desfecho não seria um ajuste. Se o modelo não generalizasse, ou o escopo encolheria abaixo dos
cinco tipos, ou o produto passaria a ter um modelo por família — e nos dois casos a PRD, o fatiamento
e a ordem de release seriam outros.

## Decisão

**O modelo interno é um núcleo comum mais um vocabulário de agregados por família — não uma forma
única para os cinco tipos, nem um modelo separado por tipo. O escopo dos cinco tipos fica de pé.**

Em cinco compromissos decidíveis, cada um provado no spike:

1. **O núcleo é o que as três famílias compartilham sem exceção**, e ele não é pequeno: preâmbulo
   preservado (frontmatter, `%%{init}%%`, comentários), as duas listas de severidade do ADR-006
   (`erros` derruba o statement, `avisos` sinaliza sem derrubar), tolerância por construção,
   serializador normalizador com ponto fixo, ausência de coordenada e a marca de expressividade como
   propriedade do modelo. São **460 linhas**, reusadas **sem alteração** pelas três famílias.

2. **A normalização é da família, não do núcleo.** Cada família declara o que nela é ruído de ordem e
   o que é semântica. Não é preferência de desenho: é o renderer do mermaid que decide. Permutar o
   agregado mantém o **significado igual** em Flowchart e Class; em Sequence muda o significado, e no
   documento com ativação produz texto que o mermaid **recusa** — *"Trying to inactivate an inactive
   participant"*. Ordem em Sequence não é arranjo, é gramática.

3. **O vocabulário de agregados é por família**, porque nem o nó nem o grupo são a mesma coisa nas
   três. Em Class o nó tem **corpo** — `membros` ordenados, cada um com visibilidade, tipo e
   classificador —, onde o Flowchart tem `rotulo: string`. Em Sequence o bloco (`loop`/`alt`/`opt`) é
   um **intervalo da sequência** com vários ramos, onde o `subgraph` do Flowchart é um conjunto de ids.
   A verdade de Sequence é uma árvore temporal, com a lista plana de eventos **derivada** e não
   guardada — mesma disciplina que o ADR-003 aplicou à posição.

4. **O codec de rótulo tem duas molduras.** Rótulo entre aspas (Flowchart) e rótulo que corre até o fim
   da linha (rótulo de relação em Class, texto de mensagem e de nota em Sequence) exigem pares de
   escape diferentes: escapar `#` ou `<` na fenda sem aspas mudaria o que aparece na tela, e **não**
   escapar perderia um `<br/>` que a pessoa digitou. O espaço nas bordas sai como entidade `#32;`,
   porque a linha do código é aparada antes do statement ser lido. A marca de expressividade continua
   sendo propriedade do modelo, não da direção por onde o texto entrou.

5. **O envelope do ADR-004 e a invariante de reuso valem para as três famílias.** No envelope de 400
   nós / 500 conexões a tecla no editor custa 21,7ms (Flowchart), 27,4ms (Class) e 14,3ms (Sequence),
   todas dentro da barra de 50ms; sem o reuso do objeto projetado, as três estouram (65,9 · 118,3 ·
   109,7ms).

**Descartado: uma forma única de modelo para os cinco tipos.** Cai no compromisso 2. Um `normalizar`
só no núcleo ordenaria os agregados — o que está certo em Flowchart e Class e destrói o diagrama em
Sequence.

**Descartado: um modelo separado por família.** Desperdiça as 460 linhas de núcleo que as três reusam
sem alteração, e jogaria fora a superfície única (`analisar`/`serializar`/`normalizar`) que o spike
exercitou: canvas e editor de código operaram os 30 documentos sem saber de que tipo era cada um.

**Descartado: encolher o escopo abaixo dos cinco tipos.** Era o desfecho a temer, e o custo medido o
tornou desnecessário — ver o próximo ponto.

## Consequências

**Fica mais fácil.**

- **O ponto de retorno do ADR-003 fecha, e fecha com o número andando ao contrário do esperado.** O
  medo registrado no ADR-006 — *"cada tipo de diagrama novo custa um par parser/serializador inteiro"*
  — se confirma na forma, mas os dois tipos "difíceis" custaram **menos** que o "mais simples":

  | | modelo | parser | serializar | total | contra o Flowchart |
  |---|---|---|---|---|---|
  | núcleo (compartilhado) | — | — | — | **460** | reusado sem alteração pelas três |
  | Flowchart (ADR-006, verbatim) | 126 | 485 | 115 | **726** | linha de base |
  | Class | 118 | 401 | 112 | **631** | **87%** |
  | Sequence | 144 | 270 | 68 | **482** | **66%** |

  As **726** do Flowchart não contradizem as **717** que o ADR-006 registrou: são cestas diferentes.
  Lá a conta era parser + serializador + **codec**; aqui é modelo + parser + serializador, com o codec
  já contado dentro do núcleo. O código de Flowchart é o mesmo, byte a byte.

  A razão é específica e muda a estimativa de State e ER: o parser de Flowchart é grande por causa do
  **rótulo embutido no statement de ligação** — 14 formas de nó × 8 tipos de link tokenizados dentro da
  mesma linha. Em Class e Sequence o nó é declarado em linha própria e o parser é uma máquina de
  linhas, não um tokenizador.

- **O escopo dos cinco tipos sai da zona de risco.** State é grafo dirigido como Flowchart e ER é nós
  estruturados como Class: as duas formas que faltam são as duas já provadas. A ordem por família que
  o discovery fixou continua valendo, agora com custo conhecido em vez de estimado.

- **A superfície única existe e foi exercida.** Canvas, editor de código e instrumentação chamam
  `analisar`/`serializar`/`normalizar` sem saber o tipo do documento, e canvas, modelo e código
  concordaram na contagem em **30/30** documentos.

- **A PRD ganha NFRs binários e verificáveis por máquina nas três famílias**, todos derivados de
  medição: o código copiado é aceito pelo `mermaid.parse()` (30/30) e desenha o mesmo diagrama (30/30);
  o texto de rótulo volta byte a byte ou marcado (26/26 em cada família); nenhuma perda de nó real
  durante a digitação. São a forma que a `constitution` do Spec Kit converte em princípio decidível com
  limiar.

**Fica mais difícil.**

- **Toda capacidade que toque ordenação precisa perguntar de que família é.** Reordenar statements,
  desfazer, colar, aplicar uma alteração a uma seleção inteira — em Flowchart e Class o arranjo é
  livre; em Sequence, reordenar é reescrever o diagrama. É invariante de arquitetura, e do tipo que uma
  refatoração inocente derruba sem quebrar teste nenhum.

- **A tolerância continua sendo requisito, mas o perigo tem endereço diferente em cada família.** O
  braço estrito perde nó real 5, 5, 10 e 15 vezes em Flowchart e **zero** em Class e Sequence — e isso
  não é mérito das famílias novas: é que o rótulo do Flowchart é digitado dentro do statement de
  ligação. Nas outras duas o perigo mora onde o rótulo mora, e o spike o encontrou digitando: o alias
  `participant X as Y` derrubava o participante por duas teclas (2 perdas reais lendo o resto da linha
  como id, 0 lendo o primeiro token), e o corpo `class Pedido {` aberto é estado normal de digitação.
  Cada sintaxe nova precisa dessa varredura, e o defeito é invisível em teste comum.

- **O canvas genérico não serve para Sequence.** Uma grade de nós e arestas desenha as três famílias,
  mas em Sequence ela perde justamente o que define a família: a ordem das mensagens fica invisível.
  O desenho que o ADR-002 projetou — participante = coluna, mensagem = aresta horizontal, instante =
  handle — deixa de ser uma opção e vira requisito.

- **Cada moldura de rótulo nova precisa declarar o seu codec.** O núcleo empresta o vocabulário de
  escape; o par codec é da moldura. Errar de moldura altera o texto da pessoa em silêncio, que é
  exatamente o que o discovery proíbe.

**Trade-offs aceitos.**

- **State e ER não foram escritos.** São as interpolações das duas formas provadas, e a expectativa é
  que caibam. "Deve" não é "foi medido", e o custo dos dois continua sendo estimativa — agora ancorada
  em duas medições em vez de nenhuma.
- **A cobertura de cada tipo novo não é total.** Em Class ficaram de fora `click`/`link`/`callback` e
  nota markdown de várias linhas; em Sequence, `box`, `create`/`destroy participant`, `link`/`links` e
  `%%{wrap}`. O que não é lido **acusa erro** em vez de sumir calado — mas acusar erro no documento da
  pessoa é ruim igual, como o ADR-006 já havia registrado.
- **O modelo não valida invariante global.** O corpus de Sequence desbalanceava `activate`/`deactivate`
  e o **mermaid rejeitou o corpus** enquanto o parser próprio o aceitava calado. Corrigido no corpus,
  não no parser: ser mais permissivo que o mermaid aqui é divergência conhecida e não resolvida, da
  mesma família da que o ADR-006 registrou para o comentário `%%`.
- **Fantasmas piscam mais nas famílias novas.** Digitar `class`, `loop` ou `participant` passa por
  prefixos que um parser de linha lê como nó — 208 prefixos com fantasma no documento realista de Class
  contra 191 no de Flowchart. A perda real é 0, mas a caixa espúria aparece e some. Medido, não
  contornado.
- **A digitação caractere a caractere foi amostrada** em 4 dos 10 documentos por família, porque é
  O(n) chamadas ao mermaid por documento e o corpus tem 30. A amostra está declarada no veredito.
- **Uma máquina, sem GPU.** Mesmo Ryzen 7 5800H em WSL2 dos ADR-004/005/006/007. Lê-se com confiança a
  razão entre os braços (3,0× · 4,3× · 7,7× entre projeção com e sem reuso), não o valor absoluto — que
  anda ±1 a 2ms de uma rodada para outra.

**Limites conhecidos — o que este ADR não decide.**

- **Fluxo por teclado em Class e Sequence.** Continua onde o ADR-005 o deixou, e agora com mais razão
  para ser endereçado: o ciclo principal de Sequence não é "criar caixa → conectar", é "criar
  participante → enviar mensagem → rotular", e a ordem faz parte do gesto. Este ADR mede o modelo, não
  o gesto.
- **O desenho de Sequence no canvas.** O ADR-002 o projetou e mediu com mouse; ele não foi
  implementado aqui, e a consequência acima o torna obrigatório em vez de opcional.
- **Motor de layout para as famílias novas.** O ADR-007 registrou que só Flowchart foi disposto, e que
  "layout hierárquico" pode não significar nada em Sequence. Continua aberto, e agora com a forma do
  modelo conhecida para as três.
- **A gramática visível do erro por família.** Que o parser devolva `erros` e `avisos` é decisão de
  forma; como isso aparece para a pessoa em cada tipo de diagrama é design que cabe no `spec.md`/
  `plan.md`.
- **Sessão longa.** Cada cenário dura segundos, igual aos ADR-004/005/006/007. Se o modelo degrada,
  vaza ou perde o ponto fixo ao longo de horas, este spike não vê.

## Status

Aceito em 2026-07-20, depois de revisão da evidência: os 237 checks em Node foram **re-rodados** e
reproduzem (237/237), e as 160 checagens de navegador do `resultados/veredito.json` foram conferidas
uma a uma contra as afirmações do texto. A revisão corrigiu dois números que não batiam com o
artefato — o custo de Sequence (era 476, é **482**) e as latências, que vinham de uma rodada diferente
da gravada. Nenhuma conclusão mudou: o custo por família continua caindo, as três famílias continuam
dentro da barra de 50ms e continuam estourando sem reuso.
