# Spike ADR-008 — o modelo interno cabe nas outras famílias, e a que custo?

Evidência de execução do [ADR-008 — Alcance do modelo interno além do Flowchart](../../ADR-008-alcance-do-modelo-alem-do-flowchart.md).
Código descartável: existe para produzir um veredito, não para virar base do produto.

## A pergunta

O discovery congela o escopo em cinco tipos — *"escolher e trocar o tipo de diagrama entre Flowchart,
Class, State, Sequence e ER"* — e ordena o avanço por **família de modelo mental**: grafo dirigido
(Flowchart, State), nós estruturados (Class, ER), e Sequence por último, *"por ser uma sequência
temporal de mensagens entre participantes e não um grafo livre"*.

O ADR-003 decidiu um **modelo de domínio próprio único** para os cinco. O ADR-006 o provou rodando —
**só para Flowchart** — e todos os ADRs registraram o buraco pelo mesmo nome:

- **ADR-003**: *"um spike de calibragem escrevendo o par parser/serializador de um tipo não-Flowchart
  (Class ou ER) foi considerado e adiado; se a estimativa do primeiro incremento estourar, é aqui que
  se volta."*
- **ADR-004**: *"Class, State e ER. Só Flowchart e um Sequence simplificado foram medidos… 'deve' não
  é 'foi medido'."*
- **ADR-005**: *"Só Flowchart foi dirigido por teclado. Sequence é o suspeito declarado."*
- **ADR-006**: *"Só Flowchart. Cada tipo novo custa um par parser/serializador inteiro — **717 linhas**
  para o tipo mais simples."*

A pergunta que só se resolve rodando:

> O modelo interno único do ADR-003 se estende para **nós estruturados** e para **sequência temporal**
> sem virar três modelos — e quanto custa cada família em relação às 717 linhas do Flowchart?

O desfecho não seria um ajuste. Se o modelo não generalizasse, ou o escopo encolheria abaixo dos cinco
tipos, ou o produto passaria a ter um modelo por família — e nos dois casos a PRD, o fatiamento e a
ordem de release são outros.

## O que foi rodado

`mermaid` **11.16.0** como oráculo · `@xyflow/react` 12.11.2 · React 18 · Vite 5 · Chromium headless
via Playwright · 1440×900 · Linux WSL2, AMD Ryzen 7 5800H, 8 vCPU, sem GPU.

```
npm install
npm run fidelidade    # 237 checagens em Node — round-trip, ponto fixo, charset, ordem, calibragem
npm run build
npm run verify        # 160 checagens no navegador — oráculo mermaid + latência + permutação
```

**O Flowchart entra como linha de base, sem retoque.** `src/tipos/flowchart/` é cópia byte a byte do
ADR-006 (só o caminho de um `import` mudou, porque o codec foi para o núcleo). Sem essa coluna,
"Class passou" não teria contra o que ser lido.

Corpus: **30 documentos**, dez por família. Class cobre membros com visibilidade/tipo/classificador,
as oito relações, cardinalidade, anotações, `namespace`, genéricos, frontmatter/diretiva/comentário,
rótulos hostis e um modelo de domínio realista. Sequence cobre as dez setas, ativação nas duas formas,
`loop`/`alt`/`opt`/`par`/`critical`/`break`, notas nas três posições, `autonumber`, alias, e um fluxo
realista. Todos validados pelo mermaid antes de servirem de base (checagem `B1`).

Desenho da prova, em `src/`:

- `nucleo/` — a hipótese sob teste: o que as três famílias compartilhariam. Preâmbulo (frontmatter,
  `%%{init}%%`, comentários), as duas listas de severidade do ADR-006, o codec de rótulo, a regra de
  não guardar coordenada.
- `tipos/<familia>/` — `modelo` + `parser` + `serializar` de cada família. É o que a calibragem mede.
- `registro.js` — a superfície única. Canvas e editor chamam `analisar`/`serializar`/`normalizar` sem
  saber de que tipo é o documento.

Braços de controle: `tolerante=0` (parser estrito), `aliasComoResto=1` (a leitura ingênua do alias),
`memo=0` (projeção sem reuso), `n=400&ligacoes=500` (o envelope do ADR-004), e a **permutação** do
agregado de cada família, julgada pelo renderer do mermaid.

## Veredito: **o modelo único se estende — como núcleo mais vocabulário de família, não como forma única**

**397/397 checagens passaram** (237 em Node, 160 no navegador). O placar não é o achado; o achado é o
que os braços de controle mostraram.

| Verificação | Flowchart | Class | Sequence |
|---|---|---|---|
| `mermaid.parse()` aceita o código que sai do modelo | 10/10 | 10/10 | 10/10 |
| `mermaid.render()` desenha o mesmo diagrama | 10/10 | 10/10 | 10/10 |
| Round-trip estrutural + ponto fixo textual | 10/10 | 10/10 | 10/10 |
| Texto hostil volta byte a byte | 26/26 (5 marcados) | 26/26 (5 marcados) | 26/26 (5 marcados) |
| Nenhuma perda de nó real durante a digitação | 4/4 | 4/4 | 4/4 |
| Canvas, modelo e código concordam no app rodando | 10/10 | 10/10 | 10/10 |
| Tecla no editor dentro da barra de 50ms (envelope) | 21,7ms | 27,4ms | 14,3ms |
| **Custo em linhas** | **726** | **631** | **482** |

### Achado 1 — o custo por família **cai**, não sobe

A calibragem que o ADR-003 pediu e o ADR-006 adiou:

| | modelo | parser | serializar | total | contra o Flowchart |
|---|---|---|---|---|---|
| **núcleo** (compartilhado) | 142 | — | — | **460** | usado sem alteração pelas três |
| **Flowchart** (ADR-006, verbatim) | 126 | 485 | 115 | **726** | linha de base |
| **Class** | 118 | 401 | 112 | **631** | **87%** |
| **Sequence** | 144 | 270 | 68 | **482** | **66%** |

As **726** do Flowchart não contradizem as **717** do ADR-006: são cestas diferentes. Lá a conta era
parser + serializador + **codec**; aqui é modelo + parser + serializador, com o codec já contado dentro
do núcleo. O código é o mesmo, byte a byte.

O medo registrado no ADR-006 — *"cada tipo de diagrama novo custa um par parser/serializador
inteiro"* — se confirma na forma, mas o número anda ao contrário do esperado: os dois tipos "difíceis"
custaram **menos** que o tipo "mais simples". A razão é específica e vale registrar, porque muda a
estimativa dos outros dois tipos: o parser de Flowchart é grande por causa do **rótulo embutido no
statement de ligação** — 14 formas de nó × 8 tipos de link, tudo tokenizado dentro da mesma linha
(`a[/Rótulo/] ==>|texto| b`). Em Class e Sequence o nó é declarado em linha própria e o rótulo mora
noutro lugar, então o parser é uma máquina de linhas, não um tokenizador.

O núcleo (460 linhas) é reusado **sem alteração** pelas três. É a metade positiva da resposta: existe
núcleo, e ele não é pequeno.

### Achado 2 — a ordem do agregado não é a mesma coisa nas três, e isso derruba um campo do núcleo

É o achado que decide a forma da decisão. O `normalizar` do ADR-006 **ordena** as conexões, porque no
Flowchart trocar duas arestas de lugar não muda o diagrama. Se isso valesse nas três famílias, o
núcleo poderia ter uma normalização só.

Não vale. O juiz aqui é o renderer do mermaid, não a minha função de comparação — e a assinatura foi
separada em **significado** (quais nós, quantas ligações, em que ordem as mensagens) e **geometria**
(onde o renderer pôs cada caixa), porque misturar as duas daria a resposta errada:

| Família | Permutar o agregado… | |
|---|---|---|
| Flowchart | significado **igual** · layout muda | a ordem é ruído |
| Class | significado **igual** · layout muda | a ordem é ruído |
| Sequence (`02-setas`) | significado **DIFERENTE** · layout muda | a ordem é semântica |
| Sequence (`10-fluxo-real`) | **o mermaid recusa o documento** — *"Trying to inactivate an inactive participant (App)"* | a ordem é condição de validade |

A última linha é a mais forte que o spike produziu: em Sequence, permutar não degrada o diagrama —
produz um documento que **não é mermaid válido**. Ordem ali não é preferência de arranjo, é parte da
gramática.

Duas consequências para o desenho, e as duas são de arquitetura, não de implementação:

- **`normalizar` não pode ser do núcleo.** Cada família declara o que nela é ruído e o que é
  semântica. O núcleo empresta o formato da comparação, não a política de ordenação.
- **O serializador "normalizador quanto ao arranjo" do ADR-006 tem limite.** Em Flowchart e Class ele
  pode reordenar à vontade; em Sequence, reordenar é reescrever o diagrama.

> Nota de tabela, relevante para o ADR-007: **o layout muda nas três**. O mermaid posiciona conforme a
> ordem de declaração mesmo quando o grafo é idêntico. A promessa do discovery de que a posição não
> viaja no código continua de pé, mas "mesmo código, mesmo desenho" só vale byte a byte — reordenar
> statements muda o que o destinatário vê.

### Achado 3 — o nó nem sempre é um rótulo, e o grupo nem sempre é um conjunto de nós

As outras duas dobras do modelo, ambas sem paralelo no vocabulário nó/aresta que o ADR-002 fixou para
a engine:

- **Class: o nó tem corpo.** `membros` é uma lista **ordenada** dentro do nó — cada membro com
  visibilidade, tipo e classificador —, e a ordem aparece no desenho. Onde o Flowchart tem
  `rotulo: string`, Class tem um agregado. `resultados/classe-dominio-real.png` mostra as oito classes
  com o corpo desenhado.
- **Sequence: o bloco é um intervalo de tempo.** `subgraph` do Flowchart contém **ids de nó**;
  `loop`/`alt`/`opt` contêm uma **faixa da sequência**, aninham, e `alt` ainda tem vários ramos
  (`else`). No modelo isso virou árvore temporal (`corpo`), com a lista plana de eventos **derivada**,
  não guardada — mesma disciplina que o ADR-003 aplicou à posição.

Some-se uma dobra menor, achada escrevendo: **o codec de rótulo é por moldura, não por documento**. No
Flowchart todo rótulo mora entre aspas dentro da forma; em Class (rótulo de relação) e em Sequence
(texto de mensagem e de nota) o texto corre até o fim da linha, **sem aspas**. Foi preciso um segundo
par `codificarSemAspas`/`decodificarSemAspas` — e, dentro dele, emitir espaço de borda como `#32;`,
porque a linha do código é aparada antes de o statement ser lido e um espaço solto simplesmente não
chegaria. Sem isso, `"  centro  "` voltava `"centro"`: alteração silenciosa, exatamente o que o
discovery proíbe.

### Achado 4 — a tolerância continua sendo requisito, mas o perigo muda de lugar

O ADR-006 provou que um parser próprio **estrito** perde nó real 70 vezes ao longo do corpus de
Flowchart. Aqui o braço `tolerante=0` rodou nas três famílias:

| | perda real (estrito) | fantasmas (tolerante) | mermaid aceita |
|---|---|---|---|
| Flowchart | **5 · 5 · 10 · 15** | 0 · 37 · 0 · 191 | 39% de 1.406 estados |
| Class | 0 · 0 · 0 · 0 | 34 · 41 · 50 · 208 | 39% de 1.361 estados |
| Sequence | 0 · 0 · 0 · 0 | 40 · 58 · 27 · 167 | 30% de 1.115 estados |

À primeira leitura isso diria "Class e Sequence são naturalmente tolerantes". **Não são** — o corpus é
que declarava os nós antes de ligá-los. O braço `B4b` refez a medição com documentos em que o nó nasce
**dentro** da ligação, que é a forma mais curta e a que o teclado produz: Flowchart perde 4 vezes,
Class e Sequence continuam em 0. A diferença é estrutural e não de família: no Flowchart o rótulo é
digitado **dentro** do statement de ligação (`pedido["Pedido rec`), e é o colchete aberto que invalida
a linha inteira e derruba o nó. Em Class e Sequence o id na ligação é nu.

O perigo não sumiu; mudou de endereço — e este spike o encontrou digitando, nos dois lugares onde o
rótulo mora nessas famílias:

- **`participant Codigo as Painel de codigo`.** Tecla a tecla, o resto da linha passa por `Codigo a` e
  `Codigo as`. Lendo o resto como id, o participante `Codigo` — que já estava desenhado — **some da
  prévia e volta**. O braço de controle `B4c` mede: **2 perdas reais** com a leitura ingênua, **0**
  lendo o primeiro token. É o `revisao -` do ADR-006 noutra sintaxe.
- **`class Pedido {` com o corpo aberto.** Estado normal de quem está digitando a classe. Tolerante,
  vira aviso e a classe fica com os membros já digitados (`resultados/em-digitacao-classe.png`).

E o achado central do ADR-006 se confirma nas três famílias: o `mermaid.parse()` aceita **39% / 39% /
30%** dos estados intermediários de digitação. Uma prévia que dependesse dele passaria a maior parte
do tempo apagada — em Sequence, mais ainda que em Flowchart.

### Achado 5 — a invariante do reuso agora tem quatro donos, e nas três famílias

O ADR-004 a fixou por latência de gesto, o ADR-005 por correção do foco por teclado, o ADR-006 pela
entrada por texto. Aqui ela reaparece nas três famílias ao mesmo tempo:

| Cenário (envelope 400/500) | com reuso | **controle** `memo=0` |
|---|---|---|
| Flowchart | 21,7ms (p95 32,1) | **65,9ms** (p95 93,0) |
| Class | 27,4ms (p95 31,3) | **118,3ms** (p95 124,5) |
| Sequence | 14,3ms (p95 18,9) | **109,7ms** (p95 132,5) |

Sem o reuso, a tecla estoura a barra de 50ms nas **três**. Com ele, as três cabem — e o parser não é o
gargalo em nenhuma (6,0ms · 4,3ms · 2,7ms de uma tecla de ~20ms). O envelope do ADR-004 vale para
Class e Sequence, não só para Flowchart.

> Este número é mais alto que o do ADR-006 (32,6ms no `memo=0`) por um motivo que vale registrar: lá o
> nó customizado não tinha `Handle`, então o React Flow não desenhava aresta nenhuma e o braço media
> menos do que dizia medir. Aqui as 500 ligações são desenhadas.

## Limites conhecidos deste spike

Escrito para não superestimar o veredito:

- **State e ER não foram escritos.** São as interpolações — State é grafo dirigido como Flowchart, ER
  é nós estruturados como Class —, e a expectativa é que caibam nas duas formas já provadas. "Deve"
  não é "foi medido", e o custo dos dois continua sendo estimativa.
- **A cobertura de cada tipo não é total.** Em Class ficaram de fora `click`/`link`/`callback` e nota
  markdown de várias linhas; em Sequence, `box`, `create`/`destroy participant`, `link`/`links` e
  `%%{wrap}`. O que não é lido **acusa erro** em vez de sumir calado — mas acusar erro no documento da
  pessoa é ruim igual.
- **O modelo não valida invariante global de ativação.** O corpus `10-fluxo-real` original
  desbalanceava `activate`/`deactivate`; o **mermaid rejeitou o meu corpus** e o parser próprio o
  aceitava calado. Corrigido no corpus, não no parser: ser mais permissivo que o mermaid aqui é
  divergência conhecida, não resolvida.
- **Fantasmas piscam mais nas famílias novas.** Digitar `class`, `loop` ou `participant` passa por
  prefixos que um parser de linha lê como nó — 208 prefixos com fantasma no documento realista de
  Class contra 191 no de Flowchart. Nenhum trabalho real se perde (a perda real é 0), mas a caixa
  espúria aparece e some. Medido, não contornado.
- **O canvas é substituto, não a vista do produto.** É uma grade genérica com um nó só para as três
  famílias — o suficiente para provar que o modelo alimenta uma vista e para carregar o custo da
  tecla. Ele **não** é o desenho de Sequence que o ADR-002 projetou (participante = coluna, mensagem =
  aresta horizontal, instante = handle). E há um sinal nisso:
  `resultados/sequencia-fluxo-real.png` mostra o canvas genérico perdendo justamente o que define a
  família — a ordem das mensagens é invisível numa grade.
- **Fluxo por teclado não foi tocado.** Continua onde o ADR-005 o deixou: *"só Flowchart foi dirigido
  por teclado… o ADR é aceito sabendo que esse caso pode exigir vocabulário próprio"*. Este spike mede
  o modelo, não o gesto.
- **A digitação caractere a caractere foi amostrada.** O braço `B4` roda sobre 4 dos 10 documentos por
  família (`01`, `05`, `09`, `10`) — é O(n) chamadas ao mermaid por documento e o corpus tem 30. A
  amostra está declarada no `veredito.json`.
- **Uma máquina, sem GPU.** Mesmo Ryzen 7 5800H em WSL2 do ADR-004/005/006. O que se lê com confiança
  é a razão entre os braços (3,0× · 4,3× · 7,7× entre `memo=1` e `memo=0`), não o valor absoluto: cada
  rodada anda ±1 a 2ms. Os números acima são os do `resultados/veredito.json` deste repositório.
- **Sessão longa.** Cada cenário dura segundos. Se o modelo degrada, vaza ou perde o ponto fixo ao
  longo de horas, este spike não vê — mesma ressalva dos três ADRs anteriores.
