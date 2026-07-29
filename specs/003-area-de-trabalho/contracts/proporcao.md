# Contrato — Proporção da área de trabalho

`FR-006` e `FR-007`. A proporção é uma **razão** da sessão, não uma largura e não um atributo do
documento. Quase tudo aqui é resolvido por CSS; o que sobra é uma conta O(1).

Módulos: `src/areatrabalho/AreaDeTrabalho.tsx` · `Divisao.tsx` · `faixa.ts` · `enquadramento.ts`.

## 1. Os números declarados

| Constante | Valor |
|---|---|
| `MIN_DIAGRAMA` | **480 px** |
| `MIN_EDITOR` | **320 px** (o `min-w-[320px]` que o R0 já declarou) |
| `SOMA_DOS_MINIMOS` | **800 px** (derivado) |
| `PROPORCAO_PADRAO` | **58 % diagrama / 42 % editor** (o que o R0/R1 já entrega) |

## 2. O layout

```
.area-de-trabalho  { display: flex; min-width: 800px; }
.vista-diagrama    { flex: 1 1 auto;  min-width: 480px; }
.vista-editor      { flex: 0 0 var(--razao-editor, 42%);
                     min-width: 320px;
                     max-width: calc(100% - 480px); }
raiz da página     { overflow-x: auto; }
```

Quatro exigências caem daí, **sem uma linha de JavaScript no `resize`**:

| Exigência | Como o CSS a entrega | Requisito |
|---|---|---|
| A razão é preservada quando a janela muda | `flex-basis` em porcentagem: as duas vistas crescem e encolhem **juntas**, na mesma fração | `FR-006`, `SC-007` |
| Os mínimos recortam a razão por baixo | o `max-width` do editor é o mínimo do diagrama espelhado; a 800px dá exatamente 480 + 320, **sem rolagem prematura** | `FR-006` |
| Abaixo da soma dos mínimos, quem cede é a **página** | `min-width` do contêiner segura a área de trabalho; a raiz rola horizontalmente | `FR-006`, `SC-007` |
| Nenhuma das duas vistas some | nenhuma encolhe abaixo do próprio mínimo; **não há prioridade** entre elas | `FR-006`, `SC-007` |

## 3. O arrasto da divisão

| Propriedade | Regra | Requisito |
|---|---|---|
| Durante o gesto | escreve `--razao-editor` **por `ref`**, sem estado React no meio — **0 re-renders** dos 400 nós | `FR-016`, `SC-003` |
| Ao soltar | comita `razaoEditor` no slot de sessão | `FR-006` |
| Saturação | para no mínimo declarado de cada vista | `FR-006`, `SC-007` |
| Permanência | a proporção permanece até que **ela mesma** a mude; trocar o conteúdo não a altera | `FR-006` |
| Alcance sem ponteiro | **não tem** — é gesto de ponteiro, e a enumeração do `FR-018` é exaustiva | `FR-018` |
| Histórico | **0** entradas | `FR-014`, `SC-009` |
| Código | **byte-idêntico** | `FR-013`, `SC-001` |

O valor guardado é a razão **que ela escolheu**, nunca a razão já recortada: o recorte acontece na
renderização (`max-width`), de modo que uma janela estreita não reescreve a escolha dela — quando a
janela alarga, a razão original volta a valer.

## 4. O que redimensionar **não** faz (`FR-007`)

| Garantia | Requisito |
|---|---|
| **0** mudanças do nível de zoom | `FR-007`, `SC-007` |
| **0** elementos movidos | `FR-007`, `SC-002` |
| **0** reenquadramentos automáticos | `FR-007`, `SC-007` |
| O ponto do plano que estava no **centro da área visível** continua no centro | `FR-007`, `SC-007` |
| Código **byte-idêntico** | `FR-013`, `SC-001` |

**A parte que o CSS não faz.** React Flow mantém `(x, y, zoom)` fixos quando o contêiner muda de
tamanho — o que ancora o **canto superior esquerdo**, não o centro. Um `ResizeObserver` sobre a área
do diagrama corrige por aritmética O(1) (`preservarCentro`, em `enquadramento.ts`):

```
x' = x + (largura_visível_nova − largura_visível_velha) / 2
y' = y + (altura_visível_nova  − altura_visível_velha)  / 2      // zoom inalterado
```

Medido sobre a **área visível descontada** (ver [area-visivel.md](./area-visivel.md)), não sobre o
retângulo bruto, para que a conta concorde com `FR-011`. Um caminho só serve aos dois casos — a
divisão sendo arrastada e a janela mudando de tamanho —, e nenhum deles é o produto reenquadrando por
conta própria: é a preservação do que ela escolheu.

## 5. Fora deste contrato

- **Colapsar, ocultar ou alternar as duas vistas em abas** — não é escopo (`FR-006`). São duas vistas
  do mesmo modelo (`R-03`); esconder uma é capacidade nova, com consequência própria.
- **Um comando de proporção sem ponteiro** — se um dia existir, é afordância de `ciclo-por-teclado`,
  dona das teclas, e não capacidade nova daqui (`FR-018`).
- **Persistir a proporção entre sessões** — decisão de `rascunho-da-sessao` (ADR-010), não desta spec.
