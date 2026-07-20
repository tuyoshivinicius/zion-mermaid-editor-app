# ADR-004 — Fluidez em diagrama denso

- **Status:** Aceito
- **Data:** 2026-07-20
- **Decisores:** Tuyoshi Vinicius
- **Evidência:** docs/adr/spikes/ADR-004-fluidez-em-diagrama-denso/ — spike de execução que
  cronometra a propagação completa (gesto → modelo → canvas + código, até depois do paint) numa
  matriz de 17 cenários de densidade, com `@xyflow/react` 12.11.2 em Chromium 149 headless. Cada
  cenário valida que mediu alguma coisa — a edição precisa ter chegado às duas vistas — e 17/17
  passaram nessa checagem. Duas medições por gesto (até o paint e só-trabalho via `flushSync`),
  porque a primeira sozinha tem piso de um frame e não distingue 2ms de 15ms.

## Contexto

Esta decisão existe porque três ADRs empurraram a mesma promessa adiante sem prová-la.

O discovery promete, em prosa, que *"a mudança aparece no diagrama e no código sem espera
perceptível"* e que *"a densidade do diagrama não muda essa sensação — diagrama grande continua
fluido"*. Não é enfeite: a persona é definida pela **intensidade de uso**, e a promessa central do
produto é que depois de horas Marina sinta "o cansaço de ter pensado, não o de ter operado". Uma
ferramenta que engasga aos 200 elementos falha exatamente na pessoa para quem foi feita.

O rastro da delegação está escrito nos próprios ADRs:

- O **ADR-001** fechou a stack e declarou, em *Limite conhecido*, que "nada aqui sustenta essa
  promessa".
- O **ADR-002** escolheu a engine, repassou o risco — "o spike **não** endereça isso: rodou com 4
  participantes e 7 mensagens" — e **acrescentou motivo de suspeita**: ancorar o instante do tempo
  num `Handle` põe `participantes × (mensagens + 1)` handles no DOM, e é justamente o diagrama denso
  que multiplica os dois fatores.
- O **ADR-003** endereçou a promessa por **argumento arquitetural** (modelo em memória mutado
  incrementalmente em vez de re-parse a cada tecla) e registrou, explícito, que o risco "segue sem
  evidência empírica, agora de forma declarada e no lugar certo".

O risco é de **execução**: nenhuma leitura de documentação ou benchmark de terceiro diz como *este*
desenho — modelo próprio como fonte, projetado para nós/arestas da engine e para texto mermaid — se
comporta com *esta* densidade. Só se resolve rodando. E o que estava em jogo não era um ajuste: se a
fluidez não se sustentasse, o ADR-002 (engine) ou o ADR-003 (modelo como fonte) cairia, e com ele a
PRD inteira.

O spike varreu a densidade de 25 a 3.200 nós contra barras declaradas **antes** de medir (Nielsen /
RAIL: edição ≤100ms na mediana, tecla ≤50ms, gesto contínuo ≥50fps), com a memoização da projeção
como variável independente. Três resultados mudam o que está em aberto:

1. **O custo é linear no número de nós**, com constante de ~22µs por nó estável de 100 a 3.200. Não
   há termo quadrático — o argumento arquitetural do ADR-003 se confirma por medição.
2. **A suspeita dos handles não se confirmou.** 2.020 handles custam 1,9ms de trabalho e 60fps,
   enquanto 800 handles espalhados por 400 nós custam 7,6ms. O que pesa é o número de **nós**, não o
   de handles.
3. **O que decide o teto é a projeção.** Com reuso do objeto de nó, o teto medido é ~800 nós; sem
   ele, 400 já reprova e 800 produz 86 tarefas longas de bloqueio da main thread.

## Decisão

**A promessa de fluidez se sustenta sobre o desenho já escolhido; ADR-002 e ADR-003 ficam de pé.** O
que este ADR fixa são as quatro condições sob as quais ela se sustenta.

1. **Envelope de densidade suportado: até 400 nós e 500 conexões.** É o compromisso do produto — a
   faixa em que a edição pontual fica abaixo de 100ms e o gesto contínuo acima de 50fps. Foi medida
   com folga confortável (16,8ms de mediana, p95 26,8ms, 60fps — cerca de 6× abaixo da barra), e fica
   deliberadamente **abaixo do teto medido** de ~800 nós, porque o spike subestima o custo real (ver
   trade-offs). O discovery descreve "dezenas de elementos": o envelope dá uma ordem de grandeza de
   folga sobre o uso descrito.

2. **A projeção do modelo para a vista reusa o objeto de nó quando nada que a vista enxerga mudou.**
   É **restrição de arquitetura, não otimização a fazer depois**: é a única variável do spike que,
   sozinha, move o veredito de passa para reprova dentro do envelope. Toda feature que toque a
   projeção herda essa restrição.

3. **Virtualização de elementos fora do padrão.** `onlyRenderVisibleElements` fica desligado no
   desenho base. Ela resolve a edição em densidade alta, mas transfere o custo para o gesto *"ajustar
   o diagrama à tela"* — capacidade explícita do discovery —, que vai de 44,5ms para 227,8ms em 800
   nós e de 205,9ms para 991,4ms em 3.200. Trocar uma latência frequente e pequena por uma rara e de
   quase um segundo é escolha de produto; fica registrada como **saída conhecida** para o dia em que
   o envelope precisar subir, não como default.

4. **Fora do envelope, o produto degrada declarando, não silenciosamente.** Acima do envelope o
   comportamento esperado é avisar a pessoa, não fingir que continua fluido. *Como* isso se manifesta
   é assunto da feature; o que este ADR fixa é que o limite é conhecido e comunicado.

**Descartado — perseguir densidade ilimitada.** Nenhuma das saídas (virtualizar por padrão, canvas de
baixo nível, renderização incremental própria) entra agora: o envelope cobre o uso descrito no
discovery com uma ordem de grandeza de folga, e o custo dessas saídas é alto e certo enquanto o
benefício é hipotético.

## Consequências

**Fica mais fácil.**

- **O risco pendurado desde o ADR-001 fecha.** A promessa de experiência do discovery deixa de ser
  esperança e vira número: ADR-002 e ADR-003 não precisam ser revisitados por causa de performance
  dentro do envelope.
- **A PRD ganha um NFR com número em vez de um adjetivo.** "Diagrama grande continua fluido" vira
  algo verificável — edição abaixo de 100ms e gesto contínuo acima de 50fps, até 400 nós e 500
  conexões —, que é exatamente a forma que a `constitution` do Spec Kit consegue derivar em princípio
  decidível.
- **O serializador sai da lista de suspeitos.** Projetar o modelo inteiro para mermaid custa 0,2ms em
  800 nós. O par parser/serializador do ADR-003 é caro de **escrever e manter**, não de **rodar** — o
  que remove uma preocupação de performance do caminho crítico e concentra o custo onde ele está: no
  canvas.
- **O desenho de Sequence do ADR-002 fica absolvido no ponto onde era suspeito.** O atrito 4 daquele
  spike (um handle por instante por participante) não é problema de fluidez.

**Fica mais difícil.**

- **A projeção passa a ter uma invariante a proteger.** "Reusar o objeto de nó quando nada visível
  mudou" é o tipo de propriedade que uma refatoração inocente quebra sem quebrar teste nenhum — e o
  sintoma aparece só em densidade alta, longe de onde a mudança foi feita. Precisa de guarda
  explícita, não de boa intenção.
- **O envelope é um compromisso a defender.** Toda capacidade nova que acrescente elementos ao DOM
  por nó — mais handles, decoração, badge, controle na borda — consome orçamento do envelope, e o
  custo por nó é a constante que segura tudo.
- **"Ajustar à tela" vira o gesto caro.** Já custa 44,5ms em 800 nós e cresce com a densidade. É o
  pior caso de pintura do produto, e qualquer decisão futura sobre virtualização piora justamente
  ele.

**Trade-offs aceitos.**

- **Uma máquina, sem GPU.** As medições saíram de Chromium headless em WSL2 num Ryzen 7 5800H de 8
  vCPU. O que o spike lê com confiança é a **curva** (linear) e a **ordem de grandeza** da folga; o
  valor 800 é desta máquina. Máquina modesta terá teto menor — e é parte do motivo de o envelope
  ficar em 400.
- **O spike subestima o custo real, e o envelope absorve isso sem quantificar quanto.** O nó tem
  tamanho fixo na medição, então o custo de o nó crescer com o rótulo não está na conta; e o painel
  de código é um `<pre>`, não um editor com destaque de sintaxe, cursor e seleção. A margem de 2×
  entre o envelope (400) e o teto medido (800) é julgamento, não medição.
- **O caminho texto → modelo continua sem medição.** Não há parser para cronometrar — é o que o
  ADR-003 assume escrever. **Digitar no editor de código** de um diagrama denso segue sem evidência,
  e é o caminho onde o ADR-003 admitiu precisar de *debounce*.
- **Sessão longa não foi medida.** O discovery fala de "sessões longas"; cada cenário do spike dura
  segundos. Degradação por acúmulo e vazamento de memória seguem sem evidência.

**Limites conhecidos — o que este ADR não decide.**

- **Motor de layout automático.** Continua aberto desde o ADR-002 e rebaixado pelo ADR-003 ao
  `plan.md` da feature que o exigir. Este ADR não o toca — mas registra que um motor de layout roda
  sobre o mesmo orçamento de frame e consome do envelope.
- **Os gestos de edição que o spike não cobriu.** Seleção múltipla, aplicar uma alteração a uma
  seleção inteira, desfazer/refazer e colar um diagrama grande de uma vez ficaram de fora. O
  discovery promete que o ato sobre uma seleção inteira desfaz como um só — o custo desse ato em
  densidade alta não foi medido.
- **Class, State e ER.** Só Flowchart e um Sequence simplificado foram medidos. São grafos com nós e
  arestas, então a curva deve valer; "deve" não é "foi medido".
- **Fluxo por teclado.** Segue intocado desde o ADR-002 — todos os gestos medidos, aqui e lá, foram
  de mouse. O discovery chama o teclado de inegociável no ciclo principal, e ele continua sem
  evidência de nenhum tipo.

## Status

Proposto → **Aceito**.
