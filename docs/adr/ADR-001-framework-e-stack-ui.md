# ADR-001 — Framework e stack de UI

- **Status:** Aceito
- **Data:** 2026-07-19
- **Decisores:** Tuyoshi Vinicius
- **Evidência:** Decisão dada: mandato do dono do produto — a stack é escolhida pelo desempenho da
  LLM na geração de código, não por mérito técnico comparado do framework. React + Tailwind +
  shadcn/ui é o combo com maior densidade de código de treino, então é onde a geração acerta mais de
  primeira e precisa de menos correção manual.

## Contexto

O produto é um editor visual de diagramas mermaid, construído com a LLM como principal autora do
código. Isso inverte o critério usual de escolha de stack: o que pesa não é qual framework é mais
elegante ou mais enxuto, e sim **em qual stack a geração de código erra menos**. Um framework onde a
LLM acerta 70% das vezes custa mais horas de revisão do que um framework mais verboso onde ela acerta
95% — e o custo dessa diferença aparece em cada elemento da PRD, não em um canto isolado.

Por isso a decisão é **dada, não aberta**: reabri-la significaria trocar o critério de seleção (de
"desempenho de geração" para "mérito do framework"), o que é uma discussão sobre como o produto é
construído, não sobre qual biblioteca usar. React, Tailwind e shadcn/ui não estavam em disputa entre
si nem contra alternativas de outro ecossistema.

O que **estava** genuinamente em aberto era outra coisa: React puro sobre Vite, ou React dentro de um
framework por cima (Next.js). A descoberta resolve isso — o produto não tem contas, não tem
biblioteca de diagramas, não tem servidor, e o rascunho sobrevive no próprio navegador. É uma
aplicação client-only de tela única. SSR, roteamento de arquivos e camada de servidor seriam
maquinário sem carga.

## Decisão

Adotar **React sobre Vite, com Tailwind CSS e shadcn/ui** como stack de UI.

- **Escolhido:** React + Vite (build e dev server), Tailwind CSS (estilo do chrome da aplicação),
  shadcn/ui (componentes de UI, vendorizados no repositório).
- **Descartado:** **Next.js** — mesmo React, mas carrega SSR, roteamento por arquivos e camada de
  servidor que um app client-only de tela única não usa.

Alternativas de outro ecossistema (Svelte, Vue, vanilla TS) não foram avaliadas: a premissa da
decisão dada já as exclui, porque o critério é densidade de código de treino e não comparação de
frameworks.

## Consequências

**Fica mais fácil.** A geração de código de UI acerta mais de primeira, que é o efeito buscado. Vite
dá dev server e build sem configuração relevante. shadcn/ui entrega componentes acessíveis já
prontos, e por serem copiados para o repositório em vez de instalados como dependência, ficam
diretamente editáveis — o que também favorece a geração, já que a LLM edita código presente no
projeto em vez de configurar uma biblioteca opaca.

**Fica mais difícil.** Abrir mão de SSR e do roteamento do Next.js — custo próximo de zero neste
produto, e o motivo pelo qual o descarte é confortável. Se um dia o escopo mudar e o produto passar a
precisar de servidor, esta decisão volta à mesa.

**Trade-off aceito.** A stack é adotada sem spike: não há medição própria comparando desempenho de
geração entre ecossistemas. Aceita-se o mandato como premissa.

**Limite conhecido — o que este ADR não decide.** A descoberta promete que "diagrama grande continua
fluido" e que a mudança aparece "sem espera perceptível". Nada aqui sustenta essa promessa: como a
área do diagrama é renderizada e como o modelo interno propaga mudanças para canvas e código é uma
decisão estruturante separada, ainda em aberto, e é ela que carrega esse risco.

## Status

Proposto → **Aceito**.
