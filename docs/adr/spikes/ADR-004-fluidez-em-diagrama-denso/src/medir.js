// Instrumentação do spike. Nenhuma afirmação sai daqui por inspeção visual:
// tudo é relógio do próprio navegador.

/**
 * Resolve DEPOIS do paint do próximo frame.
 * rAF roda antes do paint; a macrotask agendada de dentro dele roda depois.
 * MessageChannel em vez de setTimeout porque não sofre o clamp de 4ms.
 */
export function aposPaint() {
  return new Promise((res) => {
    requestAnimationFrame(() => {
      const ch = new MessageChannel()
      ch.port1.onmessage = () => res()
      ch.port2.postMessage(0)
    })
  })
}

/** Latência de uma ação: do disparo até estar pintado na tela. */
export async function medirAcao(fn) {
  const t0 = performance.now()
  fn()
  await aposPaint()
  return performance.now() - t0
}

export function estatisticas(amostras) {
  const s = amostras.slice().sort((a, b) => a - b)
  const q = (p) => s[Math.min(s.length - 1, Math.floor(p * s.length))]
  return {
    n: s.length,
    mediana: +q(0.5).toFixed(1),
    p95: +q(0.95).toFixed(1),
    pior: +s[s.length - 1].toFixed(1),
  }
}

/** Tarefas longas (>50ms) que bloquearam a main thread. */
export const tarefasLongas = []
try {
  new PerformanceObserver((lista) => {
    for (const e of lista.getEntries()) tarefasLongas.push(Math.round(e.duration))
  }).observe({ type: 'longtask', buffered: true })
} catch {
  /* navegador sem longtask: o veredito registra a ausência */
}

let gravacao = null

export function iniciarFps() {
  gravacao = []
  const loop = (ts) => {
    if (!gravacao) return
    gravacao.push(ts)
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)
}

export function pararFps() {
  const ts = gravacao ?? []
  gravacao = null
  if (ts.length < 3) return { fps: 0, frames: ts.length, piorFrame: 0 }
  const deltas = []
  for (let i = 1; i < ts.length; i++) deltas.push(ts[i] - ts[i - 1])
  const duracao = ts[ts.length - 1] - ts[0]
  deltas.sort((a, b) => a - b)
  return {
    frames: ts.length,
    fps: +((deltas.length / duracao) * 1000).toFixed(1),
    frameMediano: +deltas[Math.floor(deltas.length / 2)].toFixed(1),
    piorFrame: +deltas[deltas.length - 1].toFixed(1),
  }
}
