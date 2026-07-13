// ADR-002 spike — Mermaid <-> internal graph model round-trip fidelity.
// Proves the cycle: Mermaid text -> model -> (edit) -> generate Mermaid -> re-parse.
// Measures per-dimension structural fidelity for Flowchart and Sequence.
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!DOCTYPE html><body></body>', { pretendToBeVisual: true });
globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.navigator = dom.window.navigator;
const mermaid = (await import('mermaid')).default;
mermaid.initialize({ startOnLoad: false, securityLevel: 'loose' });

// ---------- FLOWCHART ----------
const SHAPE_WRAP = {
  square:     t => `["${t}"]`,
  round:      t => `("${t}")`,
  stadium:    t => `(["${t}"])`,
  subroutine: t => `[["${t}"]]`,
  cylinder:   t => `[("${t}")]`,
  circle:     t => `(("${t}"))`,
  diamond:    t => `{"${t}"}`,
  hexagon:    t => `{{"${t}"}}`,
  odd:        t => `>"${t}"]`,
};
function edgeArrow(e) {
  const head = { arrow_point: '>', arrow_cross: 'x', arrow_circle: 'o', arrow_open: '' }[e.type] ?? '>';
  const open = e.type === 'arrow_open';
  if (e.stroke === 'dotted') return open ? '-.-' : `-.-${head}`;
  if (e.stroke === 'thick')  return open ? '===' : `==${head}`;
  return open ? '---' : `--${head}`;
}
function parseFlow(text) {
  return mermaid.mermaidAPI.getDiagramFromText(text);
}
function flowToModel(db) {
  const vertices = [...db.getVertices().values()].map(v => ({ id: v.id, text: v.text, type: v.type }));
  const edges = db.getEdges().map(e => ({ start: e.start, end: e.end, type: e.type, stroke: e.stroke, text: e.text || '' }));
  const subgraphs = db.getSubGraphs().map(s => ({ id: s.id, title: s.title, nodes: [...s.nodes].sort() }));
  return { direction: db.getDirection(), vertices, edges, subgraphs };
}
function genFlow(model) {
  const L = [`flowchart ${model.direction}`];
  const inSub = new Set(model.subgraphs.flatMap(s => s.nodes));
  const emitNode = v => `  ${v.id}${(SHAPE_WRAP[v.type] || SHAPE_WRAP.square)(v.text)}`;
  for (const v of model.vertices) if (!inSub.has(v.id)) L.push(emitNode(v));
  const byId = Object.fromEntries(model.vertices.map(v => [v.id, v]));
  for (const s of model.subgraphs) {
    L.push(`  subgraph ${s.id} ["${s.title}"]`);
    for (const nid of s.nodes) L.push('  ' + emitNode(byId[nid]));
    L.push('  end');
  }
  for (const e of model.edges) {
    const arr = edgeArrow(e);
    L.push(`  ${e.start} ${arr}${e.text ? `|${e.text}|` : ''} ${e.end}`);
  }
  return L.join('\n');
}

// ---------- SEQUENCE ----------
const MTYPE = { 0:'solid', 1:'dotted', 3:'solidCross', 4:'dottedCross', 5:'solidOpen', 6:'dottedOpen',
  10:'loopStart', 11:'loopEnd', 12:'altStart', 13:'altElse', 14:'altEnd', 15:'optStart', 16:'optEnd',
  17:'parStart', 18:'parAnd', 19:'parEnd', 22:'critStart' };
const ARROW = { solid:'->>', dotted:'-->>', solidOpen:'->', dottedOpen:'-->', solidCross:'-x', dottedCross:'--x' };
function seqToModel(db) {
  const actors = [...db.getActors().entries()].map(([id, a]) => ({ id, description: a.description }));
  const items = db.getMessages().map(m => ({ kind: MTYPE[m.type] ?? `t${m.type}`, from: m.from, to: m.to, message: m.message }));
  return { actors, items };
}
function genSeq(model) {
  const L = ['sequenceDiagram'];
  for (const a of model.actors) L.push(`  participant ${a.id} as ${a.description}`);
  let indent = '  ';
  const dec = () => { indent = indent.slice(2) || '  '; };
  for (const it of model.items) {
    if (['loopEnd','altEnd','optEnd','parEnd'].includes(it.kind)) dec();
    switch (it.kind) {
      case 'loopStart': L.push(`${indent}loop ${it.message}`); indent += '  '; break;
      case 'loopEnd':   L.push(`${indent}end`); break;
      case 'optStart':  L.push(`${indent}opt ${it.message}`); indent += '  '; break;
      case 'optEnd':    L.push(`${indent}end`); break;
      case 'altStart':  L.push(`${indent}alt ${it.message}`); indent += '  '; break;
      case 'altElse':   L.push(`${indent.slice(2)}else ${it.message}`); break;
      case 'altEnd':    L.push(`${indent}end`); break;
      case 'parStart':  L.push(`${indent}par ${it.message}`); indent += '  '; break;
      case 'parAnd':    L.push(`${indent.slice(2)}and ${it.message}`); break;
      case 'parEnd':    L.push(`${indent}end`); break;
      default: {
        const arr = ARROW[it.kind] ?? '->>';
        L.push(`${indent}${it.from}${arr}${it.to}: ${it.message}`);
      }
    }
  }
  return L.join('\n');
}

// ---------- FIDELITY HARNESS ----------
function cmp(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function dims(m1, m2, keys) {
  const r = {};
  for (const k of keys) r[k] = cmp(m1[k], m2[k]);
  return r;
}
function pct(obj) { const v = Object.values(obj); return Math.round(100 * v.filter(Boolean).length / v.length); }

const byIdSort = arr => [...arr].sort((a,b)=> (a.id||a.start+a.end).localeCompare(b.id||b.start+b.end));
async function flowRoundTrip(name, text) {
  const m1 = flowToModel((await parseFlow(text)).db);
  const gen = genFlow(m1);
  const m2 = flowToModel((await parseFlow(gen)).db);
  // content fidelity = order-insensitive (what the diagram IS); order fidelity = declaration order preserved
  const content = {
    direction: cmp(m1.direction, m2.direction),
    vertices: cmp(byIdSort(m1.vertices), byIdSort(m2.vertices)),
    edges: cmp(byIdSort(m1.edges), byIdSort(m2.edges)),
    subgraphs: cmp(byIdSort(m1.subgraphs), byIdSort(m2.subgraphs)),
  };
  const orderOk = cmp(m1.vertices.map(v=>v.id), m2.vertices.map(v=>v.id));
  console.log(`\n[FLOW] ${name}: content ${pct(content)}% | declaration-order preserved: ${orderOk?'YES':'NO'}`, content);
  if (pct(content) < 100) console.log('  M1:', JSON.stringify(m1), '\n  M2:', JSON.stringify(m2), '\n  GEN:\n'+gen);
  return pct(content);
}
async function seqRoundTrip(name, text) {
  const m1 = seqToModel((await parseFlow(text)).db);
  const gen = genSeq(m1);
  const m2 = seqToModel((await parseFlow(gen)).db);
  const d = dims(m1, m2, ['actors','items']);
  console.log(`\n[SEQ] ${name}: fidelity ${pct(d)}%`, d);
  if (pct(d) < 100) console.log('  M1:', JSON.stringify(m1), '\n  M2:', JSON.stringify(m2), '\n  GEN:\n'+gen);
  return pct(d);
}

const scores = [];
scores.push(await flowRoundTrip('shapes+subgraph+labels+dotted', `flowchart TD
  A[Start] --> B{Decision}
  B -->|yes| C[(Database)]
  B -.->|no| D((Circle))
  A ==> F([Stadium])
  subgraph grp [My Group]
    C --> E[End]
  end`));
scores.push(await flowRoundTrip('LR + hexagon + open edge', `flowchart LR
  X{{Hex}} --- Y[Plain]
  Y --o Z[Circle end]`));

// EDIT scenario: parse, mutate the model (add node + edge, rename), regenerate, re-parse, assert edit survived
async function editScenario() {
  const m = flowToModel((await parseFlow(`flowchart TD\n  A[Start] --> B[Middle]`)).db);
  m.vertices.push({ id: 'C', text: 'Added on canvas', type: 'round' });
  m.edges.push({ start: 'B', end: 'C', type: 'arrow_point', stroke: 'normal', text: 'new edge' });
  m.vertices.find(v => v.id === 'A').text = 'Renamed Start';
  const gen = genFlow(m);
  const back = flowToModel((await parseFlow(gen)).db);
  const ok = back.vertices.some(v => v.id === 'C' && v.text === 'Added on canvas')
    && back.edges.some(e => e.start === 'B' && e.end === 'C' && e.text === 'new edge')
    && back.vertices.some(v => v.id === 'A' && v.text === 'Renamed Start');
  console.log(`\n[EDIT] canvas edit -> Mermaid survived re-parse: ${ok ? 'YES' : 'NO'}`);
  console.log('  generated:\n' + gen.split('\n').map(l => '   '+l).join('\n'));
  return ok;
}
const editOk = await editScenario();

scores.push(await seqRoundTrip('loop+alt fragments + aliases', `sequenceDiagram
  participant A as Alice
  participant B as Bob
  A->>B: Hello
  loop every minute
    B-->>A: ack
  end
  alt is ok
    A->>B: great
  else not ok
    A->>B: retry
  end`));
scores.push(await seqRoundTrip('opt + nested', `sequenceDiagram
  participant U as User
  participant S as Server
  U->>S: request
  opt cache miss
    S->>S: compute
  end
  S-->>U: response`));

console.log('\n================ SUMMARY ================');
console.log('Flowchart round-trip scores:', scores.slice(0,2).map(s=>s+'%').join(', '));
console.log('Canvas-edit -> Mermaid survived:', editOk ? 'YES' : 'NO');
console.log('Sequence round-trip scores:', scores.slice(3).map(s=>s+'%').join(', '), '(incl. loop/alt/opt fragments)');
