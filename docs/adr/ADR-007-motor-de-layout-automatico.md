# ADR-007 — Motor de layout automático

- **Status:** Aceito
- **Data:** 2026-07-20
- **Decisores:** Tuyoshi Vinicius
- **Evidência:** docs/adr/spikes/ADR-007-motor-de-layout-automatico/ — spike de execução que mede os
  três lugares possíveis para pendurar o layout (global a cada edição, colocação local, híbrido) em
  dois motores — **dagre 1.1.8** e **elkjs 0.9.3** — tendo o **mermaid 11.16.0 de verdade como oráculo
  de posição**: do SVG do `mermaid.render()` se extrai a coordenada de cada nó e se compara a ordem de
  leitura com a do nosso layout. 53/53 checagens passaram (24 em Node, 29 em Chromium headless). O
  veredito vem dos braços de controle: o layout global custa **108ms de uma tecla de 131ms** no
  envelope do ADR-004, e criar **um** nó reposiciona **28% a 86%** dos nós existentes.

## Contexto

Esta decisão existe porque o motor de layout é o item que **quatro ADRs empurraram adiante**, cada um
registrando por escrito que não o tocava:

- O **ADR-002** o deixou aberto ao escolher a engine de canvas.
- O **ADR-003** o rebaixou ao `plan.md` da feature que o exigisse.
- O **ADR-004** fixou o envelope de fluidez (400 nós / 500 conexões) com o canvas em **grade fixa**, e
  anotou que o layout *"roda sobre o mesmo orçamento de frame e consome do envelope"*.
- O **ADR-005** e o **ADR-006** repetiram a ressalva palavra por palavra: a grade continua fixa, e o
  motor, intocado.

O que o discovery pendura nesse braço são três frases que não são compatíveis por padrão. A primeira
quer que o layout **rode**: *"o layout automático dá o ponto de partida e a pessoa reorganiza o que
precisar enquanto pensa"*. A segunda quer que ele **concorde com o do mermaid**: *"o layout que o
destinatário do código vê é o calculado pelo motor de layout"*. A terceira transforma as duas em
promessa de confiança: *"ela sabe que o código que copia é exatamente o diagrama que está vendo"*. E o
`### Faz` ainda exige *"alterar a configuração de layout do mermaid (layout hierárquico/adaptativo e
orientações)"*.

A pergunta parecia ser **qual motor**. O spike responde que essa é a menos importante das duas
perguntas: dagre e ELK **empatam** no envelope (140,3ms contra 142,4ms), e nenhum dos dois chega perto
da barra de 50ms do ADR-004. A pergunta que decide é **onde** o layout roda.

Nada disso tinha evidência de execução de nenhum tipo.

## Decisão

**O layout automático é um gesto explícito da pessoa, não uma consequência da edição. Nenhuma edição
dispara layout global; o nó novo nasce por colocação local; e a posição movida à mão é dado de sessão
que sobrevive ao layout quando ele é acionado.**

Em cinco compromissos decidíveis, cada um provado no spike:

1. **Nenhuma edição dispara layout global.** Digitar no código, criar, mover ou conectar não recalcula
   o diagrama inteiro. É aritmética, não gosto: no envelope do ADR-004 o layout sozinho custa **108ms
   de uma tecla de 131ms**, contra **21,5ms** de tecla inteira com colocação local.
2. **O nó novo nasce por colocação local** — adjacente a quem o criou, na direção da orientação, sem
   mover mais nada. É o gesto do ciclo principal do ADR-005, e ele passa de **153,1ms** (layout global
   por nó) para **41,0ms**.
3. **"Organizar" é um gesto explícito**, e é ele — e só ele — que roda o layout global. O custo de
   ~140ms passa a ser aceitável porque a pessoa o pediu e está esperando por ele, em vez de ser
   surpreendida por ele no meio de uma frase.
4. **A posição movida à mão é preservada quando o layout roda** (desenho **híbrido**: o layout global
   é calculado e as posições manuais são reimpostas por cima). Nenhum motor preserva sozinho —
   **0/13** no dagre e **0/13** no ELK interativo. O híbrido preserva **13/13**, ao preço declarado de
   **9 pares de caixas sobrepostas** em 100 nós.
5. **O motor é o dagre**, com o ELK mantido como a opção de "layout adaptativo" que o `### Faz` pede.
   O dagre é a família que o mermaid usa por padrão, o que sustenta a concordância do ponto seguinte, e
   é **3× mais rápido no caso comum** (4,5ms contra 13,5ms no documento realista).

**Descartado: rodar o layout global a cada mudança do modelo.** Reprova por duas razões independentes,
e qualquer uma bastaria. Pelo tempo: 108ms dos 131ms da tecla no envelope, 282ms no denso. E pelo
**churn**: criar **uma** caixa move de **28% a 86%** dos nós que já estavam lá — no envelope, 112 dos
400 — com o diagrama se reorganizando embaixo da mão de quem está no meio do ciclo que o discovery
chama de inegociável.

**Descartado também: o modo interativo do ELK como preservador do arranjo manual.** Entrou no spike
como a saída esperada e é o pior dos três em churn (96% a 100%). O modo usa as posições como dica de
**ordenação**, não como âncora de **coordenada**: preserva quem vem antes de quem, e reescreve onde
cada um fica.

## Consequências

**Fica mais fácil.**

- **O item aberto desde o ADR-002 fecha, e fecha sem revisitar nada.** O envelope do ADR-004 continua
  de pé porque o layout saiu do caminho de edição: a tecla no envelope é 21,5ms com colocação local,
  contra os 15,5ms que o ADR-006 mediu sem layout nenhum. A diferença é o custo dos handles de aresta,
  não do layout.
- **A promessa de confiança do discovery ganha medição.** Em **9 dos 10** documentos do corpus e nas
  **quatro** orientações, a ordem de leitura do nosso layout é **idêntica** à do mermaid — 0 pares fora
  de ordem. "O código que ela copia é exatamente o diagrama que está vendo" deixa de ser esperança.
- **A PRD ganha NFRs binários e verificáveis por máquina**: nenhuma edição reposiciona nó existente;
  criar um nó por teclado fica dentro da barra de tecla do ADR-004; a ordem de leitura do canvas
  coincide com a do mermaid fora de agrupamento. São a forma que a `constitution` do Spec Kit converte
  em princípio decidível com limiar.
- **A escolha do motor deixa de ser um risco.** Os dois são determinísticos (6/6), os dois respeitam as
  quatro orientações (12/12 arestas na direção), e eles empatam onde importa. Trocar de motor depois é
  decisão de segunda ordem, não uma volta ao ponto de partida.

**Fica mais difícil.**

- **"Organizar" vira uma decisão de produto com semântica própria.** Quando a pessoa aciona o layout,
  o diagrama muda debaixo dela — é o que ela pediu, mas ainda precisa de resposta para: a câmera
  acompanha? dá para desfazer? o que acontece com as posições manuais que ela **não** quer manter? É a
  mesma classe de pergunta que o ADR-005 abriu para a câmera no fluxo por teclado.
- **A colisão do híbrido é um problema declarado e não resolvido.** Preservar a posição da pessoa
  produz caixa em cima de caixa — 9 pares em 100 nós. O spike conta; não desempata. Empurrar vizinhos
  para abrir espaço é outro algoritmo, com outro custo, e ele entra no `plan.md` de quem implementar.
- **A qualidade do arranjo por colocação local se degrada, e ninguém sabe a que ritmo.** Churn zero é
  por construção; o preço é que 100 caixas criadas uma ao lado da outra não formam um diagrama bem
  disposto. Isso transforma o gesto "organizar" de conveniência em necessidade — e a frequência com
  que ele precisa ser acionado não foi medida.
- **O agrupamento é dívida datada.** O nosso layout não faz layout de cluster e o mermaid faz: no
  documento realista isso dá **35%** dos pares fora de ordem, e a sonda de controle mostra que o mesmo
  documento achatado concorda **100%**. O discovery promete agrupamentos no `### Faz`; enquanto não
  houver cluster, o canvas e o código divergem exatamente ali.
- **A posição vira estado de sessão de primeira classe.** Ela já não existia no modelo por decisão do
  ADR-003; agora ela também não pode ser recalculada à vontade, porque recalcular destrói trabalho.
  É mais uma invariante do tipo que uma refatoração inocente derruba sem quebrar teste nenhum.

**Trade-offs aceitos.**

- **Só Flowchart, e só dois motores.** Class, State, ER e Sequence não foram dispostos. Sequence segue
  sendo o suspeito declarado desde o ADR-002: uma sequência temporal de mensagens não é um grafo livre,
  e "layout hierárquico" pode não significar nada ali.
- **O p95 do ciclo local estoura a barra.** 41,0ms de mediana cabem nos 50ms; o p95 de 74,8ms não. O
  ADR-005 já havia avisado que "cada controle pendurado por elemento tem que provar que não está
  montado onde não é usado", e os handles de aresta acrescentados aqui aparecem nesse número.
- **As arestas não são roteadas.** O dagre calcula pontos de curva por aresta e nós os descartamos; a
  engine desenha a própria curva entre os handles. Se um dia a aresta precisar desviar de nós, esse
  custo entra e não está medido.
- **Uma configuração de ELK, não todas.** O braço interativo usa quatro estratégias `INTERACTIVE`. O
  que o ADR afirma é que o modo interativo **como documentado para preservar layout** preserva ordem,
  não coordenada — não que nenhuma configuração do ELK conseguiria.
- **Ninguém sentiu o churn.** 28% dos nós se movendo é número, não reação. Se incomoda, e a partir de
  quanto, é pergunta para gente usando o produto.
- **Uma máquina, sem GPU.** Mesmo Ryzen 7 5800H em WSL2 do ADR-004/005/006. Lê-se com confiança a
  razão entre os braços (6× entre layout global e colocação local no envelope), não o valor absoluto.

**Limites conhecidos — o que este ADR não decide.**

- **Como o gesto "organizar" aparece.** Botão, atalho, item de menu, e o que ele faz com a câmera e com
  o desfazer — é design que cabe no `spec.md`/`plan.md` da feature.
- **O algoritmo de desempate da colisão.** Fica registrado que ele é necessário, não qual é.
- **Layout de cluster para agrupamento.** É a divergência medida no Achado 4 do spike, e endereçá-la é
  trabalho da feature que trouxer agrupamentos.
- **Sessão longa.** Cada cenário do spike dura segundos, igual aos ADR-004/005/006. Se o arranjo
  degrada, vaza ou perde qualidade ao longo de horas, este spike não vê.

## Status

Proposto → **Aceito**.
