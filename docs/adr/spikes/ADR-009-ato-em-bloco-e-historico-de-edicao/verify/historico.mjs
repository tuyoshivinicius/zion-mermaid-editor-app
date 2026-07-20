// A metade da verificação que não precisa de DOM: as propriedades da transação.
//
// Perguntas, em ordem de importância para a decisão do ADR-009:
//   H1  um ato sobre uma seleção inteira desfaz como **um só**? (a frase do
//       discovery que o ADR-003 prometeu por pesquisa)
//   H1c e o desenho ingênuo — o mesmo ato como N transações — custa quantos
//       desfazeres? (braço de controle)
//   H2  refazer devolve exatamente o que o desfazer tirou?
//   H3  o ciclo ato→desfazer devolve o documento **byte a byte**, ou só "quase"?
//   H4  "repetir a última alteração em outro elemento" é reexecutável a partir
//       do histórico, sem refazer o caminho até o controle?
//   H5  digitar no editor de código produz **um** ato ou um por tecla? (a pilha
//       rival que o ADR-003 disse ter dissolvido)
//   H6  um ato que toca dois agregados (remover nó + suas ligações) desfaz junto?
//   H7  a posição — estado de sessão do ADR-007 — entra no mesmo histórico?
//   H8  quanto custa guardar a sessão inteira, em cada modo de histórico?
//   H9  a transação preserva o reuso de objeto que o ADR-004 fixou?
//   H10 histórico com teto se comporta, ou corrompe o estado ao encher?

import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { analisar, serializar, normalizar, TIPOS } from '../src/registro.js'
import { criarHistorico, estadoInicial, idsDosNos, nosDe, repetir, COMANDOS } from '../src/comandos.js'

const AQUI = dirname(fileURLToPath(import.meta.url))
const RAIZ = join(AQUI, '..')
const RESULTADOS = join(RAIZ, 'resultados')
mkdirSync(RESULTADOS, { recursive: true })

const checagens = []
const registrar = (id, familia, alvo, passou, detalhe) => {
  checagens.push({ id, familia, alvo, passou, detalhe })
  console.log(
    `${passou ? 'ok  ' : 'FALHA'} ${id.padEnd(24)} ${String(familia).padEnd(10)} ${String(alvo).padEnd(26)} ${detalhe ?? ''}`,
  )
}

const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const FAMILIAS = ['flowchart', 'classe', 'sequencia']

const corpus = []
for (const familia of FAMILIAS) {
  const dir = join(RAIZ, 'corpus', familia)
  for (const arq of readdirSync(dir).sort()) {
    corpus.push({ familia, nome: arq, texto: readFileSync(join(dir, arq), 'utf8').replace(/\n$/, '') })
  }
}

const relatorio = { maquina: 'Linux WSL2 · AMD Ryzen 7 5800H · 8 vCPU · sem GPU', corpus: corpus.length }

// ─── H1 · um ato, um desfazer · H2 · refazer · H3 · ponto fixo ───────────────
// As três juntas sobre o mesmo ato, porque são a mesma promessa vista de três
// ângulos: o ato é atômico (H1), reversível (H2) e **exato** (H3).
console.log('')
// A seleção varia de documento para documento — 1, 5 e 10 alvos — para que a
// promessa "um ato, um desfazer" seja testada com seleção de um só e com
// seleção de vários, e não só num tamanho.
const SELECOES = [1, 5, 10]
for (const [indice, { familia, nome, texto }] of corpus.entries()) {
  const base = estadoInicial(texto)
  const todos = idsDosNos(base.modelo)
  const alvos = todos.slice(0, Math.max(1, Math.min(todos.length, SELECOES[indice % SELECOES.length])))
  const codigoAntes = serializar(base.modelo)
  const normalAntes = normalizar(base.modelo)

  const h = criarHistorico({ modo: 'inverso' })
  const depois = h.aplicar(base, 'rotular', { ids: alvos, valor: 'Rotulo em bloco' })
  const todosMudaram = alvos.every((id) => nosDe(depois.modelo).find((n) => n.id === id).rotulo === 'Rotulo em bloco')
  const entradas = h.tamanho()

  const voltou = h.desfazer(depois)
  const mesmaEstrutura = igual(normalizar(voltou.modelo), normalAntes)
  const mesmoTexto = serializar(voltou.modelo) === codigoAntes

  registrar(
    'H1-um-ato-um-desfazer',
    familia,
    nome,
    todosMudaram && entradas === 1 && mesmaEstrutura,
    `${alvos.length} alvo(s) · ${entradas} entrada(s) no histórico · 1 desfazer ${mesmaEstrutura ? 'restaurou tudo' : 'NÃO restaurou'}`,
  )
  registrar(
    'H3-ponto-fixo-do-desfazer',
    familia,
    nome,
    mesmoTexto,
    mesmoTexto ? `${codigoAntes.length} bytes idênticos` : 'o código voltou DIFERENTE do que era',
  )

  const refeito = h.refazer(voltou)
  registrar(
    'H2-refazer-devolve',
    familia,
    nome,
    igual(normalizar(refeito.modelo), normalizar(depois.modelo)) && serializar(refeito.modelo) === serializar(depois.modelo),
    `pilha ${h.tamanho()} · pode desfazer ${h.podeDesfazer()}`,
  )
}

// ─── H1c · o braço de controle: o mesmo ato como N transações ────────────────
console.log('')
const DENSO = TIPOS.flowchart.gerarDensoTexto(400, 500)
for (const quantos of [10, 50, 100]) {
  const base = estadoInicial(DENSO)
  const alvos = idsDosNos(base.modelo).slice(0, quantos)
  const normalAntes = normalizar(base.modelo)

  const emLote = criarHistorico({ modo: 'inverso' })
  let e1 = emLote.aplicar(base, 'rotular', { ids: alvos, valor: 'Bloco' })
  let desfazeresLote = 0
  while (emLote.podeDesfazer() && !igual(normalizar(e1.modelo), normalAntes)) {
    e1 = emLote.desfazer(e1)
    desfazeresLote++
  }

  const umPorUm = criarHistorico({ modo: 'inverso' })
  let e2 = base
  for (const id of alvos) e2 = umPorUm.aplicar(e2, 'rotular', { ids: [id], valor: 'Bloco' })
  const entradasUmPorUm = umPorUm.tamanho()
  let desfazeresUmPorUm = 0
  while (umPorUm.podeDesfazer() && !igual(normalizar(e2.modelo), normalAntes)) {
    e2 = umPorUm.desfazer(e2)
    desfazeresUmPorUm++
  }

  registrar(
    'H1c-controle-sem-lote',
    'flowchart',
    `seleção de ${quantos}`,
    desfazeresLote === 1,
    `em lote: 1 entrada / ${desfazeresLote} desfazer · **controle** um-por-um: ${entradasUmPorUm} entradas / ${desfazeresUmPorUm} desfazeres`,
  )
}

// ─── H9 · a transação preserva o reuso de objeto (ADR-004) ───────────────────
// A invariante mais barata de quebrar sem ninguém ver: bastaria a transação
// remontar a lista inteira. Aqui se conta objeto por identidade.
console.log('')
for (const quantos of [1, 10, 100]) {
  const base = estadoInicial(DENSO)
  const antes = nosDe(base.modelo)
  const alvos = idsDosNos(base.modelo).slice(0, quantos)
  const h = criarHistorico({ modo: 'inverso' })
  const depois = h.aplicar(base, 'rotular', { ids: alvos, valor: 'X' })
  const nova = nosDe(depois.modelo)
  const reusados = nova.filter((n, i) => n === antes[i]).length
  const esperado = antes.length - quantos
  registrar(
    'H9-reuso-de-objeto',
    'flowchart',
    `ato sobre ${quantos} de 400`,
    reusados === esperado,
    `${reusados} de ${antes.length} objetos reusados por identidade (esperado ${esperado}) · a lista é nova, os nós intocados não`,
  )
}

// ─── H4 · repetir a última alteração em outro elemento ───────────────────────
console.log('')
{
  const base = estadoInicial(DENSO)
  const h = criarHistorico({ modo: 'inverso' })
  const ids = idsDosNos(base.modelo)
  const primeiro = h.aplicar(base, 'forma', { ids: [ids[0]], valor: 'losango' })
  const r = repetir(h, primeiro, [ids[1], ids[2]])
  const formaDe = (e, id) => nosDe(e.modelo).find((n) => n.id === id).forma
  const pegou = formaDe(r.estado, ids[1]) === 'losango' && formaDe(r.estado, ids[2]) === 'losango'
  const entradas = h.tamanho()
  const voltou = h.desfazer(r.estado)
  const soODoRepetir = formaDe(voltou, ids[0]) === 'losango' && formaDe(voltou, ids[1]) !== 'losango'
  registrar(
    'H4-repetir-ultima',
    'flowchart',
    'forma em A, repetir em B e C',
    pegou && entradas === 2 && soODoRepetir,
    `repetiu \`${r.feito && r.feito.especie}\` em 2 alvos sem repassar pelo controle · ${entradas} entradas · 1 desfazer tirou só o repetido`,
  )
}

// ─── H5 · o editor de código como produtor de comandos ───────────────────────
// A frase do ADR-003 sob teste: "o editor de código vira produtor de comandos,
// não dono de um histórico rival". Se cada tecla vira uma entrada, a pilha rival
// não foi dissolvida — só mudou de dono.
console.log('')
const PALAVRA = 'documentacao'
for (const coalescer of [true, false]) {
  const partida = 'flowchart TD\n  n1["Passo"]\n  n1 --> n2["Fim"]'
  const base = estadoInicial(partida)
  const h = criarHistorico({ modo: 'inverso', coalescer })
  const codigoAntes = serializar(base.modelo)

  // A rajada: a palavra nasce letra a letra dentro do rótulo, 80ms entre teclas.
  let e = base
  let agora = 1000
  for (let i = 1; i <= PALAVRA.length; i++) {
    const t = `flowchart TD\n  n1["Passo${PALAVRA.slice(0, i)}"]\n  n1 --> n2["Fim"]`
    agora += 80
    e = h.aplicar(e, 'documento', { texto: t, modelo: analisar(t).modelo }, { agora })
  }
  const entradas = h.tamanho()
  let desfazeres = 0
  while (h.podeDesfazer() && serializar(e.modelo) !== codigoAntes) {
    e = h.desfazer(e)
    desfazeres++
  }
  registrar(
    coalescer ? 'H5-rajada-e-um-ato' : 'H5c-controle-sem-coalescer',
    'flowchart',
    `${PALAVRA.length} teclas`,
    coalescer ? entradas === 1 && desfazeres === 1 : true,
    `${entradas} entrada(s) · ${desfazeres} desfazer(es) para voltar ao início da palavra`,
  )
}

// A guarda da coalescência: a rajada não pode engolir o ato **anterior**.
{
  const partida = 'flowchart TD\n  n1["Passo"]'
  const base = estadoInicial(partida)
  const h = criarHistorico({ modo: 'inverso', coalescer: true })
  let e = h.aplicar(base, 'rotular', { ids: ['n1'], valor: 'Antes' }, { agora: 1000 })
  for (let i = 1; i <= 5; i++) {
    const t = `flowchart TD\n  n1["Antes${'x'.repeat(i)}"]`
    e = h.aplicar(e, 'documento', { texto: t, modelo: analisar(t).modelo }, { agora: 1100 + i * 60 })
  }
  const entradas = h.tamanho()
  e = h.desfazer(e)
  const rotulo = nosDe(e.modelo).find((n) => n.id === 'n1').rotulo
  registrar(
    'H5b-coalescer-nao-engole',
    'flowchart',
    'ato + rajada de 5 teclas',
    entradas === 2 && rotulo === 'Antes',
    `${entradas} entradas · 1 desfazer volta ao fim do ato anterior ("${rotulo}")`,
  )
}

// ─── H6 · o ato que toca dois agregados ──────────────────────────────────────
console.log('')
for (const familia of ['flowchart', 'classe']) {
  const texto = corpus.find((c) => c.familia === familia && c.nome.startsWith('10')).texto
  const base = estadoInicial(texto)
  const campoLig = familia === 'flowchart' ? 'conexoes' : 'relacoes'
  const alvo = idsDosNos(base.modelo).find((id) => base.modelo[campoLig].some((l) => l.de === id || l.para === id))
  const antesNos = nosDe(base.modelo).length
  const antesLig = base.modelo[campoLig].length
  const codigoAntes = serializar(base.modelo)

  const h = criarHistorico({ modo: 'inverso' })
  const depois = h.aplicar(base, 'remover', { ids: [alvo] })
  const caiuNo = nosDe(depois.modelo).length === antesNos - 1
  const caiuLig = depois.modelo[campoLig].length < antesLig
  const voltou = h.desfazer(depois)
  const inteiro = serializar(voltou.modelo) === codigoAntes && nosDe(voltou.modelo).length === antesNos

  registrar(
    'H6-dois-agregados-um-ato',
    familia,
    `remover ${alvo}`,
    caiuNo && caiuLig && inteiro,
    `nó + ${antesLig - depois.modelo[campoLig].length} ligação(ões) num ato · 1 desfazer devolveu os dois na ordem`,
  )
}

// ─── H7 · a posição entra no mesmo histórico? ────────────────────────────────
// A pergunta que o ADR-007 deixou por escrito ("dá para desfazer?"), agora com
// os dois desfechos medidos em vez de discutidos.
console.log('')
// O gesto sob teste é o mais banal que existe: **arrastar um nó e apertar
// Ctrl+Z em seguida**. A ordem dos atos é rotular A, rotular B, arrastar A.
for (const posicaoNoHistorico of [true, false]) {
  const base = estadoInicial(DENSO)
  const h = criarHistorico({ modo: 'inverso', posicaoNoHistorico })
  const ids = idsDosNos(base.modelo)
  const rotuloOriginalB = nosDe(base.modelo).find((n) => n.id === ids[1]).rotulo

  let e = h.aplicar(base, 'rotular', { ids: [ids[0]], valor: 'Primeiro' })
  e = h.aplicar(e, 'rotular', { ids: [ids[1]], valor: 'Segundo' })
  e = h.aplicar(e, 'mover', { id: ids[0], para: { x: 999, y: 999 } })

  const entradas = h.tamanho()
  e = h.desfazer(e) // o Ctrl+Z logo depois de arrastar
  const arrasto = e.posicoes[ids[0]] ? 'continua onde a pessoa soltou' : 'DESFEITO'
  const rotuloB = nosDe(e.modelo).find((n) => n.id === ids[1]).rotulo
  const perdeuRotulo = rotuloB === rotuloOriginalB

  registrar(
    'H7-posicao-no-historico',
    'flowchart',
    posicaoNoHistorico ? 'histórico único' : 'controle: só o modelo',
    true, // caracterização: existe para ser lida, não para aprovar
    `${entradas} entradas para 3 atos · Ctrl+Z depois de arrastar: arrasto ${arrasto} · rótulo de B ${perdeuRotulo ? 'VOLTOU (a pessoa perdeu uma alteração que não pediu para desfazer)' : 'intacto'}`,
  )
}

// ─── H8 · quanto custa guardar a sessão ──────────────────────────────────────
// Mil atos sobre o documento do envelope. É a conta que o ADR-004 não fez e que
// uma sessão de horas paga.
console.log('')
const ATOS = 1000
const custo = {}
for (const modo of ['inverso', 'clone']) {
  const base = estadoInicial(DENSO)
  const h = criarHistorico({ modo })
  let e = base
  const ids = idsDosNos(base.modelo)
  const t0 = performance.now()
  for (let i = 0; i < ATOS; i++) {
    e = h.aplicar(e, 'rotular', { ids: [ids[i % ids.length]], valor: `Ato ${i}` }, { agora: i * 1000 })
  }
  const ms = performance.now() - t0
  const bytes = h.bytesLogicos()
  custo[modo] = { atos: ATOS, bytesTotais: bytes, bytesPorAto: Math.round(bytes / ATOS), msTotais: Math.round(ms) }
  registrar(
    'H8-custo-do-historico',
    'flowchart',
    `${ATOS} atos · modo ${modo}`,
    true,
    `${(bytes / 1024).toFixed(1)} KiB lógicos · ${Math.round(bytes / ATOS)} bytes por ato · ${Math.round(ms)}ms para aplicar os ${ATOS}`,
  )
}
// O documento inteiro, para dar escala aos números acima.
custo.documentoBytes = JSON.stringify(estadoInicial(DENSO).modelo).length
custo.razao = Math.round(custo.clone.bytesPorAto / custo.inverso.bytesPorAto)
registrar(
  'H8-razao-entre-modos',
  'flowchart',
  'clone / inverso',
  true,
  `documento: ${(custo.documentoBytes / 1024).toFixed(1)} KiB · clone custa ${custo.razao}× o inverso por ato`,
)
relatorio.custo = custo

// ─── H10 · histórico com teto ────────────────────────────────────────────────
console.log('')
{
  const base = estadoInicial(DENSO)
  const h = criarHistorico({ modo: 'inverso', limite: 100 })
  let e = base
  const ids = idsDosNos(base.modelo)
  for (let i = 0; i < 200; i++) e = h.aplicar(e, 'rotular', { ids: [ids[i % ids.length]], valor: `Ato ${i}` }, { agora: i * 1000 })
  const cheio = h.tamanho() === 100
  let n = 0
  while (h.podeDesfazer()) {
    e = h.desfazer(e)
    n++
  }
  const codigoValido = serializar(e.modelo).startsWith('flowchart')
  registrar(
    'H10-teto-do-historico',
    'flowchart',
    'limite 100 · 200 atos',
    cheio && n === 100 && codigoValido,
    `pilha parou em ${100} · ${n} desfazeres até o fim · os 100 atos mais antigos ficaram **fora do alcance** do desfazer`,
  )
}

const passaram = checagens.filter((c) => c.passou).length
console.log(`\n${passaram}/${checagens.length} verificações em Node passaram`)

relatorio.placar = { passaram, total: checagens.length }
relatorio.checagens = checagens
writeFileSync(join(RESULTADOS, 'historico.json'), JSON.stringify(relatorio, null, 2))
console.log('-> resultados/historico.json')
process.exit(passaram === checagens.length ? 0 : 1)
