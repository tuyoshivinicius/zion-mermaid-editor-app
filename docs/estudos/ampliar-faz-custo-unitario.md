# Estudo — ampliar o "### Faz" sob gate de custo unitário

## Contexto

Este estudo avalia ampliar o bloco `### Faz` de `docs/discovery.md` sob um gate de admissão
estrito: só entra capacidade que **baixe o custo unitário de materializar um elemento** em pelo
menos uma das três dores nomeadas na `## Persona` — quantidade de cliques por elemento, alternância
entre teclado e mouse, e trazer texto de fora para dentro dos rótulos (`discovery.md:18-19`).
Capacidade que apenas adiciona superfície de uso é recusada e vira linha explícita no `### Não faz`.
Dois pontos motivaram o estudo: a dor do **texto de fora** é a mais rasamente servida hoje — só
existe a linha "colar um código mermaid já pronto" (`discovery.md:56`), que atende apenas o caso em
que o texto de fora **já é** mermaid —; e a `## Experiência` promete que Marina "não repete
manualmente trabalho que já fez antes" (`discovery.md:111`) sem que **nenhuma linha** do `### Faz`
sustente essa promessa. O estudo é cirúrgico: `## Visão`, `## Persona principal — Marina`,
`## Estrutura do produto` e `## Experiência` ficam preservados.

**Estado das fontes canônicas (greenfield quanto a ADR):** o projeto não tem `docs/PRD.md`,
`docs/architecture.md` nem `docs/adr/` — `docs/discovery.md` é o único artefato do harness. Não há
ADR vigente a contradizer, e nenhuma alternativa aqui declara supersessão de ADR; onde uma
alternativa custa uma decisão já tomada, o custo é **reescrever uma linha do `### Não faz`**, não
superar um ADR.

**Restrições herdadas de `docs/discovery.md` que enquadram toda alternativa:**

- `### Não faz` já recusou: repositório de diagramas (sem contas, biblioteca ou pastas, linha 72),
  posição de nó no código entregue (74), estilo que não vira código (76), exportação de imagem (78),
  geração de diagrama por IA a partir de linguagem natural (80), tipos de diagrama fora dos cinco
  nomeados (82) e colaboração/compartilhamento (84).
- `## Estrutura do produto`: o modelo interno é o centro e canvas e código são duas vistas da mesma
  verdade (91-93); a posição é conforto de sessão e não viaja no código (95-97); os tipos avançam
  por família de modelo mental, não em paridade uniforme (99-102).
- A `## Persona` afirma que as três dores **pesam igualmente** (18-19) — o que torna servir uma
  delas pela metade uma decisão consciente, não um detalhe.

**Fronteira fixada pelo Autor durante o estudo (Fase 2):** a entrada de texto de fora é regida pela
**fronteira do controle** — qualquer texto pode entrar, mas quem declara o significado é Marina;
a máquina **transporta** o texto, não o lê. Isso preserva a recusa da linha 80 e lhe dá um critério
mais preciso que o original: a recusa não é sobre tecnologia, é sobre **quem significa**. O
raciocínio de apoio vem da própria `## Experiência`: ler um texto e decidir o que é caixa e o que é
seta é o **pensar** que o produto quer preservar ("ela pensa mais do que opera", 107-108; "o cansaço
de ter pensado, não o de ter operado", 118); re-digitar um rótulo que já existe escrito é o
**operar** que o produto quer matar.

## Edge cases e incertezas

Perguntas que a alternativa escolhida terá de responder. **[Autor]** marca as que só o humano
responde. As siglas D1/D2/D3 usadas na condução foram substituídas pelos nomes das dores no restante
do documento.

### A. Texto de fora (sob a fronteira do controle)

- **A1 · Volume por gesto** — quantos elementos nascem de uma trazida: 5, 50, 200? Determina se o
  gesto é um ato único ou algo que materializa em partes. **[Autor]**
- **A2 · Granularidade** — um recorte vira nó, rótulo de conexão ou nome de agrupamento; como Marina
  declara qual, já que a máquina não pode adivinhar? Define o vocabulário mínimo do gesto.
- **A3 · A aresta mais fina da fronteira** — quando o texto já traz indentação ou colunas,
  transportar só os rótulos joga fora estrutura que ela já tinha; mas ler a estrutura é a máquina
  significando. Indentação conta como *ela declarou* ou como *a máquina inferiu*? **[Autor]**
- **A4 · Caracteres que quebram a sintaxe** — texto de fora traz aspas, colchetes, parênteses, sinais
  de maior/menor e quebras de linha. Se o rótulo precisar ser alterado para caber na sintaxe, a
  promessa "o código que copia é exatamente o diagrama que está vendo" (`discovery.md:119`)
  sobrevive?
- **A5 · Colisão com a porta que já existe** — colar código mermaid pronto (`discovery.md:56`) já é
  entrada de texto. Se ela traz algo *quase* mermaid, qual porta atende? Duas portas para um mesmo
  gesto é superfície nova — exatamente o que o gate recusa.
- **A6 · O custo que só se desloca** — quarenta rótulos nascem, mas conectá-los continua sendo o
  ciclo caro. Se a estrutura não vem junto, a dor do texto de fora cai e a dor dos cliques sobe:
  isso passa no gate?
- **A7 · Escala 1** — trazer um termo durante a edição de um único rótulo é a mesma capacidade em
  escala pequena, ou outra capacidade?
- **A8 · Reentrância** — ela traz, percebe que recortou errado e traz de novo: substitui, duplica ou
  funde? **[Autor]**

### B. A promessa não cumprida — "não repete trabalho já feito"

O Autor confirmou que a repetição dói nas **três** escalas: dentro do diagrama em curso, na herança
da última escolha, e atravessando sessões.

- **B1 · A fronteira do repositório** — guardar peça entre sessões é biblioteca de *peças*; a recusa
  registrada é de biblioteca de *diagramas* (`discovery.md:72`), e o rascunho persistente já foi
  aceito como rede de segurança (`discovery.md:66`). Peça guardada é extensão dessa rede ou é o
  repositório entrando pelos fundos? **[Autor] — abre ou fecha a escala de reuso entre sessões por
  inteiro.**
- **B2 · O teste da busca** — se peça guardada entra, quem nomeia, organiza e apaga? No instante em
  que ela precisa **procurar** a peça, virou pasta, e pasta é a recusa literal. Existe reuso entre
  sessões que não exija busca?
- **B3 · Herança e o caso raro** — se o próximo elemento nasce igual ao anterior, o elemento que ela
  queria diferente custa uma correção; a herança baixa o custo no caso comum e sobe no raro. Qual a
  proporção real? **[Autor]**
- **B4 · Unidade de desfazer** — trocar o tipo de doze nós de uma vez é um ato ou doze? Vale para
  toda capacidade em massa e define o que Marina percebe como unidade de trabalho.
- **B5 · Renomear propagado** — mudar um termo muda os outros rótulos que o contêm? É reuso ou
  acoplamento que ela não pediu?
- **B6 · Sobreposição com o que já existe** — copiar e colar preservando estilos (`discovery.md:37`)
  já cobre parte da escala do diagrama em curso. Onde a capacidade nova começa sem duplicá-la?

### C. O gate de admissão — decidibilidade

- **C1 · A unidade** — o gate conta operações por elemento, alternâncias de modo ou caracteres
  re-digitados? Sem escolher a unidade, "baixa o custo" não é decidível. Sugestão do estudo: ancorar
  no ciclo já nomeado na `## Persona` (`discovery.md:15-16`) e contar operações dentro dele.
- **C2 · Marginal ou total** — a trazida em massa custa caro uma vez e barateia N vezes; não é "por
  elemento". O gate mede custo marginal ou custo acumulado ao longo da sessão? **[Autor]**
- **C3 · Empate entre dores** — capacidade que corta cliques mas exige a mão no mouse. A
  `## Experiência` sugere um desempate: ela não sente a troca entre teclado e mouse **no ciclo
  principal** (`discovery.md:110-111`), o que colocaria a alternância acima dos cliques dentro do
  ciclo, e o inverso fora dele. Isso vira regra ou o desempate é caso a caso? **[Autor]**
- **C4 · Capacidade que só rende em escala** — a persona é definida por volume
  (`discovery.md:12-14`), então capacidade inútil nos primeiros dez minutos de uso ainda passa?
- **C5 · O paradoxo do acúmulo** — cada linha passa no gate isoladamente e a soma contradiz "Marina
  não quer uma ferramenta com mais recursos" (`discovery.md:20`). Existe teto de linhas no
  `### Faz`, ou capacidade nova precisa absorver/aposentar uma existente? **[Autor]**
- **C6 · Que tipo de recusa vira linha** — recusa por retorno baixo não é recusa de identidade. O
  `### Não faz` hoje contém apenas recusas de identidade; misturar as duas espécies custa nitidez ao
  bloco. Toda recusa vira linha, ou só as de identidade? **[Autor]**

### P. Paridade entre os cinco tipos de diagrama

- **P1 · Herdar a ordem declarada** — a `## Estrutura do produto` já sanciona avanço desigual
  (`discovery.md:99`), então capacidade que só faz sentido em grafo dirigido é ordem, não dívida. As
  capacidades novas herdam essa ordem, ou alguma justifica furar a fila? **[Autor]**
- **P2 · Uma capacidade ou cinco** — trazer texto em massa para Sequence significa mensagens entre
  participantes, forma diferente das outras quatro. Uma linha do `### Faz` com semântica distinta por
  tipo é uma capacidade só, ou cinco disfarçadas de uma?
- **P3 · A ordem atrasa o maior ganho** — texto em tabela/colunas serve Class e ER, que são a
  **segunda** família na ordem declarada. Se a forma mais bem servida por uma capacidade está na fila
  de trás, aceita-se o atraso ou a ordem se ajusta? **[Autor]**

### E. Transversais

- **E1 · Posição no nascimento em massa** — **já resolvido**, não é questão aberta: o layout
  automático dá o ponto de partida (`discovery.md:96`).
- **E2 · Por qual vista o texto entra** — canvas e código são duas vistas da mesma verdade
  (`discovery.md:91-93`); texto que não é mermaid precisa de uma porta declarada no modelo.
- **E3 · Erro parcial** — quarenta elementos nascem e três têm rótulo problemático: nasce tudo com os
  três marcados, ou não nasce nada? "O trabalho nunca desaparece por causa de um caractere"
  (`discovery.md:116`) empurra para a primeira leitura.

## Alternativas

Quatro alternativas, incluindo **não fazer**. Todas em nível de o-quê: o que a persona passa a
conseguir. Nenhuma cita stack, nenhuma desenha tela.

### Alt 0 — Não fazer

Congelar o `### Faz` como está e **remover da `## Experiência` a promessa "não repete manualmente
trabalho que já fez antes"** (`discovery.md:111`). Não fazer, aqui, não é inércia: é pagar a dívida
de honestidade, porque promessa sem linha que a sustente é escopo fantasma.

- **Prós** — o escopo enxuto permanece enxuto; zero superfície nova, zero recusa reaberta, zero
  risco. Coerente com "Marina não quer uma ferramenta com mais recursos" (`discovery.md:20`).
- **Contras** — a `## Persona` afirma que as três dores pesam igualmente (`discovery.md:18-19`), e a
  dor do texto de fora só é servida quando o texto já é mermaid (`discovery.md:56`). Congelar é
  assumir conscientemente servir uma das três pela metade. O produto também perde uma frase que
  descrevia bem o que ele quer ser.
- **Decisões estruturantes tocadas** — nenhuma.

### Alt 1 — Economia de escala dentro do diagrama

Marina aplica uma decisão a muitos elementos num só ato, e o elemento seguinte nasce herdando o que
ela acabou de escolher. Nada entra de fora; nada sobrevive à sessão.

- Aplicar tipo, shape ou estilo a uma seleção inteira de uma vez.
- O elemento recém-criado herda o tipo e o estilo do anterior, sem reescolha a cada ciclo.
- Repetir a última ação sobre o elemento atual.
- Cada ato em massa conta como **uma** unidade de desfazer.

- **Prós** — ataca a dor dos cliques exatamente onde ela escala, e a persona é definida por volume
  (`discovery.md:12-14`); a herança mata a reescolha, que é metade do ciclo repetido nomeado na
  `## Persona` (`discovery.md:15-16`). Nenhuma porta de entrada nova, nenhuma recusa reaberta, nada
  novo viaja no código entregue. Reversível sem deixar rastro no artefato final.
- **Contras** — não toca a dor do texto de fora, que é a mais rasa hoje. A herança pode subir o custo
  no caso raro (**B3**). E "aplicar a muitos" exige selecionar muitos, o que puxa a mão para o mouse:
  pode baixar cliques subindo a alternância, o empate de **C3**.
- **Decisões estruturantes tocadas** — nenhum ADR vigente. Nasce uma decisão a registrar: a unidade
  de desfazer de atos em massa (**B4**).

### Alt 2 — Alt 1 mais porta de entrada de texto sob controle

Tudo da Alt 1, e mais: Marina traz texto que **não** é mermaid e o transforma em elementos,
declarando ela mesma o recorte. A máquina transporta o texto; não o lê.

- Trazer um bloco de texto e materializar um elemento por recorte declarado por ela.
- Declarar se o recorte vira nó, rótulo de conexão ou nome de agrupamento.
- Nascimento parcial: o que couber nasce, o que tiver problema nasce marcado — nada é descartado por
  causa de um caractere (`discovery.md:116`).

- **Prós** — única alternativa que serve as três dores, e a única que serve a mais rasa. Respeita a
  fronteira do controle fixada na Fase 2: a recusa de gerar diagrama por IA (`discovery.md:80`)
  continua de pé e **ganha um critério** melhor que o original. Torna a `## Visão` mais verdadeira —
  ela leva embora o código e traz o conteúdo de onde ele já vivia.
- **Contras** — é a de maior superfície nova, e superfície nova é justamente do que o gate desconfia.
  Convive com a porta de colar código pronto que já existe (**A5**): duas portas para um mesmo gesto
  é o que o gate recusa. O ganho pode apenas se deslocar (**A6**) — rótulos nascem, conexões
  continuam caras. E **A1**, **A2** e **P2** sem resposta podem transformar uma linha do `### Faz` em
  cinco.
- **Decisões estruturantes tocadas** — nenhum ADR vigente. Nascem três a registrar: por qual vista o
  texto entra no modelo (**E2**), como o recorte declara sua função (**A2**) e a unidade de desfazer
  (**B4**).

### Alt 3 — Alt 2 mais reuso entre sessões

Tudo da Alt 2, e mais: fragmentos que ela montou uma vez reaparecem disponíveis nas sessões
seguintes.

- **Prós** — única que cumpre a promessa da `## Experiência` na escala que o Autor confirmou doer.
  Para quem documenta doze serviços com os mesmos blocos padrão, é o maior corte de trabalho repetido
  do conjunto.
- **Contras — custo declarado** — reabre "não é um repositório de diagramas — sem contas, sem
  biblioteca, sem pastas" (`discovery.md:72`). Guardar peça exige nomear, achar e apagar peça, e no
  instante em que ela precisa **procurar**, virou pasta (**B2**). Sem o veredito do Autor em **B1**,
  a alternativa não é plenamente avaliável; a nota abaixo assume que a recusa se mantém e que só
  entraria alguma forma de reuso sem busca.
- **Decisões estruturantes tocadas** — nenhum ADR a substituir, por greenfield: o custo aqui é
  **reescrever uma linha do `### Não faz`**, não superar um ADR. Se a linha for reescrita, é decisão
  estruturante e pede registro.

## ROI

Impacto na persona (1–5; 5 = resolve a dor central) · Esforço (1–5 invertido; 5 = menor esforço) ·
Risco/reversibilidade (1–5 invertido; 5 = menor risco, mais reversível). ROI = média das três.
Tabela ordenada por ROI decrescente.

| # | Alternativa | Impacto | Esforço | Risco | **ROI** |
|---|---|:---:|:---:|:---:|:---:|
| 1 | Economia de escala no diagrama | 4 | 4 | 5 | **4.33** |
| 2 | Mais porta de entrada de texto | 5 | 3 | 3 | **3.67** |
| 0 | Não fazer (e limpar a promessa) | 1 | 5 | 4 | **3.33** |
| 3 | Mais reuso entre sessões | 5 | 2 | 2 | **3.00** |

**Alt 1 — 4.33.** *Impacto 4*: corta a dor dos cliques onde ela escala, atingindo o ciclo repetido
que define a persona, mas deixa intocada a dor mais rasa. *Esforço 4*: opera sobre o que o modelo
interno já tem, sem porta de entrada nova nem persistência nova. *Risco 5*: nenhuma recusa reaberta,
nada novo viaja no código entregue; se a herança incomodar, ela sai sem deixar rastro.

**Alt 2 — 3.67.** *Impacto 5*: única que serve as três dores e a única que serve a mais rasa.
*Esforço 3*: porta de entrada nova, semântica possivelmente diferente por tipo de diagrama, e
convivência a resolver com a porta que já existe. *Risco 3*: não reabre recusa alguma, mas cria a
superfície que o gate desconfia, e três questões em aberto podem multiplicar uma linha em cinco.

**Alt 0 — 3.33.** *Impacto 1*: nenhuma dor cai; melhora apenas a honestidade do documento. *Esforço
5*: uma frase removida da `## Experiência`. *Risco 4*: baixo, não nulo — congela o produto servindo
uma de três dores pela metade, contra o que a própria `## Persona` afirma.

**Alt 3 — 3.00.** *Impacto 5*: cumpre a promessa inteira, na escala confirmada como dolorosa.
*Esforço 2*: soma tudo da Alt 2 mais a persistência de fragmentos e o vocabulário de nomear, achar e
apagar. *Risco 2*: o caminho de "guardar peça" até "virar pasta" é curto, e o documento já recusou
pasta explicitamente.

## Recomendação

**Não vinculante.** O retorno premia a Alt 1, mas ela sozinha não escava a dor mais rasa, que foi o
motivo do estudo. A tensão se resolve pela **ordem**, não pela escolha: a Alt 1 é literalmente o
primeiro pedaço da Alt 2. A recomendação é adotar a **Alt 2 em duas ondas** — a economia de escala
primeiro, por ter o melhor retorno por unidade de risco e não depender de nenhuma questão em aberto;
a porta de entrada de texto em seguida, **depois** de respondidas **A1** (volume por gesto), **A2**
(como o recorte declara sua função) e **P2** (uma capacidade ou cinco). A Alt 3 fica represada atrás
de **B1**, e a Alt 0 só entra se o Autor decidir que a promessa da `## Experiência` era ambição, não
requisito. Independentemente da escolha, o gate produziu recusas que merecem virar linha no
`### Não faz`, mas **C6** segue aberta: se recusa por retorno baixo entrar no mesmo bloco que recusa
de identidade, o bloco perde nitidez.

## Próximo passo sugerido

Se aprovado, rodar `/zion-prd-discovery` com a alternativa escolhida (e `/zion-prd-spike` se houver
decisão estruturante nova).
