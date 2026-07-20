# ADR-010 — Durabilidade da sessão longa

- **Status:** Aceito
- **Data:** 2026-07-20
- **Decisores:** Tuyoshi Vinicius
- **Evidência:** docs/adr/spikes/ADR-010-durabilidade-da-sessao-longa/ — spike de execução que liga o
  rascunho ao app do ADR-009 (que entra **verbatim** como linha de base) e **recarrega a aba de
  verdade**, com o **mermaid 11.16.0 como oráculo**: depois do `reload()`, o código restaurado é
  submetido ao `mermaid.parse()` e ao `mermaid.render()` nas três famílias. 103/103 checagens passaram
  (77 em Node, 26 em Chromium headless), incluindo 600 atos pelo app inteiro e 15.000 na camada de
  modelo. O veredito vem dos braços de controle: gravar 100 KiB a cada ato bloqueia a main thread por
  **0,7ms** — a suspeita estava no lugar errado —, e o formato que guarda só o código perde **3 de 3**
  posições da sessão.

## Contexto

Esta decisão existe porque a sessão da Marina tinha dois buracos, e os dois são a mesma pergunta vista
de ângulos diferentes: *a sessão sobrevive?*

**Ao fechar a aba.** *"Recuperar o rascunho em curso ao reabrir a aba"* era a **única linha do
`### Faz` do discovery sem nenhum ADR** depois de nove decisões registradas. O discovery ainda impõe a
moldura em que a resposta tem de caber: *"não é um repositório de diagramas — sem contas, sem
biblioteca, sem pastas. O rascunho em curso sobrevive a fechar e reabrir a aba como **rede de
segurança**, não como arquivo"*. O ADR-001 chegou a citar de passagem que *"o rascunho sobrevive no
próprio navegador"*, mas como contexto para descartar servidor — nunca como decisão, nunca provado.

**Ao longo das horas.** Cinco ADRs — 004, 005, 006, 007 e 008 — fecharam com a **mesma ressalva
literal**: *"sessão longa: cada cenário dura segundos… se o modelo degrada, vaza ou perde o ponto fixo
ao longo de horas, este spike não vê"*. É o item que mais vezes foi empurrado adiante em todo o
harness, e ele mira exatamente a promessa central do produto: a persona é definida pela **intensidade
de uso**, e o discovery promete que *"depois de horas, o que ela sente é o cansaço de ter pensado, não
o de ter operado"*.

O risco é de **execução**: nenhuma leitura diz o que *este* modelo faz depois de milhares de atos, nem
o que custa gravar *este* rascunho no meio *deste* gesto. Só se resolve rodando. E o desfecho não seria
um ajuste: se gravar custasse caro no envelope, a rede de segurança viraria capacidade condicionada; se
a sessão degradasse, a promessa central cairia e com ela o envelope do ADR-004.

O spike ligou o rascunho ao app do ADR-009 e mediu cinco variáveis independentes — o formato do
rascunho, quando gravar, em que armazém, com que teto de histórico, e com o rascunho corrompido de
propósito. Quatro resultados mudam o que está em aberto:

1. **O rascunho volta inteiro, e o oráculo confirma.** `reload()` de verdade, nas três famílias: o
   código volta byte a byte, o canvas volta com o mesmo número de nós, e o mermaid aceita e desenha.
   Inclusive em Sequence, onde o ADR-008 mostrou que a ordem é condição de validade.
2. **O que separa os dois formatos é a posição.** Estrutura e estilo voltam igual nos dois; o rascunho
   como código perde **todas** as posições, e é justamente a parte da sessão que o produto
   declaradamente não exporta.
3. **A suspeita sobre o custo de gravar estava no lugar errado.** O armazém síncrono escreve 100 KiB
   bloqueando **0,7ms** — 3% de um gesto de 23,4ms. O assíncrono leva 22,4ms para confirmar, fora da
   main thread: não é mais rápido, é mais educado.
4. **A sessão não degrada, e o único crescimento é o histórico.** 600 atos pelo app inteiro: 21,8ms no
   início, 23,9ms no fim (1,1×). 15.000 atos na camada de modelo: 0,74×. O ponto fixo do ADR-006 se
   mantém. O heap retém 1.306 bytes por ato — o histórico, e nada além dele.

## Decisão

**A rede de segurança do discovery se sustenta, e a promessa da sessão longa fica de pé.** O que este
ADR fixa são as seis condições sob as quais elas se sustentam.

1. **O rascunho é rede de segurança, não arquivo.** Uma sessão em curso, uma chave, sobrescrita — sem
   nome, sem lista, sem versões anteriores, sem exportar. É a moldura do discovery virada restrição:
   qualquer coisa que exija escolher *qual* rascunho abrir já é biblioteca, e biblioteca está no
   `### Não faz`.

2. **O rascunho guarda o modelo e as posições, não o código.** É o que devolve a sessão inteira: o
   código volta byte a byte nos dois formatos, mas só este devolve o arranjo que a pessoa fez com a
   mão. Custa 7,3× em bytes (109,6 KiB contra 15,1 KiB no envelope, longe do teto prático de ~5 MiB) e
   um formato próprio a manter. **A posição continua fora do código entregue** — o `### Não faz`
   permanece intacto; ela sobrevive na sessão, não no produto final.

3. **O rascunho é versionado no cabeçalho, e falha para o lado de não existir.** Rascunho ilegível,
   truncado ou de versão desconhecida produz **sessão nova com aviso** — nunca uma aba que não monta.
   Isto é requisito, não robustez opcional: um rascunho que derruba a aba não custa uma sessão, custa
   todas as seguintes, até a pessoa descobrir sozinha como limpar o navegador.

4. **A gravação acontece quando a mão para, não a cada ato — e o motivo não é o frame.** Gravar a cada
   ato é viável e barato (0,7ms de bloqueio; 0,1ms no documento pequeno). O que a política de
   ociosidade protege é a escrita repetida de 100 KiB ao longo de horas, que é I/O de disco e **não foi
   medido**. A escolha é conservadora por causa do que o spike não viu, e isso fica dito. A janela de
   silêncio é a perda máxima aceita, e o seu tamanho é design de feature.

5. **O histórico não sobrevive à aba.** É consequência do ADR-009 (a pilha é da sessão) e da moldura do
   discovery, e agora é número medido: 5 entradas antes do recarregamento, 0 depois. Reabrir devolve o
   **diagrama**, não o passado dele.

6. **O histórico não tem teto no desenho base.** Custa 1.306 bytes por ato; uma sessão de oito horas com
   um ato a cada três segundos são ~12 MiB, que cabem numa aba sem discussão. O teto fica registrado
   como saída conhecida — o controle com 200 entradas retém 217 KiB —, para o dia em que o custo médio
   por ato subir. Ele não é default porque o que se perde com ele é silencioso: os atos mais antigos
   saem do alcance do desfazer sem avisar.

Descartadas: o rascunho como código mermaid (condição 2 — perde 3 de 3 posições); o armazém assíncrono
para este tamanho de dado (condição 4 — 32× mais lento para confirmar, sem ganho perceptível em 100
KiB); o rascunho como biblioteca de diagramas (condição 1 — está no `### Não faz`); e o teto de
histórico por padrão (condição 6).

## Consequências

**O que fica mais fácil.**

- **A última linha órfã do `### Faz` ganha ADR.** Depois desta decisão, toda capacidade nomeada no
  discovery tem uma decisão estruturante por trás ou está declarada como design de feature.
- **A ressalva que cinco ADRs repetiram deixa de ser repetível.** "Sessão longa não foi medida" não
  cabe mais como limite genérico: o que continua não medido agora tem nome — **tempo de relógio**, não
  volume de atos.
- **O envelope do ADR-004 sai reforçado.** Ele foi medido em cenários de segundos; agora se sabe que
  600 atos seguidos pelo app inteiro não o deslocam (1,1×), e que o ponto fixo do ADR-006 sobrevive a
  5.000 atos nas três famílias.
- **Gravar deixa de ser um risco.** 0,7ms para 100 KiB tira a persistência da lista de coisas que
  disputam o orçamento do gesto — ela cabe em qualquer política que a feature escolher.

**O que fica mais difícil, e as invariantes que nascem daqui.**

- **Existe um segundo formato de persistência para manter.** O código mermaid é o produto final e não
  tem versão a gerir; o rascunho tem. Toda mudança no modelo interno — e o ADR-008 já mostrou que cada
  família nova mexe nele — passa a ter uma pergunta a mais: *o rascunho da versão anterior ainda
  abre?* A resposta pode ser "não, e vira sessão nova com aviso", mas tem de ser respondida.
- **A posição agora tem três donos.** O ADR-003 a tirou do modelo, o ADR-007 a fez estado de sessão de
  primeira classe, o ADR-009 a colocou no histórico, e este ADR a coloca no rascunho. É a mesma
  invariante frágil de sempre, com mais uma ponta: quem mexer na forma da posição mexe em quatro
  lugares.
- **A janela de perda é uma escolha de produto, não um detalhe.** Gravar quando a mão para significa
  que existe um intervalo em que o trabalho não está gravado. O tamanho dele é o que a pessoa perde num
  crash — e o spike não exercitou crash, só recarregamento.
- **Duas abas do produto brigam pela mesma chave.** Não há colaboração no escopo, mas há a pessoa
  abrindo duas abas. A última a gravar vence, e ninguém mediu o que isso parece de dentro.

**Limites conhecidos — o que este ADR não decide.**

- **O tempo de relógio.** 600 atos em 14 segundos e 15.000 em Node não são oito horas. O que degrada por
  tempo — timers acumulados, fragmentação de heap, a aba descartada em segundo plano — continua sem
  evidência. É a ressalva dos cinco ADRs anteriores **estreitada**, não eliminada: o que sobrou tem
  nome próprio.
- **Fechar de verdade.** `reload()` recarrega; não é `pagehide`, aba descartada por falta de memória
  nem crash. É exatamente onde a política de gravação deixa a sua janela.
- **O desgaste de escrita.** Sustenta a condição 4 sem tê-lo medido, e isso está dito ali.
- **A cota do armazém.** O pior caso medido (109,6 KiB) está longe do teto de ~5 MiB, mas ninguém
  provocou a falha por cota nem decidiu o que o produto faz quando ela acontece.
- **O que a pessoa vê enquanto restaura.** A restauração síncrona acontece antes de montar; a
  assíncrona, depois da primeira pintura. O intervalo não foi medido, e como isso aparece é design de
  feature.
- **Uma máquina, sem GPU.** Mesmo Ryzen 7 5800H em WSL2 dos ADR-004 a 009. Lê-se com confiança a razão
  entre os braços (7,3× de tamanho, 0,7ms contra 22,4ms, 1,1× de degradação), não o valor absoluto.

## Status

Aceito em 2026-07-20. As 77 checagens em Node e as 26 de navegador foram rodadas na mesma versão do
código que está no spike dir. Duas correções de medição entraram durante a execução e ficam
registradas: a linha de base do heap passou a ser tomada **depois de um aquecimento** (contra o heap
recém-carregado a retenção media −34 MiB, um número sem significado), e o custo de gravação passou a
ser rotulado por armazém — bloqueio de main thread no síncrono, tempo até confirmar no assíncrono —,
porque o mesmo número nos dois levaria à leitura oposta da correta.
