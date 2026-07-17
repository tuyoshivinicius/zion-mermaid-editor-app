# Contract: Painel de Propriedades

Módulo: `src/components/PropertiesPanel.tsx` (novo) + `src/components/ui/select.tsx` (primitivo shadcn
novo). Montado no `App`. Reflete `selection`.

## PP1 — Reflexo da seleção (FR-003)
- **Conexão selecionada** ⇒ expõe o **rótulo** (input de texto).
- **Nó selecionado** ⇒ expõe o **formato** (seletor de 14 valores).
- **Sem seleção** ⇒ estado **neutro**. NÃO é superfície de escolha de *template* (FR-012/SC-011 de S1
  preservados) — não oferece diagramas iniciais.

## PP2 — Exatidão de escopo (FR-003a)
- Expõe **exatamente** rótulo (conexão) e formato (nó). NÃO expõe aparência de conexão (RF-06), estilo
  (RF-08), agrupamento (RF-09) nem layout (RF-10).
- O **rename de nó permanece inline** (S0) e **não** é duplicado no painel.
- A criação de nó não ganha escolha de formato (FR-014).

## PP3 — Edição de rótulo (FR-004/004a/004b)
- Parte do **texto atual** quando a conexão já tem rótulo; campo vazio quando não tem.
- Criar/editar/remover o texto reescreve a linha da aresta **no mesmo instante** (≤ 150 ms, laço
  síncrono `applyMutation`). Apagar todo o texto ⇒ conexão sem rótulo (linha sem `|...|`).
- O `<input>` é **real** e retém foco (vive fora do wrapper de nó do React Flow — o problema de foco de
  S0 não se aplica). Normalização (trim, vazio→ausência) mora na mutação, não no painel.

## PP4 — Seleção de formato (FR-005/005a/012)
- Oferece **os 14** formatos de `SHAPE_DELIMITERS` — o mesmo conjunto que o código suporta e o canvas
  desenha (uma regra só; sem cauda).
- Indica o formato **atual** do nó (FR-005a).
- Escolher reescreve **exatamente uma** linha (a do nó); id/label e arestas intactos (SC-005).

## PP5 — Acessibilidade (FR-012 / SC-011 / SC-015)
- Os dois fluxos (rotular conexão, escolher formato) são completáveis **inteiramente por teclado**.
- Painel e controles têm nome e papel acessíveis; cada um dos 14 formatos tem **nome acessível em
  pt-BR** (`src/strings.ts`); o formato atual é programaticamente determinável.
- A seleção estabelecida por foco de teclado **persiste** quando o foco entra no painel (SE3/SC-015).
