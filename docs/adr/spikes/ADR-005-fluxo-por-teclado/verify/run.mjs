// Verificador headless do spike ADR-005.
//
// Dirige o ciclo principal do discovery — criar caixa -> rotular -> conectar ->
// rotular a conexão — **só com eventos de teclado**, e lê o veredito no modelo
// interno, não na tela. Um contador de eventos de ponteiro instalado em
// `main.jsx` invalida qualquer afirmação em que o mouse tenha encostado.
//
// Saída: resultados/veredito.json + capturas.

import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import os from 'node:os'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const saida = resolve(raiz, 'resultados')
const PORTA = 5301
const BASE = `http://localhost:${PORTA}/`

mkdirSync(saida, { recursive: true })

// A barra da tecla vem do ADR-004, que já a fixou em 50ms na mediana (RAIL).
// É premissa herdada, não achado deste spike.
const LIMIAR_TECLA_MS = 50

const espera = (ms) => new Promise((r) => setTimeout(r, ms))

const est = (amostras) => {
  if (!amostras.length) return null
  const s = amostras.slice().sort((a, b) => a - b)
  const q = (p) => s[Math.min(s.length - 1, Math.floor(p * s.length))]
  return {
    n: s.length,
    mediana: +q(0.5).toFixed(1),
    p95: +q(0.95).toFixed(1),
    pior: +s[s.length - 1].toFixed(1),
  }
}

async function subirServidor() {
  // `detached` para poder derrubar o grupo inteiro: matar o `npx` sozinho deixa
  // o vite vivo segurando a porta e o próximo `npm run verify` não sobe.
  const p = spawn('npx', ['vite', 'preview', '--port', String(PORTA), '--strictPort'], {
    cwd: raiz,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  })
  await new Promise((ok, falha) => {
    const t = setTimeout(() => falha(new Error('servidor não subiu em 30s')), 30000)
    p.stdout.on('data', (d) => {
      if (String(d).includes(String(PORTA))) {
        clearTimeout(t)
        ok()
      }
    })
    p.stderr.on('data', (d) => process.stderr.write(d))
  })
  await espera(600)
  return p
}

async function abrir(navegador, query = '') {
  const page = await navegador.newPage({ viewport: { width: 1440, height: 900 } })
  page.on('pageerror', (e) => console.error('  [erro na página]', e.message))
  await page.goto(BASE + (query ? `?${query}` : ''), { waitUntil: 'load' })
  await page.waitForFunction(() => window.__spike?.pronto === true)
  // O foco inicial vai para o palco por API, não por clique: o spike não pode
  // gastar um evento de ponteiro nem para começar.
  await page.evaluate(() => document.querySelector('[data-foco="palco"]').focus())
  return page
}

const modo = (page) => page.evaluate(() => window.__spike.estado().modo)
const modelo = (page) => page.evaluate(() => window.__spike.modelo())
const foco = (page) => page.evaluate(() => window.__spike.foco())
const codigo = (page) => page.evaluate(() => window.__spike.codigo())
const ponteiro = (page) => page.evaluate(() => window.__ponteiro)

/** Uma tecla de controle, esperando a máquina de estados chegar onde deveria. */
async function tecla(page, k, modoEsperado) {
  await page.keyboard.press(k)
  if (modoEsperado) {
    await page.waitForFunction(
      (m) => window.__spike.estado().modo === m,
      modoEsperado,
      { timeout: 4000 },
    )
  } else {
    await espera(40)
  }
}

/**
 * Texto num rótulo em edição.
 *
 * O `waitForFunction` do foco não é conveniência de teste: a engine monta o nó
 * num commit posterior ao da mudança do modelo, então existe uma janela em que
 * a máquina de estados já diz "editando" e o input ainda não tem o foco. Tecla
 * digitada nessa janela cai no vazio. O verificador espera de propósito para
 * medir o resto do ciclo; a janela em si é medida em `framesDeEsperaDoFoco`.
 */
async function digitar(page, texto) {
  await page.waitForFunction(() => (window.__spike.foco() ?? '').startsWith('input-'), null, {
    timeout: 4000,
  })
  await page.keyboard.type(texto, { delay: 12 })
  await page.waitForFunction(
    (t) => {
      const e = window.__spike.estado()
      const m = window.__spike.modelo()
      if (e.noEditando) return m.nos.find((n) => n.id === e.noEditando)?.rotulo === t
      if (e.conexaoEditando) return m.conexoes.find((c) => c.id === e.conexaoEditando)?.rotulo === t
      return false
    },
    texto,
    { timeout: 4000 },
  )
}

/**
 * O ciclo da Marina, inteiro, em 4 teclas de controle + o texto.
 * `registro` colhe, no instante da criação, se o elemento novo nasceu visível.
 */
async function ciclo(page, rotuloNo, rotuloConexao, registro) {
  await tecla(page, 'c', 'conectando')
  await tecla(page, 'n', 'editando-no')
  if (registro) {
    registro.push(
      await page.evaluate(() => {
        const id = window.__spike.estado().noEditando
        return { id, visivel: window.__spike.dentroDaViewport(id) }
      }),
    )
  }
  await digitar(page, rotuloNo)
  await tecla(page, 'Enter', 'editando-conexao')
  await digitar(page, rotuloConexao)
  await tecla(page, 'Enter', 'navegando')
}

const checagens = []
function checar(nome, passou, detalhe) {
  checagens.push({ nome, passou, detalhe })
  console.log(`  ${passou ? 'ok  ' : 'FALHA'} ${nome}${detalhe ? ` — ${detalhe}` : ''}`)
}

async function main() {
  const servidor = await subirServidor()
  const navegador = await chromium.launch()
  const resultados = {}

  try {
    // ---------------------------------------------------------------------
    // 1-4. Os quatro passos do ciclo, um a um, do zero.
    // ---------------------------------------------------------------------
    console.log('\n[1-4] os quatro passos do ciclo, isolados')
    let page = await abrir(navegador)

    await tecla(page, 'n', 'editando-no')
    await digitar(page, 'Início')
    await tecla(page, 'Enter', 'navegando')
    let m = await modelo(page)
    checar(
      'criar-no-por-teclado',
      m.nos.length === 1 && m.nos[0].rotulo === 'Início',
      `nós=${m.nos.length} rótulo=${JSON.stringify(m.nos[0]?.rotulo)}`,
    )

    // Tecla perigosa dentro do rótulo: Backspace e Delete têm que editar o
    // texto, não destruir o elemento.
    await tecla(page, 'Enter', 'editando-no')
    await page.waitForFunction(() => (window.__spike.foco() ?? '').startsWith('input-'))
    await page.keyboard.type('abc', { delay: 12 })
    await page.keyboard.press('Backspace')
    await page.keyboard.press('Delete')
    await espera(120)
    m = await modelo(page)
    const rotuloDepois = m.nos[0]?.rotulo
    checar(
      'tecla-perigosa-nao-destroi-elemento',
      m.nos.length === 1 && rotuloDepois === 'Inícioab',
      `nós=${m.nos.length} rótulo=${JSON.stringify(rotuloDepois)}`,
    )
    await tecla(page, 'Enter', 'navegando')

    // Segundo nó, para haver o que conectar.
    await tecla(page, 'n', 'editando-no')
    await digitar(page, 'Fim')
    await tecla(page, 'Enter', 'navegando')

    await page.evaluate(() => window.__spike.limparDiario())
    await page.keyboard.press('ArrowLeft')
    await espera(60)
    await tecla(page, 'c', 'conectando')
    await tecla(page, 'Enter', 'editando-conexao')
    m = await modelo(page)
    const diarioConexao = await page.evaluate(() => window.__spike.diario())
    checar(
      'conectar-por-teclado',
      m.conexoes.length === 1,
      `conexões=${m.conexoes.length} · callbacks da engine no gesto: ${
        diarioConexao.length ? [...new Set(diarioConexao)].join(', ') : 'nenhum'
      }`,
    )
    resultados.callbacksNoConectar = [...new Set(diarioConexao)]

    const focoNaConexao = await foco(page)
    await digitar(page, 'sim')
    await tecla(page, 'Enter', 'navegando')
    m = await modelo(page)
    const cod = await codigo(page)
    checar(
      'rotular-conexao-por-teclado',
      m.conexoes[0]?.rotulo === 'sim' && cod.includes('-->|sim|'),
      `foco no passo = ${focoNaConexao} · código: ${JSON.stringify(
        cod.split('\n').at(-1),
      )}`,
    )
    await page.screenshot({ path: resolve(saida, '01-ciclo-passo-a-passo.png') })
    await page.close()

    // ---------------------------------------------------------------------
    // 5. O ciclo completo, repetido, sem nenhum evento de ponteiro.
    // ---------------------------------------------------------------------
    console.log('\n[5] o ciclo completo, 8 elementos, sem mouse')
    page = await abrir(navegador)
    await tecla(page, 'n', 'editando-no')
    await digitar(page, 'Início')
    await tecla(page, 'Enter', 'navegando')

    const ELEMENTOS = 8
    const nascimentos = []
    for (let i = 1; i <= ELEMENTOS; i++) await ciclo(page, `Passo ${i}`, `via ${i}`, nascimentos)

    m = await modelo(page)
    const pt = await ponteiro(page)
    const rotulosOk = m.nos.every((n) => n.rotulo) && m.conexoes.every((c) => c.rotulo)
    checar(
      'ciclo-completo-sem-mouse',
      m.nos.length === ELEMENTOS + 1 &&
        m.conexoes.length === ELEMENTOS &&
        rotulosOk &&
        pt.total === 0,
      `nós=${m.nos.length} conexões=${m.conexoes.length} rótulos preenchidos=${rotulosOk} · eventos de ponteiro=${pt.total}`,
    )
    resultados.teclasDeControlePorElemento = 4
    resultados.encadeamento = await page.evaluate(() => window.__spike.estado())

    // O foco terminou no elemento novo? É o que permite repetir sem reposicionar.
    checar(
      'foco-encadeia-para-o-proximo-ciclo',
      resultados.encadeamento.noFocado === m.nos.at(-1).id,
      `foco=${resultados.encadeamento.noFocado} último nó=${m.nos.at(-1).id}`,
    )

    // A câmera não é do teclado: o elemento nasceu onde a pessoa consegue ver?
    // Medido no instante da criação, não no fim.
    const nasceramVisiveis = nascimentos.filter((v) => v.visivel).length
    resultados.nascimentos = nascimentos
    checar(
      'no-novo-nasce-dentro-da-viewport',
      nasceramVisiveis === nascimentos.length,
      `${nasceramVisiveis}/${nascimentos.length} nasceram visíveis · primeiro cego: ${
        nascimentos.find((v) => !v.visivel)?.id ?? '—'
      }`,
    )

    checar(
      'modelo-segue-sem-coordenada',
      (await page.evaluate(() => window.__spike.coordenadaVazou())) === false,
      'a verdade não ganhou x/y depois de 9 elementos criados por teclado',
    )

    resultados.framesDeEsperaDoFoco = await page.evaluate(() =>
      window.__spike.framesDeEsperaDoFoco(),
    )

    const lat = await page.evaluate(() => window.__spike.latencias())
    resultados.latenciaVazio = {
      controle: est(lat.filter((l) => l.tipo === 'tecla').map((l) => l.ms)),
      texto: est(lat.filter((l) => l.tipo === 'texto').map((l) => l.ms)),
    }
    await page.screenshot({ path: resolve(saida, '02-ciclo-8-elementos.png') })
    await page.close()

    // ---------------------------------------------------------------------
    // 5b. O contorno da câmera: o produto centraliza no elemento em foco.
    // ---------------------------------------------------------------------
    console.log('\n[5b] o mesmo ciclo com a câmera acompanhando (cam=1)')
    page = await abrir(navegador, 'cam=1')
    await tecla(page, 'n', 'editando-no')
    await digitar(page, 'Início')
    await tecla(page, 'Enter', 'navegando')
    const nascimentosCam = []
    for (let i = 1; i <= ELEMENTOS; i++)
      await ciclo(page, `Passo ${i}`, `via ${i}`, nascimentosCam)
    const visiveisCam = nascimentosCam.filter((v) => v.visivel).length
    resultados.nascimentosComCamera = nascimentosCam
    checar(
      'camera-acompanhando-resolve-o-nascimento-cego',
      visiveisCam === nascimentosCam.length,
      `${visiveisCam}/${nascimentosCam.length} nasceram visíveis com setCenter a cada troca de foco`,
    )
    await page.screenshot({ path: resolve(saida, '02b-camera-acompanhando.png') })
    await page.close()

    // ---------------------------------------------------------------------
    // 6. O mesmo ciclo sem o reuso do objeto de nó (invariante do ADR-004).
    // ---------------------------------------------------------------------
    console.log('\n[6] o mesmo ciclo com memo=0 (projeção devolve objeto novo a cada tecla)')
    page = await abrir(navegador, 'memo=0')
    let erroMemo = null
    try {
      await tecla(page, 'n', 'editando-no')
      await digitar(page, 'Início')
      await tecla(page, 'Enter', 'navegando')
      for (let i = 1; i <= 3; i++) await ciclo(page, `Passo ${i}`, `via ${i}`)
    } catch (e) {
      erroMemo = e.message
    }
    m = await modelo(page)
    checar(
      'foco-sobrevive-a-projecao-sem-reuso',
      !erroMemo && m.nos.length === 4 && m.nos.every((n) => n.rotulo),
      erroMemo ? `quebrou: ${erroMemo}` : `nós=${m.nos.length}, todos rotulados`,
    )
    await page.close()

    // ---------------------------------------------------------------------
    // 7. O teclado nativo da engine ligado: ela disputa as mesmas teclas?
    // ---------------------------------------------------------------------
    console.log('\n[7] braço a11y=1 — teclado nativo da engine ligado')
    page = await abrir(navegador, 'a11y=1')
    await tecla(page, 'n', 'editando-no')
    await digitar(page, 'Alvo')

    const antes = await page.evaluate(() => window.__spike.posicaoDoNo('n1'))
    for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowRight')
    await espera(200)
    const depois = await page.evaluate(() => window.__spike.posicaoDoNo('n1'))
    const moveu = antes && depois && (antes.x !== depois.x || antes.y !== depois.y)
    checar(
      'seta-dentro-do-rotulo-nao-move-o-no',
      !moveu,
      moveu
        ? `a engine moveu o nó de (${antes.x},${antes.y}) para (${depois.x},${depois.y}) enquanto o cursor andava no texto`
        : `nó parado em (${depois?.x},${depois?.y})`,
    )

    await page.keyboard.press('Backspace')
    await espera(200)
    m = await modelo(page)
    checar(
      'backspace-no-rotulo-nao-apaga-o-no-com-a11y-ligado',
      m.nos.length === 1,
      `nós=${m.nos.length} rótulo=${JSON.stringify(m.nos[0]?.rotulo)}`,
    )
    resultados.focoComA11y = await foco(page)
    await page.screenshot({ path: resolve(saida, '03-a11y-ligado.png') })
    await page.close()

    // ---------------------------------------------------------------------
    // 8. O ciclo dentro do envelope do ADR-004 (400 nós / 500 conexões).
    // ---------------------------------------------------------------------
    console.log('\n[8] o ciclo dentro do envelope: 400 nós / 500 conexões')
    page = await abrir(navegador, 'n=400&arestas=500')
    await page.evaluate(() => window.__spike.limparLatencias())
    await ciclo(page, 'Elemento no envelope', 'aresta no envelope')
    const latDenso = await page.evaluate(() => window.__spike.latencias())
    const controle = est(latDenso.filter((l) => l.tipo === 'tecla').map((l) => l.ms))
    const texto = est(latDenso.filter((l) => l.tipo === 'texto').map((l) => l.ms))
    resultados.latenciaEnvelope = { controle, texto }
    checar(
      'latencia-de-tecla-dentro-do-envelope',
      texto && texto.mediana <= LIMIAR_TECLA_MS,
      `texto: mediana ${texto?.mediana}ms p95 ${texto?.p95}ms · controle: mediana ${controle?.mediana}ms p95 ${controle?.p95}ms · barra ${LIMIAR_TECLA_MS}ms`,
    )
    m = await modelo(page)
    checar(
      'ciclo-funciona-em-diagrama-denso',
      m.nos.length === 401 && m.nos.at(-1).rotulo === 'Elemento no envelope',
      `nós=${m.nos.length} último rótulo=${JSON.stringify(m.nos.at(-1)?.rotulo)}`,
    )
    await page.screenshot({ path: resolve(saida, '04-envelope-400.png') })
    await page.close()

    // ---------------------------------------------------------------------
    // 9. Braço de controle: de quem é o custo da tecla no envelope?
    //    Mesma ação (digitar 12 letras no rótulo de um nó novo), mesma
    //    densidade, mudando só se a conexão carrega rótulo editável próprio.
    // ---------------------------------------------------------------------
    console.log('\n[9] de quem é o custo: o teclado ou o rótulo editável por conexão?')
    for (const [rotulo, q] of [
      ['aresta própria em todas (o desenho ingênuo)', 'n=400&arestas=500&rot=1'],
      ['aresta embutida em todas (controle, rótulo não editável)', 'n=400&arestas=500&rot=0'],
      ['híbrida: própria só na conexão em edição', 'n=400&arestas=500&rot=2'],
    ]) {
      const p9 = await abrir(navegador, q)
      await tecla(p9, 'n', 'editando-no')
      await p9.waitForFunction(() => (window.__spike.foco() ?? '').startsWith('input-'))
      await p9.evaluate(() => window.__spike.limparLatencias())
      await p9.keyboard.type('abcdefghijkl', { delay: 12 })
      await espera(300)
      const l = await p9.evaluate(() => window.__spike.latencias())
      const e9 = est(l.filter((x) => x.tipo === 'texto').map((x) => x.ms))
      resultados[q] = e9
      console.log(`  ${rotulo}: mediana ${e9?.mediana}ms · p95 ${e9?.p95}ms · n=${e9?.n}`)
      await p9.close()
    }
    const propria = resultados['n=400&arestas=500&rot=1']
    const embutida = resultados['n=400&arestas=500&rot=0']
    const hibrida = resultados['n=400&arestas=500&rot=2']
    checar(
      'aresta-hibrida-devolve-a-tecla-para-dentro-da-barra',
      hibrida && hibrida.mediana <= LIMIAR_TECLA_MS,
      `própria em todas ${propria?.mediana}ms · embutida ${embutida?.mediana}ms · híbrida ${hibrida?.mediana}ms · barra ${LIMIAR_TECLA_MS}ms`,
    )

    // O contorno só vale se o rótulo continuar editável por teclado: a conexão
    // em edição troca de tipo de aresta, e trocar de tipo remonta o componente.
    console.log('\n[10] o contorno híbrido preserva a edição do rótulo por teclado?')
    const p10 = await abrir(navegador, 'rot=2')
    let erroHibrido = null
    try {
      await tecla(p10, 'n', 'editando-no')
      await digitar(p10, 'Um')
      await tecla(p10, 'Enter', 'navegando')
      await ciclo(p10, 'Dois', 'via híbrida')
    } catch (e) {
      erroHibrido = e.message
    }
    const mH = await modelo(p10)
    checar(
      'hibrida-preserva-edicao-do-rotulo-por-teclado',
      !erroHibrido && mH.conexoes[0]?.rotulo === 'via híbrida',
      erroHibrido
        ? `quebrou: ${erroHibrido}`
        : `rótulo da conexão = ${JSON.stringify(mH.conexoes[0]?.rotulo)}`,
    )
    await p10.screenshot({ path: resolve(saida, '05-aresta-hibrida.png') })
    await p10.close()
  } finally {
    await navegador.close()
    try {
      process.kill(-servidor.pid, 'SIGTERM')
    } catch {
      servidor.kill('SIGTERM')
    }
  }

  const veredito = {
    data: new Date().toISOString(),
    maquina: `${os.type()} ${os.release()} · ${os.cpus()[0]?.model} · ${os.cpus().length} vCPU`,
    limiarTeclaMs: LIMIAR_TECLA_MS,
    checagens,
    passaram: checagens.filter((c) => c.passou).length,
    total: checagens.length,
    resultados,
  }
  writeFileSync(resolve(saida, 'veredito.json'), JSON.stringify(veredito, null, 2))
  console.log(`\n=> ${veredito.passaram}/${veredito.total} · resultados/veredito.json`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
