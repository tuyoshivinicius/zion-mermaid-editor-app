# Spike ADR-007 — onde o motor de layout pode morar sem atrapalhar quem está pensando?

Evidência de execução do [ADR-007 — Motor de layout automático](../../ADR-007-motor-de-layout-automatico.md).
Código descartável: existe para produzir um veredito, não para virar base do produto.

## A pergunta

O motor de layout é o item que **quatro ADRs empurraram adiante**, cada um registrando por escrito que
não o tocava:

- O **ADR-002** o deixou aberto ao escolher a engine.
- O **ADR-003** o rebaixou ao `plan.md` da feature que o exigisse.
- O **ADR-004** fixou o envelope de fluidez com o canvas em **grade fixa** e anotou que o layout
  *"roda sobre o mesmo orçamento de frame e consome do envelope"*.
- O **ADR-005** e o **ADR-006** repetiram a ressalva: a grade continua fixa, e o motor, intocado.

Enquanto isso o discovery pendura três frases nele, e elas não são compatíveis por padrão:

> *"O layout automático dá o ponto de partida e a pessoa reorganiza o que precisar enquanto pensa."*
> *"O layout que o destinatário do código vê é o calculado pelo motor de layout."*
> *"Ela sabe que o código que copia é exatamente o diagrama que está vendo."*

A primeira frase quer que o layout **rode**. A segunda quer que ele **concorde com o do mermaid**. A
terceira transforma as duas em promessa de confiança. E o `### Faz` ainda exige *"alterar a
configuração de layout do mermaid (layout hierárquico/adaptativo e orientações)"*.

A pergunta que só se resolve rodando:

> **Onde** o motor de layout pode ser pendurado sem estourar o envelope do ADR-004 nem desmanchar o
> trabalho que a pessoa já fez — e o layout que ela vê concorda com o que o mermaid desenha para o
> destinatário do código?

Note que a pergunta não é *qual motor*. Essa era a pergunta esperada, e o spike responde que ela é a
menos importante das duas.

## O que foi rodado

`@dagrejs/dagre` **1.1.8** · `elkjs` **0.9.3** · `mermaid` **11.16.0** como oráculo ·
`@xyflow/react` 12.11.2 · React 18 · Vite 5 · Chromium headless via Playwright · 1440×900 ·
Linux WSL2, AMD Ryzen 7 5800H, 8 vCPU, sem GPU.

```
npm install
npm run layout    # 24 checagens em Node — custo, churn, arranjo manual, ciclo
npm run build
npm run verify    # 29 checagens no navegador — oráculo mermaid + latência real
```

Corpus: os mesmos **10 documentos** do ADR-006, para os números serem comparáveis com os de lá.

**Três motores e um não-motor**, em `src/layout.js`:

| | o que é |
|---|---|
| `dagre` | hierárquico — a família que o mermaid usa por padrão |
| `elk` | adaptativo (`elk.algorithm: layered`) — o que o mermaid oferece via `@mermaid-js/layout-elk` |
| `elk-interativo` | o mesmo ELK lendo as posições atuais como dica de ordenação |
| `local` | **nenhum motor**: o nó novo nasce ao lado de quem o criou, e nada mais se mexe |

O `local` é o braço de controle que decide o spike — o mesmo papel que o `tolerante=0` teve no ADR-006.

> **O mermaid de verdade é o juiz da concordância.** Do SVG do `mermaid.render()` se extrai a
> **posição** de cada nó (o ADR-006 extraía o conteúdo). A comparação é de **ordem de leitura**, não
> de coordenada: o mermaid dimensiona cada caixa pelo rótulo e nós usamos caixa de tamanho fixo, então
> coordenada não tem como bater por construção. O que pode bater — e é o que a pessoa reconhece como
> "é o mesmo diagrama" — é a ordem em que os nós aparecem ao longo da orientação.

## Veredito: **o layout é um gesto, não uma consequência da edição**

**53/53 checagens passaram** (24 em Node, 29 no navegador). O placar não é o achado. Os achados são
três, e os dois primeiros matam o desenho óbvio — "rodar o layout sempre que o modelo muda" — por
razões independentes.

| Verificação | Resultado |
|---|---|
| A ordem do nosso layout bate com a do mermaid | **9/10 documentos, 0% fora de ordem** |
| ... nas quatro orientações do `### Faz` | **4/4, 0% fora de ordem** |
| Único ponto de divergência | **agrupamento** (`subgraph`) — 35%, com causa isolada por sonda |
| Layout global cabe no orçamento da tecla, no envelope 400/500 | **não** — 131ms, dos quais 108ms de layout |
| Colocação local cabe | **sim** — 21,5ms (o ADR-006 mediu 15,5ms sem layout nenhum) |
| Criar um nó e re-rodar o layout global move o diagrama existente | **28% a 86% dos nós** |
| ... com colocação local | **0%** |
| O que a pessoa moveu à mão sobrevive a um layout global | **0/13** — em qualquer motor |
| Os dois motores são determinísticos | 6/6 |

### Achado 1 — o custo do layout é do tamanho do diagrama, e ele estoura a tecla

O layout global custa, medido isolado em Node:

| Cenário | dagre | elk |
|---|---|---|
| realista (13 nós) | 4,5ms | 13,5ms |
| 50 nós / 60 conexões | 22,0ms | 38,3ms |
| 100 nós / 120 conexões | 26,9ms | 43,9ms |
| **envelope ADR-004 (400/500)** | **140,3ms** | **142,4ms** |
| denso (800/1000) | 351,1ms | 266,7ms |

No app rodando, com o layout no caminho de edição, a tecla no editor de código:

| Cenário | Total | p95 | Só o layout |
|---|---|---|---|
| pequeno · layout global | 4,6ms | 12,9 | 0,9ms |
| 100/120 · layout global | 30,5ms | 71,9 | 23,6ms |
| **envelope 400/500 · layout global** | **131,2ms** | **246,4** | **108,4ms** |
| **envelope 400/500 · colocação local** | **21,5ms** | **35,7** | **1,1ms** |
| denso 800/1000 · layout global | 335,5ms | 533,9 | 281,6ms |

E o gesto que o ADR-005 provou por teclado — criar uma caixa ligada à anterior:

| Desenho | Criar 1 nó | p95 |
|---|---|---|
| layout global por nó | **153,1ms** | 238,6 |
| colocação local | 41,0ms | 74,8 |

Três leituras:

1. **O motor não é a escolha que importa.** dagre e ELK empatam no envelope (140 contra 142ms). O
   ELK ganha no denso, o dagre ganha no pequeno, e nenhum dos dois chega perto da barra de 50ms que o
   ADR-004 fixou. Escolher entre eles é decisão de segunda ordem; **onde** pendurar o layout é a de
   primeira.
2. **O layout sozinho é 83% da tecla.** No envelope, 108ms de uma tecla de 131ms. O parse do ADR-006
   custa 7,3ms nessa mesma tecla — o gargalo mudou de dono.
3. **A colocação local devolve a tecla ao patamar do ADR-006.** 21,5ms contra os 15,5ms medidos lá sem
   layout nenhum; a diferença é o custo dos handles de aresta, acrescentados neste spike.

### Achado 2 — mesmo se coubesse no tempo, o churn inviabilizaria

Este achado é independente do primeiro e sozinho já decide. Criar **um** nó e re-rodar o layout
global move os nós que já estavam lá — percentual **depois de descontar a translação do conjunto**,
que uma câmera que reenquadra esconderia:

| Cenário | dagre | elk | elk-interativo | local |
|---|---|---|---|---|
| realista | 50% | 92% | 100% | **0%** |
| 50 nós | 24% | 2% | 96% | **0%** |
| 100 nós | 82% | 86% | 96% | **0%** |
| envelope 400/500 | 28% | 79% | 100% | **0%** |

No envelope, o dagre desloca 112 dos 400 nós existentes porque a pessoa criou **uma** caixa. Não há
número de milissegundos que conserte isso: o diagrama se reorganiza embaixo da mão de quem está no
meio do ciclo do ADR-005 — o mesmo ciclo que o discovery chama de inegociável.

O `elk-interativo` foi incluído esperando ser a saída, e é o pior dos três. O modo interativo do ELK
usa as posições como dica de **ordenação**, não como âncora de **coordenada**: ele preserva quem vem
antes de quem, e reescreve onde cada um fica.

### Achado 3 — o arranjo manual não sobrevive a nenhum layout global, e preservá-lo tem preço em pixel

O discovery diz que *"a pessoa reorganiza o que precisar enquanto pensa"*. Movendo 20% dos nós à mão e
rodando o layout de novo, quantos ficaram onde ela largou (a menos de meia caixa):

| Resposta do produto | Sobreviveram | Preço |
|---|---|---|
| dagre (recalcula tudo) | **0/13** | desvio médio de 243,6px |
| elk-interativo | **0/13** | preserva ordem, não coordenada |
| **híbrido** (layout global + posição manual reimposta por cima) | **13/13** | **9 pares de caixas sobrepostas** |

`resultados/hibrido-colisoes.png` é esse estado: o rodapé diz `13 movidos à mão`, e há caixa em cima
de caixa. O híbrido é o único desenho que honra a frase do discovery, e ele não é de graça — reimpor
posição escolhida por gente sobre um layout calculado sem ela produz colisão, e alguém precisa
decidir o que fazer com ela.

### Achado 4 — a concordância com o mermaid é perfeita, menos no agrupamento

Em **9 dos 10** documentos do corpus, e nas **quatro** orientações, a ordem de leitura do nosso layout
é **idêntica** à do mermaid: 0 pares fora de ordem. Isso sustenta diretamente a frase de confiança do
discovery — o que ela vê é o que o destinatário vê.

A exceção é o documento realista, com **35%** dos pares fora de ordem. A causa não ficou como
suposição; virou sonda:

| Documento | Com agrupamento | Sem agrupamento |
|---|---|---|
| `04-subgraphs.mmd` | 0% | 0% |
| `10-arquitetura-real.mmd` | **35%** | **0%** |

O mermaid faz layout de **cluster** para `subgraph`; o nosso motor recebe o grafo achatado. Achatado, o
mesmo documento concorda perfeitamente. O `04` não diverge porque é pequeno e quase linear — não há
arranjo alternativo a escolher.

O discovery promete *"adicionar agrupamentos nos tipos de diagrama que os comportam"*, então essa
divergência é dívida datada, não curiosidade.

> **Uma divergência de 35% apareceu antes desta, e era bug do harness.** A primeira rodada forçava
> `TB` no nosso layout para todo documento, enquanto o documento declarava `LR`. Os 73% que apareceram
> mediam o meu erro. A orientação passou a vir do modelo, e o número caiu para os 35% reais — que a
> sonda então explicou. Fica registrado porque um harness que erra sozinho erra de novo.

### Achado 5 — o que já estava decidido continua de pé

- **Os dois motores são determinísticos.** Mesmo modelo, duas rodadas, posições idênticas — em 6/6.
  Sem isso, "duas vistas da mesma verdade" não se sustentaria nem entre duas rodadas da mesma vista.
- **As quatro orientações funcionam nos dois motores**, 12/12 arestas na direção esperada em cada uma.
  O `### Faz` está coberto no nível do motor.
- **O serializador continua fora do caminho crítico**, como o ADR-004 já havia medido: a posição não
  entra no código, então o layout não toca o texto que a pessoa copia.

## Limites conhecidos deste spike

Escrito para não superestimar o veredito:

- **Só Flowchart, e só dois motores.** Class, State, ER e Sequence não foram dispostos. Sequence
  segue sendo o suspeito declarado desde o ADR-002: uma sequência temporal de mensagens não é um
  grafo livre, e "layout hierárquico" pode não significar nada ali.
- **O nosso layout não faz cluster.** É a divergência do Achado 4, e ela não foi contornada — foi
  medida e explicada. Um layout de cluster é trabalho a mais, e o custo dele não está em nenhum
  número acima.
- **A colocação local não foi medida ao longo de uma sessão.** Ela tem churn zero por construção, mas
  nada garante a **qualidade** do arranjo depois de 100 caixas criadas uma ao lado da outra. O spike
  criou 20 e mediu o custo, não o resultado. É o ponto onde o gesto explícito de "organizar" deixa de
  ser conveniência e vira necessidade — e ninguém mediu com que frequência ele seria acionado.
- **O desempate da colisão do híbrido não existe.** O spike conta os pares sobrepostos; não resolve
  nenhum. Empurrar vizinhos para abrir espaço é outro algoritmo, com outro custo.
- **O p95 do ciclo local estoura a barra.** 41,0ms de mediana cabem nos 50ms; o p95 de 74,8ms não. O
  custo dos handles de aresta acrescentados aqui aparece nesse número, e o ADR-005 já havia avisado
  que "cada controle pendurado por elemento tem que provar que não está montado onde não é usado".
- **As arestas não são roteadas.** O dagre calcula pontos de curva para cada aresta e nós os
  descartamos — a engine desenha a sua própria curva entre os handles. Um dia em que o produto quiser
  a aresta desviando de nós, esse custo entra e não está medido.
- **Uma configuração de ELK, não todas.** O `elk-interativo` usa quatro estratégias `INTERACTIVE`;
  o ELK tem dezenas de opções e alguma combinação pode se sair melhor. O que o spike afirma é que o
  modo interativo **como documentado para preservar layout** preserva ordem, não coordenada.
- **Ninguém sentiu o churn.** 28% dos nós se movendo é um número, não uma reação. O spike mede o
  deslocamento; se ele incomoda, e a partir de quanto, é pergunta para gente usando o produto.
- **Uma máquina, sem GPU.** Mesmo Ryzen 7 5800H em WSL2 do ADR-004/005/006. Lê-se com confiança a
  razão entre os braços (6× entre layout global e colocação local no envelope), não o valor absoluto.
