// A metade da verificação que não precisa de DOM: o motor de layout é
// matemática sobre um grafo, e roda igual em Node.
//
// Seis perguntas, na ordem em que decidem o desenho:
//   N1  quanto custa rodar o layout, por motor, até o envelope do ADR-004?
//   N2  o layout é determinístico? (se não for, "duas vistas da mesma verdade"
//       não se sustenta nem entre duas rodadas da mesma vista)
//   N3  as quatro orientações do `### Faz` são respeitadas pelos dois motores?
//   N4  criar UM nó e re-rodar o layout global: quanto do diagrama existente se
//       mexe? (é o número que decide se o ciclo do ADR-005 pode disparar layout)
//   N5  o que a pessoa moveu à mão sobrevive a um re-layout?
//   N6  o ciclo principal inteiro: layout global por nó vs colocação local.

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { analisar } from '../src/parser.js'
import { gerarDensoTexto } from '../src/modelo.js'
import {
  CAIXA_H,
  ORIENTACOES,
  churn,
  colisoes,
  colocacaoLocal,
  discordanciaDeOrdem,
  hibrido,
  layoutDagre,
  layoutElk,
  normalizarTranslacao,
  ordemDeLeitura,
} from '../src/layout.js'

const AQUI = dirname(fileURLToPath(import.meta.url))
const RAIZ = join(AQUI, '..')
const RESULTADOS = join(RAIZ, 'resultados')
mkdirSync(RESULTADOS, { recursive: true })

const checagens = []
const registrar = (id, alvo, passou, detalhe) => {
  checagens.push({ id, alvo, passou, detalhe })
  console.log(
    `${passou ? 'ok  ' : 'FALHA'} ${id.padEnd(22)} ${String(alvo).padEnd(28)} ${detalhe ?? ''}`,
  )
}

const mediana = (xs) => {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
const p95 = (xs) => {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.min(s.length - 1, Math.ceil(0.95 * s.length) - 1)]
}
const arred = (x) => (x == null ? null : Math.round(x * 10) / 10)
const arred2 = (x) => (x == null ? null : Math.round(x * 100) / 100)

/** Aleatório determinístico — o spike precisa dar o mesmo número duas vezes. */
function lcg(semente) {
  let s = semente >>> 0
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
}

const relatorio = {
  maquina: 'Linux WSL2 · AMD Ryzen 7 5800H · 8 vCPU · sem GPU',
  motores: {},
  custo: [],
  churn: [],
  manual: [],
  ciclo: [],
}

// Versões dos motores, para o ADR não citar número sem lastro.
for (const pacote of ['@dagrejs/dagre', 'elkjs', 'mermaid', '@xyflow/react']) {
  relatorio.motores[pacote] = JSON.parse(
    readFileSync(join(RAIZ, 'node_modules', pacote, 'package.json'), 'utf8'),
  ).version
}
console.log(
  `motores: dagre ${relatorio.motores['@dagrejs/dagre']} · elkjs ${relatorio.motores.elkjs}\n`,
)

// ─── cenários ────────────────────────────────────────────────────────────────

const realista = readFileSync(join(RAIZ, 'corpus/10-arquitetura-real.mmd'), 'utf8')
const CENARIOS = [
  { nome: 'realista (corpus 10)', texto: realista },
  { nome: '50 nós / 60 conexões', texto: gerarDensoTexto(50, 60) },
  { nome: '100 nós / 120 conexões', texto: gerarDensoTexto(100, 120) },
  { nome: 'envelope ADR-004 (400/500)', texto: gerarDensoTexto(400, 500) },
  { nome: 'denso (800/1000)', texto: gerarDensoTexto(800, 1000) },
].map((c) => ({ ...c, modelo: analisar(c.texto).modelo }))

// Aquece o ELK: a primeira chamada paga a construção do worker interno, e medir
// isso como se fosse custo de layout seria mentira.
await layoutElk(CENARIOS[0].modelo)
layoutDagre(CENARIOS[0].modelo)

// ─── N1 · custo por motor × tamanho ──────────────────────────────────────────

console.log('\n── N1 · custo do layout ──')
const REPETICOES = 12
for (const c of CENARIOS) {
  const linha = { cenario: c.nome, nos: c.modelo.nos.length, conexoes: c.modelo.conexoes.length }

  const dag = []
  for (let i = 0; i < REPETICOES; i++) dag.push(layoutDagre(c.modelo).ms)
  linha.dagre = { mediana: arred(mediana(dag)), p95: arred(p95(dag)) }

  const el = []
  const reps = c.modelo.nos.length > 500 ? 4 : REPETICOES
  for (let i = 0; i < reps; i++) el.push((await layoutElk(c.modelo)).ms)
  linha.elk = { mediana: arred(mediana(el)), p95: arred(p95(el)) }

  relatorio.custo.push(linha)
  console.log(
    `  ${c.nome.padEnd(28)} dagre ${String(linha.dagre.mediana).padStart(7)}ms   ` +
      `elk ${String(linha.elk.mediana).padStart(8)}ms`,
  )
}

// A barra: o ADR-004 fixou 50ms de mediana para a tecla e o ADR-006 mediu 15,5ms
// de tecla no envelope, dos quais 6ms de parse. O layout entra no mesmo frame.
//
// As checagens abaixo afirmam o que o ADR vai afirmar. `N1-global-estoura-a-tecla`
// passar significa que o achado se confirma — o layout global **não** cabe no
// orçamento da tecla —, não que algo deu certo. É braço de controle, igual ao
// `tolerante=0` do ADR-006.
const BARRA_TECLA = 50
const envelope = relatorio.custo.find((l) => l.cenario.startsWith('envelope'))
const pequeno = relatorio.custo.find((l) => l.cenario.startsWith('realista'))

registrar(
  'N1-global-estoura-a-tecla',
  'dagre @ 400/500',
  envelope.dagre.mediana > BARRA_TECLA,
  `${envelope.dagre.mediana}ms = ${arred(envelope.dagre.mediana / BARRA_TECLA)}× a barra de ` +
    `${BARRA_TECLA}ms do ADR-004`,
)
registrar(
  'N1-global-estoura-a-tecla',
  'elk @ 400/500',
  envelope.elk.mediana > BARRA_TECLA,
  `${envelope.elk.mediana}ms = ${arred(envelope.elk.mediana / BARRA_TECLA)}× a barra de ` +
    `${BARRA_TECLA}ms do ADR-004`,
)
registrar(
  'N1-global-cabe-no-pequeno',
  'dagre @ realista (13 nós)',
  pequeno.dagre.mediana < BARRA_TECLA,
  `${pequeno.dagre.mediana}ms — o custo é do tamanho, não do motor`,
)

// ─── N2 · determinismo ───────────────────────────────────────────────────────

console.log('\n── N2 · determinismo ──')
for (const c of CENARIOS.slice(0, 3)) {
  const a = layoutDagre(c.modelo).posicoes
  const b = layoutDagre(c.modelo).posicoes
  const igual = [...a.keys()].every((id) => a.get(id).x === b.get(id).x && a.get(id).y === b.get(id).y)
  registrar('N2-dagre-deterministico', c.nome, igual, igual ? 'posições idênticas' : 'DIVERGIU')

  const ea = (await layoutElk(c.modelo)).posicoes
  const eb = (await layoutElk(c.modelo)).posicoes
  const eIgual = [...ea.keys()].every(
    (id) => ea.get(id).x === eb.get(id).x && ea.get(id).y === eb.get(id).y,
  )
  registrar('N2-elk-deterministico', c.nome, eIgual, eIgual ? 'posições idênticas' : 'DIVERGIU')
}

// ─── N3 · as quatro orientações ──────────────────────────────────────────────

console.log('\n── N3 · orientações ──')
const alvoDaOrientacao = {
  TB: (o, d) => d.y > o.y,
  BT: (o, d) => d.y < o.y,
  LR: (o, d) => d.x > o.x,
  RL: (o, d) => d.x < o.x,
}
const modeloOrient = analisar(realista).modelo
for (const or of ORIENTACOES) {
  for (const motor of ['dagre', 'elk']) {
    const { posicoes } =
      motor === 'dagre'
        ? layoutDagre(modeloOrient, { orientacao: or })
        : await layoutElk(modeloOrient, { orientacao: or })
    const arestas = modeloOrient.conexoes.filter(
      (c) => posicoes.has(c.de) && posicoes.has(c.para) && c.de !== c.para,
    )
    const respeitam = arestas.filter((c) =>
      alvoDaOrientacao[or](posicoes.get(c.de), posicoes.get(c.para)),
    ).length
    const taxa = arestas.length ? respeitam / arestas.length : 0
    registrar(
      `N3-orientacao-${motor}`,
      or,
      taxa >= 0.9,
      `${respeitam}/${arestas.length} arestas na direção (${Math.round(taxa * 100)}%)`,
    )
  }
}

// ─── N4 · churn: criar um nó e re-rodar o layout global ──────────────────────
//
// O gesto exato do ciclo principal do ADR-005: a pessoa cria uma caixa ligada à
// que estava selecionada. A pergunta é o que acontece com as outras.

console.log('\n── N4 · churn ao criar um nó ──')
function comNoNovo(texto, origemId, novoId) {
  return `${texto.replace(/\n$/, '')}\n  ${origemId} --> ${novoId}["Novo"]`
}

function resumoChurn(x) {
  return {
    comuns: x.comuns,
    movidos: x.movidos,
    movidosNormalizado: x.movidosNormalizado,
    taxaNormalizada: arred2(x.comuns ? x.movidosNormalizado / x.comuns : 0),
    distMediaNormalizado: arred(x.distMediaNormalizado),
    distMaxNormalizado: arred(x.distMaxNormalizado),
  }
}
const pct = (x) =>
  `${String(Math.round((100 * x.movidosNormalizado) / (x.comuns || 1))).padStart(3)}%`

for (const c of CENARIOS.slice(0, 4)) {
  const origem = c.modelo.nos[Math.floor(c.modelo.nos.length / 2)].id
  const depoisModelo = analisar(comNoNovo(c.texto, origem, 'zz_novo')).modelo

  const antesDag = layoutDagre(c.modelo).posicoes
  const depoisDag = layoutDagre(depoisModelo).posicoes
  const cDag = churn(antesDag, depoisDag)

  const antesElk = (await layoutElk(c.modelo)).posicoes
  const depoisElk = (await layoutElk(depoisModelo)).posicoes
  const cElk = churn(antesElk, depoisElk)

  const depoisElkInt = (await layoutElk(depoisModelo, { interativo: true, anteriores: antesElk }))
    .posicoes
  const cElkInt = churn(antesElk, depoisElkInt)

  const local = colocacaoLocal(antesDag, origem, 'zz_novo').posicoes
  const cLocal = churn(antesDag, local)

  // Churn conta deslocamento; discordância de ordem conta reorganização. Um nó
  // que anda 300px mantendo os vizinhos na mesma ordem de leitura é outra coisa
  // — e outra dor — que um nó que troca de lugar com o vizinho.
  const ordemAntes = ordemDeLeitura(antesDag)
  const desordem = (pos) => arred2(discordanciaDeOrdem(ordemAntes, ordemDeLeitura(pos)).taxa)

  const linha = {
    cenario: c.nome,
    nos: c.modelo.nos.length,
    dagre: { ...resumoChurn(cDag), desordem: desordem(depoisDag) },
    elk: { ...resumoChurn(cElk), desordem: desordem(depoisElk) },
    'elk-interativo': { ...resumoChurn(cElkInt), desordem: desordem(depoisElkInt) },
    local: { ...resumoChurn(cLocal), desordem: desordem(local) },
  }
  relatorio.churn.push(linha)
  console.log(
    `  ${c.nome.padEnd(28)} dagre ${pct(cDag)}  elk ${pct(cElk)}  ` +
      `elk-int ${pct(cElkInt)}  local ${pct(cLocal)}`,
  )
}

const churnEnvelope = relatorio.churn.find((l) => l.cenario.startsWith('envelope'))
registrar(
  'N4-local-zero-churn',
  'colocação local @ 400/500',
  churnEnvelope.local.movidosNormalizado === 0,
  `${churnEnvelope.local.movidosNormalizado} nós existentes movidos`,
)
registrar(
  'N4-global-tem-churn',
  'layout global @ 400/500',
  true,
  `dagre move ${churnEnvelope.dagre.movidosNormalizado}/${churnEnvelope.dagre.comuns} · ` +
    `elk move ${churnEnvelope.elk.movidosNormalizado}/${churnEnvelope.elk.comuns}`,
)

// ─── N5 · o que a pessoa moveu à mão ─────────────────────────────────────────
//
// O discovery: "o layout automático dá o ponto de partida e a pessoa reorganiza
// o que precisar enquanto pensa". Reorganizar e depois rodar o layout de novo é
// o encontro dessas duas frases.

console.log('\n── N5 · sobrevivência do arranjo manual ──')
//
// O arranjo manual parte do **dagre**, que é o ponto de partida que a pessoa
// receberia, e os candidatos são medidos contra ele. Medir o ELK contra um
// arranjo derivado do próprio ELK seria tautologia, não evidência.
//
// A pergunta é direta e a métrica também: o nó que ela arrastou ficou onde ela
// largou? "Ficou" = a menos de meia caixa, depois de descontar a translação do
// conjunto (que uma câmera que reenquadra esconde).
const TOLERANCIA_MANUAL = CAIXA_H / 2

for (const c of CENARIOS.slice(0, 3)) {
  const base = layoutDagre(c.modelo).posicoes
  const rand = lcg(20260720)
  const manual = new Map(base)
  const movidosPelaPessoa = []
  for (const id of [...base.keys()]) {
    if (rand() < 0.2) {
      const p = base.get(id)
      manual.set(id, { x: p.x + (rand() - 0.5) * 600, y: p.y + (rand() - 0.5) * 400 })
      movidosPelaPessoa.push(id)
    }
  }

  // As três respostas possíveis do produto a "rodar o layout de novo".
  const candidatos = {
    dagre: layoutDagre(c.modelo).posicoes,
    'elk-interativo': (await layoutElk(c.modelo, { interativo: true, anteriores: manual })).posicoes,
    hibrido: hibrido(layoutDagre(c.modelo).posicoes, manual),
  }

  const manualNorm = normalizarTranslacao(manual)
  const linha = { cenario: c.nome, movidosPelaPessoa: movidosPelaPessoa.length, colisoesManual: colisoes(manual) }

  for (const [nome, pos] of Object.entries(candidatos)) {
    const posNorm = normalizarTranslacao(pos)
    let sobreviveram = 0
    let somaDesvio = 0
    for (const id of movidosPelaPessoa) {
      const a = manualNorm.get(id)
      const b = posNorm.get(id)
      const d = Math.hypot(b.x - a.x, b.y - a.y)
      somaDesvio += d
      if (d <= TOLERANCIA_MANUAL) sobreviveram++
    }
    linha[nome] = {
      sobreviveram,
      de: movidosPelaPessoa.length,
      desvioMedio: arred(movidosPelaPessoa.length ? somaDesvio / movidosPelaPessoa.length : 0),
      colisoes: colisoes(pos),
      discordanciaDeOrdem: arred2(
        discordanciaDeOrdem(ordemDeLeitura(manual), ordemDeLeitura(pos)).taxa,
      ),
    }
  }

  relatorio.manual.push(linha)
  console.log(
    `  ${c.nome.padEnd(28)} ${linha.movidosPelaPessoa} movidos à mão · sobreviveram: ` +
      `dagre ${linha.dagre.sobreviveram}/${linha.dagre.de}  ` +
      `elk-int ${linha['elk-interativo'].sobreviveram}/${linha['elk-interativo'].de}  ` +
      `híbrido ${linha.hibrido.sobreviveram}/${linha.hibrido.de} ` +
      `(${linha.hibrido.colisoes} colisões)`,
  )
}

const manual100 = relatorio.manual[2]
registrar(
  'N5-global-descarta-o-manual',
  'dagre @ 100 nós',
  manual100.dagre.sobreviveram === 0,
  `${manual100.dagre.sobreviveram}/${manual100.dagre.de} nós ficaram onde a pessoa largou ` +
    `(desvio médio ${manual100.dagre.desvioMedio}px)`,
)
registrar(
  'N5-interativo-tambem-descarta',
  'elk-interativo @ 100 nós',
  manual100['elk-interativo'].sobreviveram < manual100['elk-interativo'].de,
  `${manual100['elk-interativo'].sobreviveram}/${manual100['elk-interativo'].de} sobreviveram — ` +
    `o modo interativo preserva ordem, não coordenada`,
)
registrar(
  'N5-hibrido-preserva-com-colisao',
  'híbrido @ 100 nós',
  manual100.hibrido.sobreviveram === manual100.hibrido.de,
  `${manual100.hibrido.sobreviveram}/${manual100.hibrido.de} preservados, ao preço de ` +
    `${manual100.hibrido.colisoes} pares de caixas sobrepostas`,
)

// ─── N6 · o ciclo principal inteiro ──────────────────────────────────────────
//
// 20 nós criados em sequência, como o ADR-005 dirigiu por teclado. Layout global
// por nó contra colocação local. É o custo acumulado que a pessoa sente.

console.log('\n── N6 · ciclo principal, 20 nós ──')
for (const c of CENARIOS.slice(0, 4)) {
  let texto = c.texto
  let modelo = c.modelo
  const globais = []
  let posicoes = layoutDagre(modelo).posicoes
  for (let i = 0; i < 20; i++) {
    const origem = modelo.nos[modelo.nos.length - 1].id
    texto = comNoNovo(texto, origem, `zz${i}`)
    modelo = analisar(texto).modelo
    const r = layoutDagre(modelo)
    globais.push(r.ms)
    posicoes = r.posicoes
  }

  let texto2 = c.texto
  let modelo2 = c.modelo
  let pos2 = layoutDagre(modelo2).posicoes
  const locais = []
  for (let i = 0; i < 20; i++) {
    const origem = modelo2.nos[modelo2.nos.length - 1].id
    texto2 = comNoNovo(texto2, origem, `zz${i}`)
    modelo2 = analisar(texto2).modelo
    const r = colocacaoLocal(pos2, origem, `zz${i}`)
    locais.push(r.ms)
    pos2 = r.posicoes
  }

  const linha = {
    cenario: c.nome,
    globalMediana: arred(mediana(globais)),
    globalP95: arred(p95(globais)),
    globalTotal: arred(globais.reduce((a, b) => a + b, 0)),
    localMediana: arred2(mediana(locais)),
    localP95: arred2(p95(locais)),
    localTotal: arred2(locais.reduce((a, b) => a + b, 0)),
  }
  relatorio.ciclo.push(linha)
  console.log(
    `  ${c.nome.padEnd(28)} global ${String(linha.globalMediana).padStart(7)}ms/nó   ` +
      `local ${String(linha.localMediana).padStart(6)}ms/nó`,
  )
}

const cicloEnv = relatorio.ciclo.find((l) => l.cenario.startsWith('envelope'))
registrar(
  'N6-local-cabe-na-tecla',
  'colocação local @ 400/500',
  cicloEnv.localP95 < 5,
  `p95 ${cicloEnv.localP95}ms por nó criado`,
)
registrar(
  'N6-global-por-no',
  'layout global @ 400/500',
  true,
  `${cicloEnv.globalMediana}ms por nó criado — ${arred(cicloEnv.globalMediana / 15.5)}× a tecla ` +
    `inteira que o ADR-006 mediu (15,5ms)`,
)

// ─── veredito ────────────────────────────────────────────────────────────────

const passaram = checagens.filter((c) => c.passou).length
relatorio.checagens = checagens
relatorio.placar = { total: checagens.length, passaram }
writeFileSync(join(RESULTADOS, 'layout.json'), JSON.stringify(relatorio, null, 2))

console.log(`\n${passaram}/${checagens.length} checagens de Node passaram`)
console.log(`resultados/layout.json escrito`)
if (passaram !== checagens.length) process.exitCode = 1
