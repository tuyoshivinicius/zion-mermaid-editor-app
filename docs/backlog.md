> Backlog de specs verticais — a fila de trabalho do harness. Uma linha por spec; **a ordem das
> linhas é a fila de prioridade** (o walking skeleton na frente). Semeado por `/zion-prd-decompose`.
>
> **Colunas de máquina (artefato derivado)** — **Pasta** e **Status** são recomputadas por
> `/zion-prd-trace` (`trace-backlog.sh`), casando `specs/###-<slug>` ⇔ slug por sufixo.
> **Não edite Pasta/Status à mão.** As colunas humanas (Spec/Demo/Âncora de experiência/RFs/Release)
> você preenche e o script preserva. A **primeira tabela** deste arquivo é a canônica (dono do
> script); todo o resto (notas, story map, texto livre) é preservado intacto.

| Spec (slug) | Demo (1 frase) | Âncora de experiência | RFs | Release | Pasta | Status |
|-------------|----------------|-----------------------|-----|---------|-------|--------|
| cano-modelo-codigo | Crio um nó na área do diagrama e vejo a linha nascer no código; edito o código e vejo o nó mudar; copio o código — e a posição para onde arrastei o nó não está nele. | — | RF-19, RF-23 | R0 | — | ☐ pendente |
| elementos-grafo-dirigido | Monto um fluxo com nós, conexões e agrupamentos, escrevo os rótulos e colo dentro deles texto vindo de um documento, e movo, duplico e excluo o que errei — tudo refletido no código. | — | RF-01, RF-02, RF-06 | R1 | — | ☐ pendente |
| area-de-trabalho | Redimensiono o editor de código e a área do diagrama, navego por zoom e cursor hand num diagrama maior que a tela, e ajusto o diagrama à tela de volta. | — | RF-24, RF-25, RF-26 | R1 | — | ☐ pendente |
| ciclo-por-teclado | Materializo nove elementos completos — criados, rotulados, conectados e com a conexão rotulada — sem tirar as mãos do teclado, e cada elemento novo entra na área visível antes de eu digitar o rótulo. | Marina completa o ciclo principal em ≤4 teclas de controle por elemento e 0 alternâncias para o mouse, e a primeira letra que ela digita num rótulo nunca se perde. | RF-10, RF-11 | R1 | — | ☐ pendente |
| desfazer-e-refazer | Desfaço e refaço os últimos atos da sessão, e uma rajada de digitação num rótulo reverte com um Ctrl+Z só, devolvendo estrutura e arranjo juntos. | — | RF-09 | R1 | — | ☐ pendente |
| codigo-de-entrada | Colo um mermaid pronto e obtenho o diagrama; erro a sintaxe e vejo onde, sem que a prévia quebre ou perca o que construí; o rótulo que o tipo não expressa fielmente aparece marcado. | — | RF-20, RF-21, RF-22 | R1 | — | ☐ pendente |
| rascunho-da-sessao | Fecho a aba no meio do trabalho e reabro: diagrama, estilos e o arranjo que fiz à mão voltam; se o rascunho estiver ilegível ou a cota estourada, começo uma sessão nova avisada, nunca uma aba que não monta. | — | RF-27, RF-28 | R1 | — | ☐ pendente |
| tipo-state | Troco o tipo do diagrama para State e monto uma máquina de estados com os mesmos gestos do fluxo, com o código de State saindo do outro lado. | — | RF-18 | R1 | — | ☐ pendente |
| aviso-de-envelope | Ultrapasso os 400 nós do envelope suportado e sou avisada de que saí dele, em vez de o produto seguir engasgando calado. | — | RF-29 | R1 | — | ☐ pendente |
| tipo-class | Escolho Class e monto um diagrama de classes cujos nós têm corpo — membros com visibilidade, tipo e classificador — e relações rotuladas, com o código correspondente. | — | RF-01, RF-02, RF-06, RF-18 | R2 | — | ☐ pendente |
| tipo-er | Escolho ER e monto um entidade-relacionamento com atributos e cardinalidades, com o código correspondente. | — | RF-01, RF-02, RF-06, RF-18 | R2 | — | ☐ pendente |
| tipo-sequence | Escolho Sequence e monto uma conversa entre participantes com blocos loop/alt/opt, e a ordem temporal das mensagens é visível na área do diagrama, não só no código. | — | RF-01, RF-02, RF-06, RF-18 | R3 | — | ☐ pendente |
| teclado-em-sequence | Materializo uma conversa inteira de Sequence sem tirar as mãos do teclado, no vocabulário da família — que não é "criar caixa → conectar". | Marina mantém as ≤4 teclas e as 0 alternâncias também onde o ciclo principal tem outra forma — a conversa nasce no mesmo custo que o fluxo. | RF-10, RF-11 | R3 | — | ☐ pendente |
| estilo-de-elementos | Mudo o tipo de seta, o tipo de linha e a cor de uma conexão, e a cor de fundo, a borda e o texto de um nó — e onde o tipo corrente não expressa aquilo em código, o controle simplesmente não está ali. | — | RF-12, RF-13 | R4 | — | ☐ pendente |
| trocar-em-bloco | Seleciono um elemento — ou trezentos — e troco o shape, o tipo ou o estilo de todos de uma vez, e um só desfazer reverte a seleção inteira. | Marina não refaz à mão, elemento por elemento, um ajuste que já decidiu uma vez: a troca sai em ≤3 passos a partir do elemento já selecionado. | RF-03, RF-04 | R4 | — | ☐ pendente |
| layout-automatico | Aciono organizar e o diagrama se rearranja preservando a posição do que movi à mão; escolho hierárquico ou adaptativo e a orientação; e onde o arranjo dentro de um agrupamento diverge do que o código produz, o produto me declara isso. | — | RF-14, RF-15, RF-16, RF-17 | R4 | — | ☐ pendente |
| repetir-alteracao | Aplico num segundo elemento, com um gesto, a mesma alteração que acabei de fazer no primeiro, sem refazer o caminho até o controle. | — | RF-05 | R4 | — | ☐ pendente |
| reconectar-conexao | Levo a ponta de uma conexão para outro nó de origem ou de destino e o código acompanha, sem eu recriar a conexão. | — | RF-07 | R4 | — | ☐ pendente |
| copiar-e-colar | Copio um trecho do diagrama e colo: os elementos chegam com os estilos que tinham. | — | RF-08 | R4 | — | ☐ pendente |

Legenda de status: ☐ pendente · ◐ em especificação · ● implementada.

## Linhas de release

| | Linha | O que ela é |
|---|---|---|
| **R0** | o cano | prova o `R-03` — diagrama e código como duas vistas de um modelo só — e nada mais |
| **R1** | grafo dirigido | **o ponto de troca de ferramenta**: Flowchart e State em sessão real, espartana |
| **R2** | nós estruturados | Class e ER sobre a mesma base — fecha o risco nº 1 da §10 |
| **R3** | sequência temporal | Sequence, que exige desenho próprio na área do diagrama |
| **R4** | conforto | estilo, ato em bloco, layout, repetir, religar, copiar/colar — nas três famílias de uma vez |

**Release é ponto de troca de ferramenta**: um corte só é release quando basta para uma sessão real
de diagramação, sem obrigar a voltar para a ferramenta antiga no meio do trabalho.

## Story map — o backbone da jornada

```
              ABRIR E        MATERIALIZAR      CORRIGIR        LER/ESCREVER      ARRUMAR PARA      LEVAR       VOLTAR
              ESCOLHER                                          O CÓDIGO         TRABALHAR        EMBORA       DEPOIS
════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
R0            ·              criar um nó       ·               a prévia          ·                copiar o    ·
o cano                       na área                           acompanha                          código
                                                               o código
────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
R1            trocar         nó · conexão      mover           colar código      redimensionar    copiar o    recuperar
grafo         para           agrupamento       duplicar        pronto            editor/diagrama  código      o rascunho
dirigido      State          rotular +         excluir         ver o erro                                     ser avisada
              (2 tipos)      colar de fora     desfazer e      de sintaxe        zoom · pan                   quando não
                             ▸ o ciclo por     refazer         ver a marca de    ajustar à tela               deu
                               teclado                         expressividade    aviso de envelope
────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
R2            trocar para    os mesmos gestos, agora sobre nó que tem CORPO — membros com visibilidade e tipo (Class)
nós estrut.   Class · ER     e sobre entidade/relação com cardinalidade (ER)
────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
R3            trocar para    montar a sequência com desenho próprio na área do diagrama · o ciclo por teclado no
sequência     Sequence       vocabulário da família, que não é "criar caixa → conectar"
────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
R4            ·              repetir a         trocar tipo/    ·                 organizar        ·           ·
conforto                     última alteração  shape/estilo                      posição à mão
                             copiar e colar    em bloco                          preservada
                             com estilo        reconectar                        divergência
                                                                                 declarada
════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
```

Nenhuma família nova acrescenta atividade à jornada — R2 e R3 repõem as mesmas atividades num
vocabulário diferente. É por isso que o custo por família cai (`R-08`: 726 → 631 → 482 linhas).

## Restrições transversais — não são specs

Não têm demo própria, então não viram linha do backlog: toda spec que as toca as carrega.

- **A transação é a unidade do desfazer** (`R-09`). Toda spec que muta o modelo nasce transacional:
  um ato sobre N elementos é uma entrada de histórico, uma rajada de digitação é um ato só, e o
  histórico governa modelo e posição juntos. O `RF-09` (desfazer visível) é spec; a transação não é.
- **O envelope de densidade é orçamento compartilhado** (`R-04`). Cada spec que acrescenta peso por
  elemento mede o próprio consumo e se recusa a estourar as barras do `NFR-03` e do `NFR-04`. Não há
  spec de verificação de envelope.

## Notas de fatiamento

- O `NFR-02` (≤3 passos) é o único NFR sem ADR que o meça. Ele é medido **dentro** da spec
  `trocar-em-bloco`, que é quem o realiza — não há spike próprio para ele.
- As duas questões abertas da §11 — cota do armazém estourada e duas abas na mesma chave — são
  decididas **dentro** da spec `rascunho-da-sessao`.
- As duas dívidas datadas do layout — desempate de colisão de caixas e layout de cluster — são
  conteúdo da spec `layout-automatico`, como a §10 já indicava. A divergência dentro de agrupamentos
  é declarada à pessoa (`RF-17`), não corrigida.
- O risco da primeira letra perdida (§10) é o primeiro item da spec `ciclo-por-teclado`; Sequence
  entra como spec própria (`tipo-sequence`), não como variação de outra. Nenhum dos dois restringe a
  posição na fila — são conteúdo da spec certa.
