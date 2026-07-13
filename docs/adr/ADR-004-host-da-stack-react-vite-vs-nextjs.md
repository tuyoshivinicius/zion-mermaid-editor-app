# ADR-004 — Host da stack React para máxima geração por IA: Vite (SPA) vs Next.js

- **Status:** Aceito
- **Data:** 2026-07-13
- **Decisores:** Tuyoshi (product owner)

## Contexto

O produto será construído com forte apoio de **geração de código por IA/LLMs**, então a stack
frontend precisa ser a que os modelos geram com **maior acurácia e menor taxa de erro**. Duas
decisões anteriores já restringem o espaço:

- **ADR-001** fixou **React Flow (`@xyflow/react`)** como engine do canvas → **React é
  obrigatório** (React Flow o exige). Logo, a escolha de framework (React vs Vue/Svelte/Angular)
  **não está em aberto**; reabri-la invalidaria os spikes de round-trip já feitos.
- **ADR-003** confirmou a **Postura A**: sessão **efêmera**, sem backend, sem persistência, única
  saída é o texto Mermaid. Não há SSR, SEO, rotas de servidor nem data-fetching de servidor.

Fixados o framework (React) e a camada de UI (**shadcn/ui + Tailwind**, constante nos dois lados),
sobra **uma** decisão de host viva: **Vite + React (SPA)** vs **Next.js**. Ela **não muda a PRD**
(não adiciona/remove `RF-xx`, não altera NFR) — é **restrição transversal de projeto** que alimenta
a `constitution`, não a seção 8 da PRD. O ADR-001 já havia empurrado "a stack de UI concreta (Vite,
shadcn/ui, Tailwind)" para o `plan.md`; este ADR eleva **apenas o host** a restrição, por ser um
multiplicador de qualidade da geração por IA em todas as fatias.

**Spike / evidência (deep-research, 2026-07-13 — 5 ângulos, 20 fontes, 79 claims extraídos,
25 verificados adversarialmente: 24 confirmados / 1 refutado):**

- **Next.js App Router carrega uma superfície de erro densa e específica** que o LLM precisa
  acertar a cada componente e erra com frequência: fronteira server/client, diretiva `'use client'`
  (viral pelo grafo de **import**, não de render — marcar `layout.tsx` não basta), async server
  components, posicionamento de `Suspense`, e context provider que precisa ser Client Component
  recebendo `children` por prop. A **própria Vercel documenta 10 erros comuns** do App Router.
  Essa superfície **inexiste** num SPA Vite+React (não há fronteira server/client). *(3-0)*
  Fontes: vercel.com/blog/common-mistakes-with-the-next-js-app-router, nextjs.org (server-and-client-
  components; react-hydration-error), react.dev/reference/rsc/use-client.
- **Confusão de fronteira é fonte recorrente de erros de hidratação** e o `'use client'` **não
  garante execução só-cliente** (componentes ainda são SSR'd e hidratados) — premissa que devs e
  LLMs erram. *(use client 3-0; contribuição p/ hydration 2-1)*
- **shadcn/ui é first-class e co-igual nos dois hosts** — a restrição shadcn+Tailwind é **neutra**.
  Docs oficiais listam guias dedicados para Vite e para Next.js (`init -t vite` / `-t next`). O
  claim de que componentes Radix/shadcn forçariam fricção de Client Component dentro de Server
  Components foi **refutado 3-0**. *(3-0)* Fonte: ui.shadcn.com/docs/installation/{vite,next}.
- **Único custo do lado Vite:** setup inicial mais manual — instalar Tailwind à parte e editar o
  alias `@` em `tsconfig.json`, `tsconfig.app.json` e `vite.config.ts` (Next já pré-configura via
  `create-next-app`). É **custo único de scaffolding**, totalmente documentado, não uma armadilha de
  raciocínio por componente. *(3-0)* É a **única** dimensão em que Next reduz erro de IA.
- **Ambos são bem representados em dados de treino** — o argumento de popularidade é **neutro**, não
  decisivo: Next lidera meta-frameworks profissionais (State of JS 2024: 5.147 vs Nuxt 1.883), mas
  Vite é a **#2 lib mais usada** (~84%, State of JS 2025) e o **SPA é a arquitetura React dominante**
  (84,5%, State of React 2025). O caminho Vite+React SPA **não é sub-representado**. *(3-0)*
- **Contraponto operacional (risco real):** a maioria dos modelos **defaulta para Next.js** por viés
  de treino (Becker 2025: 6 de 9 modelos) — obter o resultado Vite exige **fixar o host
  explicitamente** no prompt/spec, senão o modelo vaza idiomas de App Router (`'use client'`
  espúrio, `next/link`, roteamento por arquivo) num projeto Vite. *(3-0)*

**Limite do spike (honesto):** não há benchmark controlado medindo *erros por arquivo gerado* em
Vite vs Next. A conclusão é **inferência direcional forte** por triangulação (superfície de erro
documentada do App Router + ausência lógica dela no SPA + proxies de sentimento/popularidade), não
um delta medido. Ver `openQuestions` do relatório.

## Decisão

Adotar **Vite + React (SPA)** como host da aplicação, com **shadcn/ui + Tailwind CSS** como camada
de UI. **Descartado o Next.js.**

Racional decidível: dado que o app é **client-side efêmero** (ADR-003 — sem SSR/SEO/backend/
persistência), o Next.js **não entrega nenhum recurso usado** (SSR, RSC, rotas de servidor, ISR) e,
em troca, **adiciona** a superfície de erro server/client que é o maior gerador documentado de
código incorreto por IA — enquanto o SPA Vite a **elimina por construção**. O único ganho do Next
(config inicial pronta) é custo único e documentado. React Flow é uma lib fortemente client-side/
hooks: num SPA Vite a árvore inteira já é cliente, sem necessidade de wrappers `'use client'`.

Descartado: (a) **Next.js** — paga imposto de complexidade (fronteira server/client) por recursos
que a Postura A não usa, elevando a taxa de erro da IA sem contrapartida; (b) reabrir o **framework**
(Svelte/Vue) — colidiria com o ADR-001 (React Flow) e invalidaria os spikes de round-trip; (c) trocar
a **camada de UI** — shadcn/Tailwind é neutra entre hosts e é o eixo de maior convergência de IA.

## Consequências

**Fica mais fácil:** o modelo mental que a IA precisa acertar é o menor possível (React puro, sem
fronteira server/client, sem RSC, sem roteamento por arquivo); menos alucinação estrutural por
componente; alinhamento direto com React Flow (árvore 100% cliente); build/dev rápido do Vite.

**Fica mais difícil / trade-offs aceitos:**
- **Setup inicial mais manual** (Tailwind à parte + alias `@` em 3 arquivos de config). Custo único
  de scaffolding — mitigável entregando o guia oficial do shadcn/Vite ao agente gerador.
- **Viés de default dos modelos para Next.js:** exige **fixar o host explicitamente** em todo prompt/
  spec de geração; caso contrário o modelo vaza idiomas de App Router (`'use client'`, `next/link`,
  roteamento por arquivo) num projeto Vite. Vira regra de processo (ver constitution abaixo).
- **Roteamento e outras conveniências do Next** (file-based routing, etc.) passam a ser add-ons
  explícitos se um dia forem necessários — aceitável, dado o escopo de app efêmero de tela única.

**Impacto na PRD:** **nenhum** direto — esta é restrição de `plan.md`/constitution, não da seção 8
(não muda `RF-xx`/NFR). Registrada aqui por ser multiplicador transversal da qualidade da geração
por IA. *(Se desejado, pode-se adicionar à seção 8 uma nota de restrição técnica; não é requisito
de produto.)*

**Impacto na constitution (princípios candidatos, decidíveis/rastreáveis):**
- *"O host da aplicação é Vite + React (SPA); nenhum artefato de Next.js/App Router (`'use client'`,
  `next/*`, roteamento por arquivo, server components) aparece no código — verificável por lint/grep
  no CI."*
- *"Todo prompt/spec de geração de código fixa explicitamente o host (Vite + React SPA + shadcn/ui +
  Tailwind) para neutralizar o default dos modelos para Next.js."*

## Status

**Aceito** (2026-07-13), sustentado pelo spike de deep-research acima (24/25 claims confirmados em
verificação adversarial 3-0; o único claim contrário — fricção shadcn/Radix em Server Components —
foi refutado 3-0). **Reabre-se apenas** se surgir requisito que exija SSR/SEO/rotas de servidor/
persistência de servidor (o que contradiria o ADR-003 e exigiria revisitar a Postura B), ou se
surgir benchmark controlado medindo taxa de erro de IA por host que contrarie a inferência
direcional aqui adotada.
