# Fase 1 — Quickstart: Fatia S1 (Template Starter de Flowchart)

O projeto **já está bootstrapado** por S0 (Vite + React + shadcn/Tailwind — ADR-004). S1 não introduz
toolchain nova. Este guia cobre só o que muda.

## Setup

```bash
npm install                              # + @radix-ui/react-alert-dialog (única dep. nova — Decisão I)
npx shadcn@latest add alert-dialog       # gera src/components/ui/alert-dialog.tsx (arquivo NOVO)
npm run dev                              # http://localhost:5173 — deve abrir JÁ com o starter no canvas e no código
```

Se ao abrir você vir a tela vazia por um instante antes do starter, **isso é um bug de FR-001a**, não um
detalhe de performance: a semeadura é síncrona e anterior ao `render` (Decisão G). Verifique se
`seedStarter(...)` está sendo chamada **antes** de `createRoot(...).render(<App />)` em `src/main.tsx`, e não
de um `useEffect`.

## Rodar os testes

```bash
npm test                    # Vitest — unit · roundtrip · contract · perf (S0 + S1)
npm run test:e2e            # Playwright — dev server, 3 browsers (config de S0, INALTERADA)
npm run test:e2e:perf       # Playwright — portão de SC-012: BUILD DE PRODUÇÃO, chromium, 30 amostras
npm run lint                # inclui no-restricted-imports (portão VI/ADR-004)
```

**`test:e2e:perf` é o único que constrói o app** (`vite build && vite preview`). É lento de propósito: medir
o dev server descreveria um artefato que nenhum usuário recebe (FR-018).

**Por que os dois arquivos Playwright não colidem:** `playwright.config.ts` usa o `testMatch` **default**
(`**/*.@(spec|test).?(c|m)[jt]s?(x)`), que **não casa** com `starter-boot-latency.perf.ts`.
`playwright.perf.config.ts` usa `testMatch: '**/*.perf.ts'`. O portão vive em `tests/e2e/` (como SC-012 manda)
sem que a config de S0 mude uma linha (como FR-018 manda). **Não acrescente `testIgnore` à config de S0** —
isso a alteraria, que é exatamente o que FR-018 proíbe.

## Onde mexer

| Quero… | Vá em |
|---|---|
| mudar o conteúdo do starter | `src/starter/model.ts` — **só o modelo**. O texto é `generate(STARTER_MODEL)`; nunca escreva a string à mão (ST3) |
| mudar quando o starter é semeado | `src/starter/seed.ts` → `shouldSeedStarter` (pura). Não ponha a regra no `main.tsx` (SD1) |
| mudar quando a limpeza confirma | `src/starter/clear.ts` → `needsClearConfirmation` (pura). Compare **texto**, nunca o `model` (CL1) |
| mudar o que a limpeza restaura | `src/starter/clear.ts` → `clearSession`. Estado só-de-UI incluído (CL2) |
| mexer em `src/core/**` | **pare.** S1 não toca o núcleo. Se parece necessário, é sinal de que a fatia saiu de escopo (FR-014) |

## A regra que mais pega gente nesta fatia

**S1 não redefine comportamento de S0.** Seis arquivos de S0 recebem mudança **aditiva**, e a lista é
exaustiva (Decisão F): `main.tsx`, `App.tsx`, `strings.ts`, `Toolbar.tsx`, `CanvasPanel.tsx`,
`state/editorStore.ts`. **Qualquer outro arquivo de S0 no diff é violação de FR-014 e bloqueia o merge.**

Em particular, três correções são tentadoras e **explicitamente recusadas pela spec**:

- ❌ validar ids em `mutations.connect` → ✅ zerar `connectSourceId` na limpeza (CL3 / FR-006a)
- ❌ guard de staleness em `applyParsedText` → ✅ `cancelPendingParse()` na limpeza (CL4 / FR-006b)
- ❌ elevar o rename ao store → ✅ derivar o aborto do modelo no `CanvasPanel` (CL5 / FR-006c)

O padrão é o mesmo nos três: **a correção pertence à limpeza (ou à derivação), não às mutações de S0.**

## Fixtures de S0: exatamente duas emendas

FR-014a autoriza emendar **apenas** as duas asserções e2e cuja premissa é o estado vazio de abertura:

1. `tests/e2e/ephemeral.spec.ts` — o `toHaveValue('')` pós-reload passa a afirmar o que o teste **de fato
   existe para provar**: que o **trabalho do usuário** não sobrevive ao reload e o painel volta à forma
   canônica do starter (primeiro contato novo). O starter não afrouxa a efemeridade — ele não preserva nem
   sobrescreve nada.
2. `tests/e2e/us1-preview.spec.ts` — o caso "texto inválido como primeira entrada": com o starter semeado, o
   `lastValidModel` é o starter, então a última prévia válida deixa de ser o vazio. Reaponte **e renomeie**;
   hoje ele só passa porque afere apenas o indicador de status, não o estado a que o nome se refere.

**Se um terceiro teste de S0 quebrar, pare.** A premissa de FR-014a falhou, e o caso merece decisão explícita
— nunca emenda silenciosa até o verde.

## Checklist de conclusão

- [ ] O starter aparece no **primeiro paint** — o vazio de S0 nunca é pintado (SC-001)
- [ ] O código do primeiro contato é **byte-idêntico** a `generate(STARTER_MODEL)` (SC-003)
- [ ] As **5** ações centrais de S0 funcionam sobre o starter, sem passo preparatório (SC-004)
- [ ] Limpar o starter **intocado** não pede confirmação; limpar com trabalho **pede** (FR-007)
- [ ] Limpar com origem de conexão pendente / parse em voo / rename em curso não deixa resíduo (SC-006)
- [ ] Diálogo: foco entra, `Escape` cancela, foco **retorna** ao controle (FR-016)
- [ ] Live region **transiciona** de vazia para a mensagem de semeadura (SC-013 — não basta o texto final)
- [ ] `npm run test:e2e:perf` verde: p95 ≤ 1 s no build de produção (SC-012)
- [ ] `git diff --stat src/` mostra **só** os 6 arquivos de S0 da Decisão F + os arquivos novos de S1
- [ ] Os 8 portões da constitution v1.0.0 seguem verdes
