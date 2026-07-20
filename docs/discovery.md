# Discovery — Editor visual de diagramas mermaid

Superfície de uso: sim

## Visão

Um editor visual para quem diagrama pesado: a pessoa monta o diagrama sem largar o teclado e leva
embora o código mermaid como produto final.

## Persona principal — Marina

Marina é definida pela **intensidade de uso, não pelo domínio**. O caso mais frequente é documentar
arquitetura de software, mas a mesma Marina pode ser a PM desenhando uma jornada de usuário ou a
modeladora montando um diagrama entidade-relacionamento. O que a define é o volume: sessões longas,
dezenas de elementos, e o ciclo *criar caixa → definir o tipo → escrever o rótulo → conectar →
rotular a conexão → definir o tipo da conexão* repetido até a mão cansar.

As três dores que ela relata — a quantidade de cliques por elemento, a alternância entre teclado e
mouse, e trazer texto de fora para dentro dos rótulos — pesam igualmente, e são sintoma de uma só:
**cada elemento custa caro para nascer**. Marina não quer uma ferramenta com mais recursos; quer que
o custo unitário de materializar um elemento caia perto de zero.

O que ela leva embora nunca é a tela: é o código mermaid.

## Escopo

O que entra no `### Faz` passa por um gate: só entra capacidade que **baixe o custo unitário de
materializar um elemento** em pelo menos uma das três dores da persona. E capacidade nova entra
absorvendo ou aposentando uma linha existente; quando não há o que absorver, entra como exceção
declarada — o bloco cresce por exceção, não por padrão.

### Faz

**Criar e editar elementos**

- Criar nós, conexões e agrupamentos diretamente na área visual.
- Adicionar e editar o rótulo dos nós e o texto contido nas conexões.
- Oferecer os shapes compatíveis com cada tipo de diagrama.
- Trocar o tipo, shape ou estilo de um elemento já criado — ou de uma seleção inteira de uma vez —
  sem precisar recriá-lo.
- Repetir a última alteração em outro elemento, sem refazer o caminho até o controle.
- Selecionar (individual e múltipla), mover, duplicar e excluir nós, conexões e agrupamentos.
- Reconectar uma conexão para outro nó de origem ou destino.
- Copiar e colar elementos preservando seus estilos.
- Desfazer e refazer ações; um ato aplicado a uma seleção inteira desfaz como um só.

**Fluxo por teclado**

- Executar o ciclo principal — criar caixa → rotular → conectar → rotular a conexão — de ponta a
  ponta, sem alternar para o mouse.

**Estilo e estrutura**

- Customizar tipo de seta, tipo de linha e cor das conexões.
- Alterar cor de fundo, estilo e cor de borda, e estilo de texto (formatação, cor, tamanho) dos nós
  — dentro do que cada tipo de diagrama consegue expressar em código (ver a restrição no não-faz).
- Adicionar agrupamentos nos tipos de diagrama que os comportam.
- Alterar a configuração de layout do mermaid (layout hierárquico/adaptativo e orientações).

**Diagrama e código**

- Escolher e trocar o tipo de diagrama entre Flowchart, Class, State, Sequence e ER.
- Escrever mermaid no editor de código e ver a prévia acompanhar conforme digita; colar um código
  mermaid já pronto.
- Sinalizar o erro de sintaxe ao editar o código, sem que a prévia quebre ou se perca.
- Copiar o código mermaid gerado com um clique — é o produto final.

**Área de trabalho**

- Redimensionar o editor de código e a área do diagrama.
- Navegar na área do diagrama com zoom e movimentação por cursor hand.
- Ajustar o diagrama à tela e resetar o zoom.
- Recuperar o rascunho em curso ao reabrir a aba.

### Não faz

Recusas conscientes, não omissões:

- **Não é um repositório de diagramas** — sem contas, sem biblioteca, sem pastas. O rascunho em
  curso sobrevive a fechar e reabrir a aba como rede de segurança, não como arquivo.
- **Não leva posição de nó no código entregue** — arrastar é ferramenta de raciocínio durante a
  edição; o layout que o destinatário do código vê é o calculado pelo motor de layout.
- **Não oferece estilo que não vira código** — se um tipo de diagrama não expressa aquele estilo em
  mermaid, o controle não existe ali. Nada de estilo decorativo que some na entrega.
- **Não exporta imagem** (PNG, SVG ou qualquer formato de imagem) — o produto final é o código;
  quem quiser imagem renderiza o código em outro lugar.
- **Não gera diagrama por IA** — o diagrama nasce das mãos da pessoa, não de um prompt em linguagem
  natural.
- **Não presume a próxima escolha** — o elemento novo nasce neutro, sem herdar tipo ou estilo do
  anterior. Os elementos de um diagrama alternam por natureza, e escolher o tipo de cada um é
  decisão dela, não repetição a automatizar.
- **Não cobre outros tipos de diagrama mermaid** — gantt, mindmap, journey, gitgraph, C4, timeline,
  pie e afins ficam fora. O escopo é congelado nos cinco tipos nomeados.
- **Não tem colaboração nem compartilhamento** — sem edição simultânea, link compartilhável ou
  comentários de revisão. O artefato compartilhável é o próprio código.

## Estrutura do produto

Três decisões de desenho tomadas na descoberta, que enquadram tudo o que vem depois:

**O modelo interno é o centro.** Ele recebe edições vindas do canvas e do editor de código, e
propaga para os dois. Canvas e código são duas vistas da mesma verdade — nunca duas verdades que
precisem ser reconciliadas.

**A posição é conforto de sessão.** O layout automático dá o ponto de partida e a pessoa reorganiza
o que precisar enquanto pensa; essa posição vive no modelo e não viaja no código. Estrutura e
estilo viajam.

**Os tipos avançam por família de modelo mental**, não em paridade uniforme. Grafo dirigido
(Flowchart e State) é o núcleo e recebe profundidade total primeiro; nós estruturados (Class e ER)
vêm em seguida; Sequence é o último, por ser uma sequência temporal de mensagens entre participantes
e não um grafo livre — precisa de vocabulário de interação próprio. Essa ordem governa o
**vocabulário** de cada tipo — quais shapes existem, que estilo o código expressa —, não os **gestos
de edição**: aplicar uma alteração a uma seleção ou repetir a última valem igualmente nos cinco
tipos desde o começo.

**O peso das três dores muda conforme o momento.** Dentro do ciclo principal a alternância entre
teclado e mouse pesa mais que a quantidade de cliques, e o teclado é inegociável. Fora dele, no
ajuste depois da criação, os cliques pesam mais e a mão no mouse é legítima. É o que desempata
quando uma capacidade corta cliques mas puxa a mão para o mouse.

## Experiência

Marina abre o editor para uma sessão longa e sai dela com código para colar num documento. Entre uma
coisa e outra ela materializa dezenas de elementos, e é aí que o produto ganha ou perde: ela percebe
que **pensa mais do que opera**. O caminho entre ter uma caixa em mente e ter a caixa no diagrama,
rotulada e conectada, é curto o bastante para não interromper o raciocínio — ela não sente a troca
entre teclado e mouse no ciclo principal, não procura onde clicar para mudar o tipo de um elemento,
e não refaz à mão, elemento por elemento, um ajuste que já decidiu uma vez na mesma sessão.

A ferramenta responde no tempo do pensamento: a mudança aparece no diagrama e no código sem espera
perceptível, e a densidade do diagrama não muda essa sensação — diagrama grande continua fluido. Ao
errar a sintaxe no código, Marina percebe onde errou sem perder de vista o que já construiu; o
trabalho nunca desaparece por causa de um caractere.

Depois de horas, o que ela sente é o cansaço de ter pensado, não o de ter operado. E ela confia na
ferramenta: sabe que o código que copia é exatamente o diagrama que está vendo, e que fechar a aba
sem querer não custa a sessão.
