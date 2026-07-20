// A metade da verificação que precisa de DOM — e de um relógio que inclua o
// paint. As barras são as do ADR-004, declaradas **antes** de medir:
//
//   edição pontual ≤ 100ms na mediana · tecla ≤ 50ms · colar (gesto raro) ≤ 1s
//
// Perguntas, em ordem de importância para a decisão do ADR-009:
//   B1  o ato sobre uma seleção inteira cabe na barra, no envelope 400/500?
//   B1c e pela via ingênua — N transações em vez de uma — quanto custa? (controle)
//   B2  desfazer e refazer o mesmo ato cabem na barra?
//   B3  colar um diagrama grande de uma vez — o gesto que o ADR-004 e o ADR-006
//       deixaram de fora — cabe em 1s?
//   B4  depois de desfazer, as duas vistas ainda concordam, e o mermaid **de
//       verdade** ainda aceita e desenha o mesmo diagrama?
//   B5  o reuso de objeto do ADR-004 continua sendo o que decide? (controle memo=0)
//   B6  quanto o histórico retém no heap, em cada modo? (controle clone)
//   B7  o ato em bloco vale nas três famílias?

import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const AQUI = dirname(fileURLToPath(import.meta.url))
const RAIZ = join(AQUI, '..')
const RESULTADOS = join(RAIZ, 'resultados')
const PORTA = 5701
const BASE = `http://127.0.0.1:${PORTA}`

const BARRA_EDICAO = 100 // ms — edição pontual (ADR-004 / Nielsen)
const BARRA_COLAR = 1000 // ms — gesto raro, "fluxo de pensamento" (Nielsen)
const FAMILIAS = ['flowchart', 'classe', 'sequencia']

const checagens = []
const registrar = (id, familia, alvo, passou, detalhe) => {
  checagens.push({ id, familia, alvo, passou, detalhe })
  console.log(
    `${passou ? 'ok  ' : 'FALHA'} ${id.padEnd(24)} ${String(familia).padEnd(10)} ${String(alvo).padEnd(28)} ${detalhe ?? ''}`,
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

mkdirSync(RESULTADOS, { recursive: true })

const servidor = spawn('npx', ['vite', 'preview', '--port', String(PORTA), '--strictPort'], { cwd: RAIZ, stdio: 'ignore' })
process.on('exit', () => servidor.kill())

async function esperarServidor() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(BASE)
      if (r.ok) return
    } catch {}
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error('vite preview não subiu')
}

const relatorio = {
  maquina: 'Linux WSL2 · AMD Ryzen 7 5800H · 8 vCPU · sem GPU',
  barras: { edicaoMs: BARRA_EDICAO, colarMs: BARRA_COLAR },
  latencia: {},
}

await esperarServidor()
// `--expose-gc` e `--enable-precise-memory-info`: sem os dois, o braço de
// memória mediria ruído de coletor em vez do que o histórico retém.
const navegador = await chromium.launch({ args: ['--js-flags=--expose-gc', '--enable-precise-memory-info'] })
const contexto = await navegador.newContext({ viewport: { width: 1440, height: 900 } })
const pagina = await contexto.newPage()
pagina.on('pageerror', (e) => console.log('  [erro de página]', e.message))

const versaoMermaid = JSON.parse(readFileSync(join(RAIZ, 'node_modules/mermaid/package.json'), 'utf8')).version
relatorio.mermaid = versaoMermaid
console.log(`oráculo: mermaid ${versaoMermaid}\n`)

const abrir = async (q) => {
  await pagina.goto(`${BASE}/?${q}`, { waitUntil: 'load' })
  await pagina.waitForFunction(() => window.__spike && window.__spike.pronto && window.__oraculo && window.__oraculo.pronto)
  await pagina.waitForTimeout(500)
  await pagina.evaluate(() => window.__spike.zerar())
}

/** Um ato, medido do gesto até depois do paint das duas vistas. */
async function medirAto(acao, repeticoes = 5) {
  const amostras = []
  for (let i = 0; i < repeticoes; i++) {
    const espera = pagina.evaluate(() => window.__spike.proximaAmostra())
    await pagina.evaluate(acao.corpo, { ...acao.arg, i })
    amostras.push(await espera)
    await pagina.waitForTimeout(40)
  }
  return amostras
}

// ─── B1 · o ato em bloco no envelope · B1c · o controle sem lote ─────────────
const SELECOES = [1, 10, 50, 100, 400]
for (const lote of [1, 0]) {
  for (const quantos of SELECOES) {
    await abrir(`tipo=flowchart&n=400&ligacoes=500&lote=${lote}`)
    const amostras = await medirAto({
      corpo: ({ quantos, i }) => window.__spike.atoEmBloco(quantos, `Em bloco ${i}`),
      arg: { quantos },
    })
    const depois = await pagina.evaluate(({ quantos }) => {
      const alvos = window.__spike.ids().slice(0, quantos)
      return {
        aplicados: alvos.filter((id) => String(window.__spike.rotuloDe(id)).startsWith('Em bloco')).length,
        historico: window.__spike.historico(),
        nos: window.__spike.contarNos(),
        noCanvas: window.__spike.contarNoCanvas(),
      }
    }, { quantos })

    const totais = amostras.map((a) => a.total)
    const linha = {
      cenario: `ato em bloco · ${quantos} alvos · lote=${lote}`,
      alvos: quantos,
      lote: !!lote,
      chegou: depois.aplicados === quantos,
      entradasNoHistorico: depois.historico.tamanho,
      total: { mediana: arred(mediana(totais)), p95: arred(p95(totais)) },
      comando: arred(mediana(amostras.map((a) => a.comando))),
      projecao: arred(mediana(amostras.map((a) => a.projecao))),
      serializacao: arred(mediana(amostras.map((a) => a.serializacao))),
    }
    relatorio.latencia[linha.cenario] = linha

    // Guarda do ADR-004: cada cenário valida que mediu alguma coisa.
    registrar(
      'B0-ato-chegou',
      'flowchart',
      `${quantos} alvos · lote=${lote}`,
      linha.chegou,
      `${depois.aplicados}/${quantos} nós com o rótulo novo · ${depois.noCanvas} nós no canvas`,
    )
    const dentro = linha.total.mediana <= BARRA_EDICAO
    const detalhe = `total ${linha.total.mediana}ms (p95 ${linha.total.p95}) · comando ${linha.comando}ms · projeção ${linha.projecao}ms · serializar ${linha.serializacao}ms · ${depois.historico.tamanho} entradas no histórico depois de ${amostras.length} atos`
    registrar(
      lote ? 'B1-ato-na-barra-100ms' : 'B1c-controle-sem-lote',
      'flowchart',
      `${quantos} alvos`,
      lote ? dentro : true,
      lote ? detalhe : `${dentro ? 'dentro' : 'FORA'} da barra · ${detalhe}`,
    )
  }
}

// ─── B2 · desfazer e refazer no envelope ─────────────────────────────────────
console.log('')
for (const quantos of [10, 100, 400]) {
  await abrir(`tipo=flowchart&n=400&ligacoes=500`)
  // Uma pilha de atos para desfazer: cada um sobre uma seleção do tamanho alvo.
  // Nove repetições e não cinco: o desfazer da seleção inteira cai **em cima**
  // da barra de 100ms, e ali cinco amostras não separam 98 de 103.
  await pagina.evaluate(({ quantos }) => {
    for (let i = 0; i < 10; i++) window.__spike.atoEmBloco(quantos, `Ato ${i}`)
  }, { quantos })
  await pagina.waitForTimeout(300)
  await pagina.evaluate(() => window.__spike.zerar())

  const desfazeres = await medirAto({ corpo: () => window.__spike.desfazer(), arg: {} }, 9)
  const refazeres = await medirAto({ corpo: () => window.__spike.refazer(), arg: {} }, 9)

  for (const [nome, amostras] of [
    ['desfazer', desfazeres],
    ['refazer', refazeres],
  ]) {
    const totais = amostras.map((a) => a.total)
    const linha = {
      cenario: `${nome} · seleção de ${quantos}`,
      total: { mediana: arred(mediana(totais)), p95: arred(p95(totais)) },
      comando: arred(mediana(amostras.map((a) => a.comando))),
      projecao: arred(mediana(amostras.map((a) => a.projecao))),
    }
    relatorio.latencia[linha.cenario] = linha
    registrar(
      'B2-desfazer-refazer',
      'flowchart',
      `${nome} de ${quantos} alvos`,
      linha.total.mediana <= BARRA_EDICAO,
      `total ${linha.total.mediana}ms (p95 ${linha.total.p95}) · comando ${linha.comando}ms · projeção ${linha.projecao}ms`,
    )
  }
}

// ─── B3 · colar um diagrama grande de uma vez ────────────────────────────────
// O gesto que o ADR-004 deixou de fora ("colar um diagrama grande") e o ADR-006
// reconfirmou fora. Barra de 1s: é raro e a pessoa sabe que pediu algo grande.
console.log('')
for (const tamanho of [100, 400]) {
  await abrir(`tipo=flowchart`)
  const amostras = await medirAto(
    {
      corpo: ({ tamanho, i }) => {
        const texto = window.__oraculo.TIPOS.flowchart.gerarDensoTexto(tamanho, Math.round(tamanho * 1.25))
        window.__spike.colar(texto + `\n  extra${i}["Colado ${i}"]`)
      },
      arg: { tamanho },
    },
    3,
  )
  const depois = await pagina.evaluate(() => ({ nos: window.__spike.contarNos(), historico: window.__spike.historico() }))
  const totais = amostras.map((a) => a.total)
  const linha = {
    cenario: `colar ${tamanho} nós`,
    total: { mediana: arred(mediana(totais)), p95: arred(p95(totais)) },
    parse: arred(mediana(amostras.map((a) => a.parse))),
    projecao: arred(mediana(amostras.map((a) => a.projecao))),
  }
  relatorio.latencia[linha.cenario] = linha
  registrar(
    'B3-colar-diagrama-grande',
    'flowchart',
    `${tamanho} nós de uma vez`,
    linha.total.mediana <= BARRA_COLAR && depois.nos >= tamanho,
    `total ${linha.total.mediana}ms (p95 ${linha.total.p95}) · parse ${linha.parse}ms · projeção ${linha.projecao}ms · ${depois.nos} nós · ${depois.historico.tamanho} entrada(s)`,
  )
}

// ─── B4 · depois de desfazer, o mermaid de verdade ainda concorda ────────────
// A checagem que impede o desfazer de ser "quase certo": o juiz é o renderer.
console.log('')
for (const familia of FAMILIAS) {
  await abrir(`tipo=${familia}`)
  const nomes = await pagina.evaluate((f) => window.__oraculo.corpus.filter((c) => c.familia === f).map((c) => c.nome), familia)

  for (const nome of nomes) {
    const r = await pagina.evaluate(
      async ({ f, alvo }) => {
        const doc = window.__oraculo.corpus.find((c) => c.familia === f && c.nome === alvo)
        // Entra pelo editor de código, como a Marina entraria com um colar.
        window.__spike.colar(doc.texto)
        await new Promise((res) => setTimeout(res, 300))

        const antes = {
          codigo: window.__spike.codigo(),
          desenho: await window.__oraculo.desenha(window.__spike.codigo(), f),
        }
        const alvos = window.__spike.ids().slice(0, 3)
        window.__spike.atoEmBloco(alvos.length, 'Depois do ato')
        await new Promise((res) => setTimeout(res, 200))
        const mudou = window.__spike.codigo() !== antes.codigo

        window.__spike.desfazer()
        await new Promise((res) => setTimeout(res, 200))
        const codigoDepois = window.__spike.codigo()
        const desenhoDepois = await window.__oraculo.desenha(codigoDepois, f)
        const valida = await window.__oraculo.valida(codigoDepois)

        return {
          mudou,
          mesmoCodigo: codigoDepois === antes.codigo,
          mesmoDesenho: antes.desenho.ok && desenhoDepois.ok && antes.desenho.assinatura === desenhoDepois.assinatura,
          valida: valida.ok,
          erro: valida.erro || desenhoDepois.erro,
          noCanvas: window.__spike.contarNoCanvas(),
          noModelo: window.__spike.contarNos(),
          noCodigo: desenhoDepois.ok ? desenhoDepois.rotulosNo.length : -1,
        }
      },
      { f: familia, alvo: nome },
    )
    const duasVistas = r.noCanvas === r.noModelo && r.noModelo === r.noCodigo
    registrar(
      'B4-desfazer-pelo-oraculo',
      familia,
      nome,
      r.mudou && r.mesmoCodigo && r.mesmoDesenho && r.valida && duasVistas,
      r.mudou && r.mesmoCodigo && r.mesmoDesenho && r.valida
        ? `código idêntico · mermaid.parse aceita · mesmo desenho · ${r.noModelo} nós no modelo, canvas e código`
        : `mudou ${r.mudou} · código idêntico ${r.mesmoCodigo} · mesmo desenho ${r.mesmoDesenho} · válido ${r.valida} · canvas ${r.noCanvas} modelo ${r.noModelo} código ${r.noCodigo} ${r.erro || ''}`,
    )
  }
}

// ─── B5 · o controle do reuso de objeto ──────────────────────────────────────
console.log('')
for (const memo of [1, 0]) {
  await abrir(`tipo=flowchart&n=400&ligacoes=500&memo=${memo}`)
  const amostras = await medirAto({ corpo: ({ i }) => window.__spike.atoEmBloco(10, `Reuso ${i}`), arg: {} })
  const totais = amostras.map((a) => a.total)
  const linha = {
    cenario: `ato de 10 · memo=${memo}`,
    total: { mediana: arred(mediana(totais)), p95: arred(p95(totais)) },
    projecao: arred(mediana(amostras.map((a) => a.projecao))),
  }
  relatorio.latencia[linha.cenario] = linha
  const dentro = linha.total.mediana <= BARRA_EDICAO
  registrar(
    memo ? 'B5-com-reuso' : 'B5c-controle-sem-reuso',
    'flowchart',
    `ato de 10 · memo=${memo}`,
    memo ? dentro : true,
    `${dentro ? 'dentro' : 'FORA'} da barra de ${BARRA_EDICAO}ms · total ${linha.total.mediana}ms (p95 ${linha.total.p95}) · projeção ${linha.projecao}ms`,
  )
}

// ─── B6 · o que o histórico retém no heap ────────────────────────────────────
// Sem React no caminho: o que se quer medir é o que a **pilha** segura depois de
// mil atos, não o custo de renderizar mil vezes.
console.log('')
await abrir('tipo=flowchart')
const memoria = await pagina.evaluate(async () => {
  const { criarHistorico, estadoInicial, idsDosNos } = window.__oraculo.comandos
  const denso = window.__oraculo.TIPOS.flowchart.gerarDensoTexto(400, 500)
  const limpar = async () => {
    for (let i = 0; i < 3; i++) {
      window.gc()
      await new Promise((r) => setTimeout(r, 60))
    }
  }
  const saida = {}
  for (const modo of ['inverso', 'referencia', 'clone']) {
    await limpar()
    const antes = performance.memory.usedJSHeapSize
    const base = estadoInicial(denso)
    const h = criarHistorico({ modo })
    const ids = idsDosNos(base.modelo)
    let e = base
    const t0 = performance.now()
    for (let i = 0; i < 1000; i++) e = h.aplicar(e, 'rotular', { ids: [ids[i % ids.length]], valor: `Ato ${i}` }, { agora: i * 1000 })
    const ms = performance.now() - t0
    await limpar()
    const depois = performance.memory.usedJSHeapSize
    // `h` e `e` continuam vivos aqui — é justamente o que se quer pesar.
    saida[modo] = {
      retidoKiB: Math.round((depois - antes) / 1024),
      msMil: Math.round(ms),
      entradas: h.tamanho(),
      confere: h.tamanho() === 1000 && e.modelo.nos.length === 400,
    }
  }
  saida.documentoKiB = Math.round(JSON.stringify(estadoInicial(denso).modelo).length / 1024)
  return saida
})
relatorio.memoria = memoria
for (const modo of ['inverso', 'referencia', 'clone']) {
  const m = memoria[modo]
  registrar(
    modo === 'clone' ? 'B6c-controle-clone' : 'B6-heap-do-historico',
    'flowchart',
    `1.000 atos · ${modo}`,
    m.confere,
    `${m.retidoKiB} KiB retidos no heap · ${Math.round((m.retidoKiB * 1024) / 1000)} bytes por ato · ${m.msMil}ms para os 1.000 (documento: ${memoria.documentoKiB} KiB)`,
  )
}

// ─── B7 · o ato em bloco nas três famílias ───────────────────────────────────
console.log('')
for (const familia of FAMILIAS) {
  await abrir(`tipo=${familia}&n=400&ligacoes=500`)
  const amostras = await medirAto({ corpo: ({ i }) => window.__spike.atoEmBloco(50, `Familia ${i}`), arg: {} })
  const r = await pagina.evaluate(() => {
    const alvos = window.__spike.ids().slice(0, 50)
    return {
      aplicados: alvos.filter((id) => String(window.__spike.rotuloDe(id)).startsWith('Familia')).length,
      entradas: window.__spike.historico().tamanho,
      nos: window.__spike.contarNos(),
    }
  })
  const totais = amostras.map((a) => a.total)
  const linha = {
    cenario: `${familia} · ato de 50 no envelope`,
    total: { mediana: arred(mediana(totais)), p95: arred(p95(totais)) },
  }
  relatorio.latencia[linha.cenario] = linha
  registrar(
    'B7-tres-familias',
    familia,
    'ato de 50 no envelope',
    r.aplicados === 50 && r.entradas === amostras.length && linha.total.mediana <= BARRA_EDICAO,
    `${r.aplicados}/50 alvos · ${r.entradas} entradas para ${amostras.length} atos · total ${linha.total.mediana}ms (p95 ${linha.total.p95})`,
  )
  await pagina.screenshot({ path: join(RESULTADOS, `ato-em-bloco-${familia}.png`) })
}

// ─── Captura: o ato em bloco no envelope, antes e depois ─────────────────────
await abrir('tipo=flowchart&n=400&ligacoes=500')
await pagina.screenshot({ path: join(RESULTADOS, 'envelope-antes-do-ato.png') })
await pagina.evaluate(() => window.__spike.atoEmBloco(100, 'Seleção inteira'))
await pagina.waitForTimeout(400)
await pagina.screenshot({ path: join(RESULTADOS, 'envelope-depois-do-ato.png') })
await pagina.evaluate(() => window.__spike.desfazer())
await pagina.waitForTimeout(400)
await pagina.screenshot({ path: join(RESULTADOS, 'envelope-depois-do-desfazer.png') })

const passaram = checagens.filter((c) => c.passou).length
console.log(`\n${passaram}/${checagens.length} verificações de navegador passaram`)

relatorio.placar = { passaram, total: checagens.length }
relatorio.checagens = checagens
writeFileSync(join(RESULTADOS, 'veredito.json'), JSON.stringify(relatorio, null, 2))
console.log('-> resultados/veredito.json')

await navegador.close()
servidor.kill()
process.exit(passaram === checagens.length ? 0 : 1)
