# Data Model — Área de trabalho

Esta feature **não acrescenta nada ao `Modelo`**. Ela acrescenta um **slot de sessão** ao lado dele e
um punhado de tipos de geometria que nunca são persistidos nem projetados. O corte é o do ADR-003: o
`Modelo` é a verdade estrutural; o efêmero vive como campo do store de sessão, marcado como
não-serializável; e serializar é projetar o `Modelo` — o que não está lá não é emitido.

```
Modelo            (inalterado)  ── serializado no código
Arranjo           (inalterado)  ── efêmero de sessão
areaDeTrabalho    (NOVO)        ── efêmero de sessão  ← esta spec
```

---

## 1. `AreaDeTrabalho` — o slot de sessão

Vive em `EstadoSessao` (`src/modelo/store.ts`), irmão de `modelo`, `arranjo`, `contadores`,
`textoEditor` e `revelar`. **Nunca** entra numa transação, **nunca** é lido pelo codec, **nunca** é
gravado no armazém do navegador.

| Campo | Tipo | Padrão | Requisito | Notas |
|---|---|---|---|---|
| `razaoEditor` | `number` (0–1) | `0.42` | `FR-006` | Fração da largura da área de trabalho que cabe ao **editor**. É uma **razão**, não uma largura: mudar o tamanho da janela não a move. Só a pessoa a muda. |
| `enquadramento` | `Enquadramento` | derivado na abertura | `FR-017` | A casa declarada do enquadramento. Reconciliada **ao fim** de cada gesto; durante o gesto contínuo a vista corre à frente (§4). |
| `modoHand` | `'off' \| 'persistente' \| 'temporario'` | `'off'` | `FR-003`, `FR-004` | O estado que o cursor declara. Entrar/sair **não altera a seleção**. |
| `piloto` | `Piloto \| null` | `null` | `FR-012` | Registrado pelo `Canvas` ao montar; é o que permite `ciclo-por-teclado` chamar `trazerParaAreaVisivel` sem falar React Flow. |
| `aberturaPendente` | `boolean` | `true` | `FR-017` | Gatilho de disparo único da abertura: dispara na primeira projeção com conteúdo e desarma. |

### Validações

- `razaoEditor` é sempre **recortada pelos mínimos** na hora de renderizar (`max-width` do editor), não
  na hora de gravar: a razão que ela escolheu é preservada mesmo numa janela estreita, e volta a
  valer quando a janela alarga. Guardar a razão já recortada faria a janela reescrever a escolha dela.
- `enquadramento.zoom` **não** é recortado pela faixa na gravação: ajustar à tela pode legitimamente
  gravar um valor abaixo do piso (`FR-008`). Quem satura é o **gesto contínuo** (`minZoom` dinâmico).
- `modoHand === 'temporario'` é sempre transitório: volta a `'off'` ao soltar a tecla, mesmo que a
  janela perca o foco no meio do gesto.

### Transições de estado do modo hand

```
off ──(alternância na barra)──▶ persistente ──(alternância)──▶ off
off ──(Espaço ↓)──▶ temporario ──(Espaço ↑ | blur)──▶ off
persistente ──(Espaço ↓/↑)──▶ persistente        (a temporária não desliga a persistente)
```

Nenhuma dessas transições toca a seleção corrente (`FR-004`, `SC-014`).

---

## 2. Tipos de geometria

Todos puros, sem dependência de React nem da engine. Vivem em `src/areatrabalho/`.

| Tipo | Forma | Papel |
|---|---|---|
| `Enquadramento` | `{ x: number; y: number; zoom: number }` | O transform da área do diagrama: para onde a área visível foi levada sobre o plano, e em que escala. É a mesma tripla que a engine usa, o que evita conversão de ida e volta. |
| `Caixa` | `{ x, y, w, h }` | Retângulo em coordenadas **do plano**. Unidade da extensão desenhada. |
| `Quadro` | `{ x, y, w, h }` | A **área visível** em coordenadas **de tela**, já recortada pela janela e descontadas as sobreposições persistentes (`FR-011`). |
| `Oclusao` | `{ id: string; borda: 'topo' \| 'direita' \| 'baixo' \| 'esquerda'; espessura: number }` | O que um controle persistente declara ao montar. O quadro recua pela **maior** espessura declarada em cada borda. |
| `Orientacao` | `'TB' \| 'TD' \| 'BT' \| 'LR' \| 'RL'` | A orientação corrente. Dado de `layout-automatico` (`RF-16`, ADR-007), lido aqui por uma costura de um valor só. |
| `Canto` | `'superior-esquerdo' \| 'superior-direito' \| 'inferior-esquerdo' \| 'inferior-direito'` | O **começo do elemento na ordem de leitura** (`FR-012`), derivado da orientação. |
| `Piloto` | `{ enquadramentoCorrente(): Enquadramento; aplicar(e, comTransito): void; quadro(): Quadro }` | A ponte mínima entre o store e a engine. Tudo o que o produto decide é aritmética; o piloto só **aplica**. |

### Relações

```
Projecao (nodes, edges)  ──extensaoDesenhada()──▶  Caixa            // a geometria única de FR-008 e FR-011
Quadro + Enquadramento   ──quadroNoPlano()──────▶  Caixa            // o que a pessoa vê, em coordenadas do plano
Caixa (elemento) + Caixa (quadro) + folga ──────▶  boolean          // estaNaAreaVisivel (FR-011)
Caixa (elemento) + Caixa (quadro) + folga + Canto  ─▶ Enquadramento // trazer, com deslocamento mínimo (FR-012)
Caixa (diagrama) + Quadro + folga ──────────────▶  Enquadramento    // ajustar à tela, centralizado (FR-008)
```

O `Arranjo` aparece nessas contas **só como entrada** — via `Projecao`, que já o consumiu. Nenhuma
delas devolve posição de elemento, e é por isso que `SC-002` ("0 elementos mudam de posição") é
verdadeiro por assinatura de função, não por teste de comportamento.

---

## 3. O que **não** entra no modelo de dados

Registrado porque a ausência é a decisão:

- **Nada disto vira campo do `Modelo`.** Nem `zoom`, nem `x/y`, nem `razaoEditor`. O codec não os
  conhece, então o código copiado não pode carregá-los (`FR-013`, `SC-001`).
- **Nada disto vira entrada de histórico.** Não há tipo `EntradaDeNavegacao`, não há pilha de
  enquadramentos. Desfazer reverte o último ato **do modelo** (`FR-014`, `SC-009`).
- **Nada disto é persistido.** O rascunho guarda modelo e arranjo (ADR-010); enquadramento e zoom são
  **derivados** do conteúdo na abertura (`FR-017`), não recuperados.
- **Não há geometria por tipo de elemento.** `extensaoDesenhada` responde para nó, conexão e
  agrupamento pela mesma função, e `cantoDeLeitura` é uma regra só para os três (`FR-011`, `FR-012`).
- **Não há estado por nó.** Nenhum campo novo em `RFNode`/`RFEdge`, nenhum handle, nenhum controle
  pendurado por elemento: o custo por elemento acrescentado por esta feature é **zero** (Princípio III).
