# Spike ADR-010 — a sessão da Marina sobrevive a fechar a aba, e a horas de uso?

Evidência de execução do [ADR-010 — Durabilidade da sessão longa](../../ADR-010-durabilidade-da-sessao-longa.md).
Código descartável: existe para produzir um veredito, não para virar base do produto.

## A pergunta

Duas faces da mesma coisa — *a sessão da Marina sobrevive?* —, e nenhuma das duas tinha lastro.

**Ao fechar a aba.** *"Recuperar o rascunho em curso ao reabrir a aba"* é a **única linha do `### Faz`
do discovery sem nenhum ADR**. Nenhum dos nove anteriores decidiu o que sobrevive, em que formato, nem
o que custa gravar. O discovery ainda impõe a moldura: *"não é um repositório de diagramas — sem
contas, sem biblioteca, sem pastas. O rascunho em curso sobrevive a fechar e reabrir a aba como **rede
de segurança**, não como arquivo"*.

**Ao longo das horas.** **Cinco ADRs** escreveram a mesma ressalva, palavra por palavra:

> **ADR-004 / 005 / 006 / 007 / 008**: *"Sessão longa. Cada cenário dura segundos… Se o modelo degrada,
> vaza ou perde o ponto fixo ao longo de horas, este spike não vê."*

E a persona é definida pela intensidade: *"sessões longas, dezenas de elementos"*, e a promessa central
é que *"depois de horas, o que ela sente é o cansaço de ter pensado, não o de ter operado"*.

As perguntas que só se resolvem rodando:

> O que sobrevive a fechar a aba — e quanto custa gravar isso no caminho da edição? E, depois de uma
> sessão inteira de atos, o modelo degrada, vaza ou perde o ponto fixo?

O desfecho não seria um ajuste. Se gravar custasse caro no envelope, a rede de segurança viraria uma
capacidade condicionada; se a sessão degradasse, a promessa central do discovery cairia e com ela o
envelope do ADR-004.

## O que foi rodado

`mermaid` **11.16.0** como oráculo · `@xyflow/react` 12.11.2 · React 18 · Vite 5 · Chromium headless
via Playwright (`--expose-gc --enable-precise-memory-info`) · 1440×900 · Linux WSL2, AMD Ryzen 7
5800H, 8 vCPU, sem GPU.

```
npm install
npm run durabilidade   # 77 checagens em Node — formato, ponto fixo, 15.000 atos, rascunho ilegível
npm run build
npm run verify         # 26 checagens no navegador — custo de gravar, sessão longa, e `reload()` de verdade
```

**O ADR-009 entra como linha de base, sem retoque.** `src/comandos.js` (transação + histórico),
`src/nucleo/`, `src/tipos/` (as três famílias), `src/registro.js` e `src/projecao.js` são cópia byte a
byte. O que é novo:

- `src/persistencia.js` — os dois formatos de rascunho, os dois armazéns e as três políticas de quando
  gravar.
- `src/App.jsx` — o mesmo app do ADR-009 com o rascunho ligado, e a sessão longa dirigível de fora.

Barras herdadas do ADR-004, declaradas antes de medir: **edição pontual ≤100ms na mediana**, tecla
≤50ms.

Braços de controle: `formato=texto` (contra `modelo`), `quando=nunca` (contra `ato` e `ocioso`),
`armazem=async` (IndexedDB, contra localStorage), `limite=200` no histórico (contra ilimitado), e
**rascunho deliberadamente corrompido** em nove formas.

## Veredito: **a sessão sobrevive às duas coisas — e o que decide o rascunho é a posição, não o tamanho**

**103/103 checagens passaram** (77 em Node, 26 no navegador). O placar não é o achado.

| Verificação | Resultado |
|---|---|
| Reabrir a aba devolve o código **byte a byte** (3 famílias × 2 formatos) | 6/6 |
| …e o `mermaid.parse()` aceita e o `mermaid.render()` desenha | 6/6 |
| Posições da sessão de volta — formato `modelo` | **3/3** |
| Posições da sessão de volta — formato `texto` (**controle**) | **0/3** |
| Gravar 100 KiB a cada ato, no envelope | **0,7ms de bloqueio da main thread** |
| Ato com gravação a cada ato · **controle** sem gravar | 23,4ms · 18,3ms |
| 600 atos pelo app inteiro: mediana dos 50 primeiros → dos 50 últimos | 21,8ms → 23,9ms (**1,1×**) |
| 15.000 atos na camada de modelo: idem | 0,010ms → 0,008ms (**0,74×**) |
| Ponto fixo do ciclo depois de 5.000 atos (3 famílias, 5 marcos) | 15/15 |
| Rascunho ilegível derruba a aba | **0 de 12** |

### Achado 1 — o rascunho volta inteiro, e o oráculo confirma

`reload()` de verdade, não "o dado está no localStorage": a aba é recarregada e o que se lê é o que a
pessoa encontraria na tela. Nas três famílias, com uma sessão que tinha as três coisas dentro — um nó
**criado**, cinco **rotulados** em bloco e três **arrastados** —, o código volta byte a byte, o canvas
volta com o mesmo número de nós do modelo, e o mermaid de verdade aceita e desenha.

Isso vale inclusive para **Sequence**, onde o ADR-008 mostrou que a ordem do agregado é *condição de
validade* e o corpo é uma árvore temporal: passar por `JSON.stringify` e voltar não embaralhou nada —
se tivesse embaralhado, o `mermaid.parse()` teria recusado o documento, e é por isso que o oráculo está
aqui.

`resultados/reabriu-a-aba-flowchart-modelo.png` mostra a aba recarregada: *"rascunho restaurado ·
ato/modelo · 0 gravações"*, 101 nós e 3 posições.

### Achado 2 — o que separa os dois formatos é a posição, e ela é justamente o que o código não carrega

Os dois formatos preservam **estrutura e estilo** igualmente bem — nos 30 documentos do corpus, o
código volta byte a byte nos dois. A diferença é uma só, e é exatamente a que o discovery criou ao
dizer que a posição **não viaja no código**:

| | estrutura e estilo | posição da sessão | tamanho no envelope | formato a manter |
|---|---|---|---|---|
| rascunho como **texto** (o código mermaid) | byte a byte | **perdida** (0 de 3) | 15,1 KiB | nenhum — é o próprio produto |
| rascunho como **modelo + posições** | byte a byte | **inteira** (3 de 3) | 109,6 KiB (7,3×) | JSON versionado |

Guardar o código é grátis em complexidade e perde o arranjo que a pessoa fez com a mão. Guardar o
modelo custa 7,3× em bytes — irrelevante contra o teto prático de ~5 MiB do armazém — e cria um formato
próprio, com versão e tolerância a lixo para manter. O que se compra com esses 7,3× é a única parte da
sessão que o produto declaradamente **não** exporta.

Por família, para 100 nós: Flowchart 3,5 → 24,4 KiB; Class 8,5 → 51,2 KiB; Sequence 6,0 → 24,0 KiB.

### Achado 3 — gravar a cada ato é barato, e a suspeita estava no lugar errado

A suspeita registrada antes de medir era que `localStorage`, por ser **síncrono**, tornaria a gravação
por ato inviável no envelope. Não torna:

| Política | total do ato | gravação | gravações |
|---|---|---|---|
| a cada ato · localStorage | 23,4ms | **0,7ms de bloqueio da main thread** | 7 de 100 KiB |
| a cada ato · IndexedDB | 23,0ms | 22,4ms até confirmar (**fora** da main thread) | 7 de 100 KiB |
| quando a mão para · localStorage | 25,3ms | 0ms dentro do gesto | 1 de 100 KiB |
| **controle** sem gravar | 18,3ms | — | 0 |

Escrever 100 KiB de uma vez bloqueia **0,7ms** — 3% de um gesto de 23,4ms, dentro do ruído da máquina.
No documento pequeno, onde a Marina passa a maior parte do tempo, são 740 bytes e **0,1ms**.

O IndexedDB inverte a leitura de quem olha só o número: leva 22,4ms para confirmar, trinta vezes
mais que o síncrono — só que **fora** da main thread, então o gesto não sente. Ele não é mais rápido; é
mais educado. Para 100 KiB, a diferença não paga a complexidade.

O que este braço **não** mediu está dito: escrever 100 KiB a cada ato durante horas é I/O de disco
repetido que nenhum relógio de JavaScript enxerga.

### Achado 4 — a sessão longa não degrada, nas duas escalas medidas

Duas medições, porque "sessão longa" tem dois sentidos e só uma delas passa pelo produto inteiro:

| | atos | mediana no início | mediana no fim | razão |
|---|---|---|---|---|
| pelo app inteiro (comando + histórico + projeção + render + gravação) | 600 | 21,8ms | 23,9ms | **1,1×** |
| na camada de modelo, em Node | 15.000 | 0,010ms | 0,008ms | **0,74×** |

Nem uma coisa nem outra degrada. E o **ponto fixo** do ADR-006 — o ciclo modelo → texto → modelo — se
mantém: nas três famílias, a cada 1.000 atos até 5.000, o texto que sai reanalisa no mesmo modelo, e
ao fim dos 600 atos do app o mermaid continua aceitando o código.

Duas ressalvas honestas, que a tabela não mostra: **não são horas de relógio** (são 14 segundos de
relógio para 600 atos, e os 15.000 rodam em Node sem DOM), e a carga é sintética — rotular e mover em
laço, não uma pessoa pensando.

### Achado 5 — o único crescimento é o histórico, e ele é previsível

Heap medido com `gc()` forçado, contra uma linha de base tomada **depois de um aquecimento** (medir
contra o heap recém-carregado dava retenção *negativa*, e não dizia nada):

| | retido em 600 atos | por ato | entradas |
|---|---|---|---|
| histórico ilimitado | 765 KiB | **1.306 bytes** | 650 |
| **controle** teto de 200 | 217 KiB | 370 bytes | 200 |

Não há vazamento além do que o histórico guarda por definição: com teto, o retido cai na proporção do
teto. Os 1.306 bytes por ato batem com a ordem de grandeza que o ADR-009 mediu (461 bytes por ato de
alvo único; aqui cada ato toca cinco nós ou uma posição).

A conta que interessa para a decisão: uma sessão de oito horas com um ato a cada três segundos são
~9.600 atos, ou **~12 MiB** de histórico. Cabe numa aba sem discussão.

Tarefas longas: 2 a 4 em 600 atos, a pior de 72–83ms. São os `fitView` do canvas, não os atos.

### Achado 6 — a rede de segurança falha para o lado certo

Doze formas de rascunho quebrado — vazio, nulo, lixo binário, JSON truncado, JSON sem modelo, versão
futura, modelo que não é objeto, array no lugar do objeto, texto que não é mermaid — e, no navegador,
**três recarregamentos de aba com o rascunho corrompido de propósito**. Em nenhum caso a aba deixou de
montar: o app abre como sessão nova, com o aviso do que aconteceu.

É o requisito que separa rede de segurança de arquivo. Um rascunho ilegível que derruba a aba não custa
uma sessão — custa **todas as sessões seguintes**, até a pessoa descobrir sozinha como limpar o
navegador.

O campo `versao` no cabeçalho é o que torna isso possível de manter: um rascunho gravado por uma versão
futura do formato é recusado com aviso, não interpretado por engano.

### Achado 7 — o que **não** volta, dito em número

O histórico não sobrevive à aba: 5 entradas antes do `reload()`, **0** depois, nos seis cenários. Não é
acidente — é consequência do ADR-009 (a pilha é da sessão) e do discovery (rede de segurança, não
arquivo). Fica registrado como número medido em vez de suposição, porque é a diferença entre "reabri e
continuei" e "reabri e posso desfazer o que fiz ontem".

## Limites conhecidos deste spike

Escrito para não superestimar o veredito:

- **Não são horas de relógio.** 600 atos pelo app em 14 segundos e 15.000 na camada de modelo em Node.
  O que degrada por **tempo** e não por volume — timers acumulados, fragmentação de heap, o navegador
  descartando a aba em segundo plano — este spike não vê. É a ressalva dos cinco ADRs anteriores
  estreitada, não eliminada.
- **A carga é sintética.** Rotular e mover em laço, com a mesma forma de seleção. Uma sessão real
  intercala colar, desfazer, digitar no código e trocar de tipo de diagrama.
- **O desgaste de escrita não foi medido.** 100 KiB gravados a cada ato durante horas é I/O que o
  relógio do JavaScript não enxerga. É o que sustenta a escolha conservadora da política, não uma
  medição.
- **Sem teste de aba fechando de verdade.** `reload()` é recarregar, não fechar. `pagehide`,
  `visibilitychange`, aba descartada por falta de memória e crash do navegador não foram exercitados —
  e é justamente aí que a política de "quando gravar" deixa a sua janela de perda.
- **Uma aba só.** Duas abas do produto abertas ao mesmo tempo escrevem na mesma chave, e a última a
  gravar vence. O discovery não tem colaboração, mas tem a pessoa abrindo duas abas — não medido.
- **O armazém tem teto, e o teto não foi provocado.** ~5 MiB por origem no armazém síncrono; o pior
  caso medido (109,6 KiB) está longe disso, mas ninguém testou o que o produto faz quando a escrita
  falha por cota.
- **A restauração assíncrona é outro caminho.** O braço do IndexedDB restaura por efeito, depois da
  primeira pintura; o síncrono restaura antes de montar. O que a pessoa vê nesse intervalo não foi
  medido.
- **Uma máquina, sem GPU.** Mesmo Ryzen 7 5800H em WSL2 dos ADR-004 a 009. Lê-se com confiança a razão
  entre os braços (7,3× de tamanho, 0,7ms contra 22,4ms, 1,1× de degradação), não o valor absoluto. Os
  números acima são os do `resultados/veredito.json` e do `resultados/durabilidade.json` deste
  repositório.
