# Spike ADR-006 — o ciclo código ↔ modelo fecha, e o que ele perde no caminho?

Evidência de execução do [ADR-006 — Ciclo completo código ↔ modelo](../../ADR-006-ciclo-completo-codigo-modelo.md).
Código descartável: existe para produzir um veredito, não para virar base do produto.

## A pergunta

O **ADR-003** decidiu a forma do modelo interno por **pesquisa** — 29 fontes, 25 claims verificadas —
e a fonte decisiva foi negativa: o parser Langium do mermaid não cobre nenhum dos cinco tipos do
escopo, e o Jison que cobre está acoplado ao renderer. A conclusão foi "par parser/serializador
próprio". Nada disso rodou.

Os outros ADRs registraram o buraco por escrito, cada um do seu lado:

- O **ADR-002**: *"o spike parou na vista: não gerou `sequenceDiagram` a partir do modelo nem leu
  texto de volta. Provar que 'canvas e código são duas vistas da mesma verdade' depende da forma do
  modelo interno, ainda em aberto."*
- O **ADR-004** fixou o envelope de fluidez medindo o braço **gesto → modelo → canvas**, e registrou
  que o painel de código era um `<pre>`: *"o caminho texto → modelo continua sem medição."*
- O **ADR-005** repetiu a mesma ressalva palavra por palavra.

A pergunta que só se resolve rodando:

> O ciclo **texto → modelo → texto** fecha sem perder o diagrama, produzindo código que o **mermaid
> de verdade** aceita e desenha igual — e a tecla digitada **dentro do editor de código** cabe no
> envelope que o ADR-004 fixou?

Com duas exigências que o discovery faz na mesma frase e que brigam entre si:

- *"Sinalizar o erro de sintaxe ao editar o código, **sem que a prévia quebre ou se perca**."*
- *"Caractere que o tipo de diagrama não expressa em código deixa o rótulo **marcado** — o texto nunca
  é alterado em silêncio para caber."*

## O que foi rodado

`mermaid` **11.16.0** como oráculo · `@xyflow/react` 12.11.2 · React 18 · Vite 5 · Chromium headless
via Playwright · 1440×900 · Linux WSL2, AMD Ryzen 7 5800H, 8 vCPU, sem GPU.

O ponto que sustenta o veredito: **o mermaid de verdade é o juiz, não eu**. Um round-trip conferido
pelo meu próprio parser seria circular — se o parser deixa cair `linkStyle`, os dois lados deixam cair
igual e o teste passa sem provar nada. Aqui, o texto que sai do modelo é submetido ao `mermaid.parse()`
(validador) e ao `mermaid.render()`, e o SVG resultante é comparado com o SVG do documento original:
mesmos rótulos de nó, mesma contagem de arestas, mesmos rótulos de aresta.

```
npm install
npm run fidelidade    # 80 checagens em Node — round-trip, ponto fixo, charset
npm run build
npm run verify        # 71 checagens no navegador — oráculo mermaid + latência
```

Corpus: **10 documentos** (`corpus/*.mmd`) cobrindo as 14 formas de nó, os 8 tipos de link e as duas
sintaxes de rótulo de aresta, subgraphs aninhados com `direction`, `classDef`/`class`/`:::`/`style`/
`linkStyle`, frontmatter YAML, `%%{init}%%`, comentários, rótulos hostis e um diagrama de arquitetura
realista. Todos validados pelo mermaid antes de servirem de base (checagem `B1`).

Desenho da prova, em `src/`:

- `modelo.js` — a verdade. Sem coordenada (ADR-003/005). O campo `preservado` é a recomendação de
  *sintaxe preservada* do ADR-003 virando estrutura executável.
- `parser.js` — mermaid → modelo, tolerante a erro por construção.
- `serializar.js` — modelo → mermaid, **normalizador**: dado um modelo, existe um só texto.
- `rotulo.js` — o codec texto puro ↔ rótulo. É onde mora a promessa do "marcado".
- `App.jsx` — as duas vistas sobre o mesmo modelo, e a instrumentação da tecla.

Braços de controle: `tolerante=false` (parser estrito), `memo=0` (projeção sem reuso), `canvas=0`
(só o editor de código), `n=400&arestas=500` (o envelope do ADR-004).

## Veredito: **o ciclo fecha — e a tolerância a erro não é polimento, é requisito**

**151/151 checagens passaram** (80 em Node, 71 no navegador). Mas o placar não é o achado; o achado é
o que os braços de controle revelaram.

| Verificação | Resultado |
|---|---|
| `mermaid.parse()` aceita o código que sai do modelo | **10/10** |
| `mermaid.render()` desenha o mesmo diagrama (nós, arestas, rótulos) | **10/10** |
| Round-trip estrutural: o modelo sobrevive à ida e volta | 10/10 |
| Ponto fixo textual: normaliza uma vez, depois não muda mais | 10/10 |
| Frontmatter, `%%{init}%%` e comentário sobrevivem ao ciclo | 4/4 |
| Texto hostil volta byte a byte idêntico | **26/26** (5 marcados) |
| Nenhuma perda de nó real durante a digitação (parser tolerante) | 10/10 |
| Canvas, modelo e código concordam no app rodando | 10/10 |
| Tecla no editor de código dentro da barra de 50ms | 6/6 cenários |

### Achado 1 — o mermaid recusa 65% do que se digita; o modelo próprio não pode fazer o mesmo

Digitando os 10 documentos do corpus caractere a caractere — **2.885 estados intermediários** — o
`mermaid.parse()` aceita **35%**. Por documento a faixa vai de **11%** a **77%**.

Não é defeito do mermaid: ele é validador de documento pronto, exatamente como o ADR-003 concluiu por
pesquisa. É a medição que transforma aquela conclusão em número. Se a prévia dependesse do
`mermaid.parse()`, ela passaria **dois terços do tempo de digitação apagada** — e "sem que a prévia
quebre ou se perca" seria impossível por construção, não por implementação.

O braço `tolerante=false` mostra que ter parser próprio **não basta**. Um parser próprio mas estrito
perde nó real **70 vezes** ao longo do corpus:

| Braço | Perda de nó real | O que acontece na tela |
|---|---|---|
| Estrito (`tolerante=0`) | **70** | o nó some enquanto a pessoa digita o rótulo dele |
| Tolerante (`tolerante=1`) | **0** | o nó fica, com o rótulo parcial que já foi digitado |

Os dois estados que derrubavam a prévia, ambos triviais e ambos no meio do ciclo principal:

- `pedido["Pedido rec` — rótulo aberto, ainda sem fechar. O statement inteiro cai, e com ele o nó.
- `revisao -` — o **primeiro traço** de uma seta. O pedaço deixa de ser um id válido, o statement cai,
  e o nó de origem — que já estava desenhado — desaparece.

`resultados/em-digitacao.png` é esse estado exato: o mermaid recusa o documento, a prévia mostra os
dois nós e a conexão, e o rodapé diz `2 aviso(s): L2 rótulo de 'revisao' sem fechamento`.

### Achado 2 — tolerar e sinalizar brigam, e a briga é resolvível

A primeira versão tolerante passou a aceitar `B[[[oops` **em silêncio**: a prévia não quebrava, e o
rodapé dizia "sintaxe ok". Isso reprova tanto quanto quebrar — o discovery pede as duas coisas na
mesma frase.

A saída foi separar dois canais no resultado do parse: **`erros`** derruba o statement; **`avisos`**
sinaliza sem derrubar nada. Estado de digitação legítimo (rótulo aberto, seta sem destino) vira aviso;
lixo estrutural vira erro. Com a separação, as 5 injeções de linha inválida em cada um dos 10
documentos passaram a ser sinalizadas **50/50** com **100% dos nós preservados**.

O que isso significa para o produto: o modelo interno não pode devolver `modelo | null`. Ele devolve
sempre um modelo, mais duas listas de severidade diferente. É decisão de forma, não de implementação.

### Achado 3 — o texto de fora sobrevive inteiro; a marca é do modelo, não da direção

Os **26** textos hostis — aspas, `#`, `<br/>` literal, `&`, emoji, cirílico, CJK, árabe RTL, quebra
de linha, barra invertida, NUL — voltaram **byte a byte idênticos**, tanto pelo codec direto quanto
atravessando um documento inteiro. **5** ficaram marcados: espaços repetidos, espaço nas bordas,
tabulação, caractere de controle e string só-de-espaço. São os casos em que o texto é preservado mas
a **renderização** não é fiel (HTML colapsa espaço) — que é exatamente o caso que o discovery manda
marcar em vez de alterar.

O furo que apareceu no caminho: a marca estava sendo calculada só na **codificação** — texto entrando
pela colagem. Um rótulo com espaço duplo digitado direto no código chegava ao modelo sem marca. A
marca é propriedade **do modelo**, não da direção de onde o texto veio; as duas pontas do codec agora
chamam a mesma checagem. `resultados/rotulos-hostis.png` mostra o nó `seta -->  literal` marcado em
âmbar entre oito vizinhos fiéis.

> Os emoji aparecem como tofu nas capturas — é fonte ausente no Chromium headless, não perda de dado.
> A checagem `F5` compara bytes, e eles voltaram idênticos.

### Achado 4 — a tecla no editor de código é barata; o custo já estava medido no canvas

O ADR-004 fixou a barra em **50ms de mediana** e deixou este braço sem medir. Ele cabe, com folga, e
com o documento inteiro sendo re-analisado a cada tecla — sem nenhuma estratégia incremental. O cursor
foi posto **no meio do documento**, não no fim, que seria o caso fácil.

| Cenário | Mediana | p95 | Só o parse | Projeção |
|---|---|---|---|---|
| Vazio (3 nós) | 16,5ms | 17,0 | 0,1ms | 0ms |
| 100 nós / 120 conexões | 16,6ms | 18,7 | 1,3ms | 0,1ms |
| **Envelope ADR-004 (400/500)** | **15,5ms** | 31,5 | **6,0ms** | 0,6ms |
| Envelope · sem reuso (`memo=0`) | 32,6ms | **48,2** | 6,2ms | 0,2ms |
| Envelope · só código (`canvas=0`) | 16,3ms | 17,8 | 5,6ms | 0ms |
| Denso 800/1000 | 31,6ms | 58,8 | 14,3ms | 1,0ms |

Três leituras:

1. **O parser não é o gargalo.** No envelope ele custa 6ms de uma tecla de 15,5ms. O resto é o frame e
   o próprio campo de texto — o braço `canvas=0` custa 16,3ms *sem canvas nenhum*, que é o piso da
   plataforma. Re-analisar 900 linhas por tecla é acessível; otimização incremental é dívida que ainda
   não venceu.
2. **A invariante do reuso se confirma pela terceira vez.** Com `memo=0` a mediana dobra (32,6ms) e o
   p95 encosta na barra (48,2ms). O ADR-004 a fixou por latência de gesto, o ADR-005 a reencontrou por
   correção do foco, e ela reaparece aqui no braço de entrada por texto. Três razões independentes.
3. **A 800/1000 o p95 estoura** (58,8ms) e o parse dobra para 14,3ms. O envelope do ADR-004 continua
   sendo envelope, e agora com um consumidor a mais dentro dele.

### Achado 5 — o parser próprio e o mermaid discordam nos dois sentidos

Oito sondas, três divergências. Nenhuma é acidente; todas são decisão a tomar.

| Sonda | mermaid | próprio | |
|---|---|---|---|
| Comentário `%%` no fim de um statement | **recusa** | aceita | divergem |
| Sintaxe de shape v11 `A@{ shape: rect }` | aceita | **recusa** | divergem |
| Seta sem destino (`a[A] -->`) | **recusa** | aceita (aviso) | divergem — é o Achado 1 |
| Rótulo markdown com crase | aceita | aceita | concordam |
| `linkStyle default` · nó sem definição · aspas aninhadas · `subgraph` sem `end` | — | — | concordam |

A primeira surgiu como falha de teste: o corpus original tinha `meio --> fim[Fim] %% nada depois daqui`,
e o **mermaid rejeitou o meu corpus**. Comentário só vale em linha própria. O parser próprio era mais
permissivo do que o alvo, e o serializador, ao mover o comentário para linha própria, **consertava**
o documento inválido sem avisar. O corpus foi corrigido e a divergência virou sonda — porque "ser mais
permissivo que o mermaid" é uma escolha, e escolha não anotada vira surpresa.

A segunda é uma dívida datada: `@{ shape: ... }` é a sintaxe nova de shapes do mermaid v11, o parser
próprio não a lê, e ela **acusa erro** em vez de sumir calada.

## Limites conhecidos deste spike

Escrito para não superestimar o veredito:

- **Só Flowchart.** Class, State, ER e Sequence não têm parser nem serializador aqui. O ADR-003 já
  registrava que o custo de cada tipo novo é desconhecido e que um spike de calibragem foi *considerado
  e adiado*; ele continua adiado. O que este spike acrescenta é que o custo agora tem unidade conhecida
  — parser + serializador + codec somam **717 linhas** (comentários inclusos) para o tipo mais simples,
  e a maior parte é o parser (484).
- **Cobertura de Flowchart não é total.** Ficaram de fora: shapes v11 `@{}`, `click` com callback,
  `linkStyle` por índice múltiplo, `accTitle`/`accDescr`, e o `graph` com `;` obrigatório do dialeto
  antigo. O que não é lido **acusa erro**, não some — mas acusar erro no documento da pessoa é ruim
  igual.
- **Nós fantasma piscam e não foram resolvidos.** Digitar a palavra `subgraph` passa por `s`, `su`,
  `sub` — que um parser de linha lê como um nó chamado `s`. No documento realista, **191 dos 757**
  prefixos exibem ao menos um nó que não existe no documento final. Nenhum trabalho real se perde
  (a perda real é 0), mas uma caixa espúria aparece e some enquanto a pessoa digita uma palavra-chave.
  Medido, não contornado.
- **A posição do comentário não sobrevive, só o comentário.** O serializador emite todos os comentários
  em bloco logo após o cabeçalho. Reancorá-los no statement original exigiria guardar posição de texto
  no modelo — que é justamente o que o modelo não guarda. O ciclo é lossless quanto ao *conteúdo* e
  normalizador quanto ao *arranjo*.
- **Uma edição por vez.** Cada medição é uma tecla. Colar um diagrama grande de uma vez, desfazer/refazer
  e edição sobre seleção múltipla continuam sem medição — os mesmos gestos que o ADR-004 já havia
  deixado de fora.
- **Editor de código é um `<textarea>`.** Sem destaque de sintaxe, sem numeração de linha, sem
  marcação de erro na margem. Tudo isso acrescenta trabalho por tecla, e o piso de 16ms medido aqui é
  o piso **sem** essas capacidades.
- **O canvas é grade fixa.** Motor de layout continua aberto desde o ADR-002. Ele roda sobre o mesmo
  orçamento de frame que esta tecla, e não está incluído em nenhum número acima.
- **Uma máquina, sem GPU.** Mesmo Ryzen 7 5800H em WSL2 do ADR-004/005. O que se lê com confiança é a
  razão entre os braços (2× entre `memo=1` e `memo=0`), não o valor absoluto.
