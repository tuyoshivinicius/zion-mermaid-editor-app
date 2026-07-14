import { describe, expect, it } from 'vitest'
import { importFlowchart } from '@/core/mermaid-acl'
import { layout } from '@/core/layout'

const NODE_CEILING = 60
const EDGE_CEILING = 90
const WARMUP_RUNS = 5
const RUNS = 30
const P95_BUDGET_MS = 150

function buildFlowchartText(nodeCount: number, edgeCount: number): string {
  const lines = ['flowchart TD']
  for (let i = 0; i < nodeCount; i++) lines.push(`  n${i}[Node ${i}]`)
  for (let i = 0; i < edgeCount; i++) {
    lines.push(`  n${i % nodeCount} --> n${(i + 1) % nodeCount}`)
  }
  return lines.join('\n')
}

function percentile(sorted: number[], p: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))]
}

// Gate I (Principle I / Decisão C / SC-002): live preview p95 input->render
// <= 150ms at the declared 60-node/90-edge ceiling. This measures the
// controllable parse+layout sub-path (ACL + dagre); React Flow's own DOM
// render at this ceiling is estimated at ~10-30ms (Decisão C) and is
// exercised separately by the E2E suite, not re-timed here.
describe('Gate I: input to model+layout latency at the declared ceiling', () => {
  it(`p95 parse+layout time for ${NODE_CEILING} nodes / ${EDGE_CEILING} edges stays within the ${P95_BUDGET_MS}ms budget`, async () => {
    const text = buildFlowchartText(NODE_CEILING, EDGE_CEILING)

    // Mermaid lazy-loads its flowchart diagram module on first use (a
    // one-time cost paid once per session, not per keystroke); warm up
    // before measuring steady-state latency.
    for (let i = 0; i < WARMUP_RUNS; i++) {
      const result = await importFlowchart(text)
      if (result.ok) layout(result.model)
    }

    const durations: number[] = []
    for (let i = 0; i < RUNS; i++) {
      const start = performance.now()
      const result = await importFlowchart(text)
      if (result.ok) layout(result.model)
      durations.push(performance.now() - start)
    }

    durations.sort((a, b) => a - b)
    const p95 = percentile(durations, 0.95)
    expect(p95).toBeLessThanOrEqual(P95_BUDGET_MS)
  })
})
