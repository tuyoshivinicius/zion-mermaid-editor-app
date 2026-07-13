// Spike — Renderizar Sequence no modelo nós+arestas do React Flow.
// Prova o passo que o round-trip (ADR-002) NÃO cobriu: mapear a semântica de Sequence
// (lifelines, mensagens ordenadas, ativações e fragmentos loop/alt/opt/par ANINHADOS)
// para primitivas do React Flow — custom nodes, GROUP nodes (parentNode) e edges — com
// coordenadas coerentes. Emite um SVG da MESMA geometria como sanity visual.
//
// O que este spike prova: a MODELAGEM/LAYOUT (o risco que a pesquisa apontou).
// O que NÃO prova: o render em DOM do próprio React Flow (sem browser no ambiente).
import { JSDOM } from 'jsdom';
import { writeFileSync } from 'node:fs';

const dom = new JSDOM('<!DOCTYPE html><body></body>', { pretendToBeVisual: true });
globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.navigator = dom.window.navigator;
const mermaid = (await import('mermaid')).default;
mermaid.initialize({ startOnLoad: false, securityLevel: 'loose' });

// ---------- type codes (confirmados via probe no mermaid 11.16.0) ----------
const SIGNAL = new Set([0, 1, 3, 4, 5, 6, 24, 25]);            // seta desenhada
const DOTTED = new Set([1, 4, 6, 25]);
const FRAG_START = { 10: 'loop', 12: 'alt', 15: 'opt', 19: 'par', 22: 'rect', 26: 'critical', 29: 'break' };
const FRAG_DIVIDER = new Set([13, 20, 27]);                    // alt-else / par-and / critical-option
const FRAG_END = new Set([11, 14, 16, 21, 23, 28, 30]);
const ACT_START = 17, ACT_END = 18;

// ---------- layout ----------
const X0 = 40, COL_W = 200, ACTOR_W = 120, HEADER_H = 40;
const CONTENT_TOP = 80, ROW = 60, FRAG_HEAD = 34, DIVIDER_BAND = 24, FRAG_PAD_X = 40, FRAG_BOT_PAD = 14;

const SAMPLE = `sequenceDiagram
  participant A as Alice
  participant B as Bob
  participant C as Carol
  A->>+B: hello
  loop every minute
    B->>C: ping
    alt is up
      C-->>B: pong
    else is down
      C-->>B: error
    end
    opt cleanup
      B->>C: flush
    end
  end
  B-->>-A: bye`;

const diagram = await mermaid.mermaidAPI.getDiagramFromText(SAMPLE);
const db = diagram.db;

// actors em ordem de declaração (Map preserva ordem)
const actorMap = db.getActors();
const actorKeys = [...actorMap.keys()];
const centerX = k => X0 + actorKeys.indexOf(k) * COL_W + ACTOR_W / 2;
const label = k => { const a = actorMap.get(k); return a.description ?? a.name ?? k; };

const nodes = [];
const edges = [];
const problems = [];
let n = 0, y = CONTENT_TOP;

// pilhas
const fragStack = [];        // frames de fragmento abertos
const actStack = new Map();  // key -> [startY,...] ativações abertas
let lastSignalY = -Infinity;
let signalCount = 0;

// actor headers + lifelines (altura preenchida no fim)
for (const k of actorKeys) {
  nodes.push({ id: `actor-${k}`, type: 'actorHeader', position: { x: centerX(k) - ACTOR_W / 2, y: 0 }, width: ACTOR_W, height: HEADER_H, data: { label: label(k) } });
  nodes.push({ id: `lifeline-${k}`, type: 'lifeline', position: { x: centerX(k) - 1, y: HEADER_H }, width: 2, height: 0, data: {} });
}

for (const m of db.getMessages()) {
  const t = m.type;

  if (FRAG_START[t] !== undefined) {
    const parent = fragStack[fragStack.length - 1] || null;
    const frame = { kind: FRAG_START[t], label: m.message, top: y, involved: new Set(), dividers: [], parentId: parent ? parent.id : null, id: `frag-${n++}` };
    fragStack.push(frame);
    y += FRAG_HEAD;
    continue;
  }
  if (FRAG_DIVIDER.has(t)) {
    const frame = fragStack[fragStack.length - 1];
    if (!frame) { problems.push(`divisor (type ${t}) sem fragmento aberto`); continue; }
    frame.dividers.push({ y, label: m.message });
    y += DIVIDER_BAND;
    continue;
  }
  if (FRAG_END.has(t)) {
    const frame = fragStack.pop();
    if (!frame) { problems.push(`fim de fragmento (type ${t}) sem abertura`); continue; }
    const bottom = y + 6;
    if (frame.involved.size === 0) frame.involved.add(actorKeys[0]);
    const cxs = [...frame.involved].map(centerX);
    const left = Math.min(...cxs) - FRAG_PAD_X;
    const right = Math.max(...cxs) + FRAG_PAD_X;
    frame.box = { left, top: frame.top, right, bottom };
    const parentBox = frame.parentId ? nodes.find(nd => nd.id === frame.parentId)?.data.box : null;
    // React Flow: posição do filho é RELATIVA ao pai
    const px = parentBox ? parentBox.left : 0, py = parentBox ? parentBox.top : 0;
    nodes.push({
      id: frame.id, type: 'group', parentNode: frame.parentId ?? undefined,
      position: { x: left - px, y: frame.top - py },
      width: right - left, height: bottom - frame.top,
      data: { kind: frame.kind, label: frame.label, dividers: frame.dividers, box: frame.box, absPosition: { x: left, y: frame.top } },
    });
    // propaga atores envolvidos para o pai (o pai deve conter o filho)
    if (fragStack.length) for (const a of frame.involved) fragStack[fragStack.length - 1].involved.add(a);
    y += FRAG_BOT_PAD;
    continue;
  }
  if (t === ACT_START) { (actStack.get(m.from) ?? actStack.set(m.from, []).get(m.from)).push(y); continue; }
  if (t === ACT_END) {
    const st = actStack.get(m.from); const s = st && st.pop();
    if (s === undefined) { problems.push(`deactivate em ${m.from} sem activate`); continue; }
    nodes.push({ id: `act-${n++}`, type: 'activation', position: { x: centerX(m.from) - 5, y: s }, width: 10, height: Math.max(y - s, ROW), data: { actor: m.from } });
    continue;
  }
  if (SIGNAL.has(t)) {
    if (!actorMap.has(m.from) || !actorMap.has(m.to)) { problems.push(`mensagem entre ator desconhecido: ${m.from}->${m.to}`); }
    const my = y + 20;
    edges.push({ id: `msg-${n++}`, source: `actor-${m.from}`, target: `actor-${m.to}`, type: 'message', label: m.message, data: { y: my, dotted: DOTTED.has(t) } });
    if (my <= lastSignalY) problems.push(`ordem temporal quebrada em "${m.message}" (y=${my} <= ${lastSignalY})`);
    lastSignalY = my; signalCount++;
    for (const f of fragStack) { f.involved.add(m.from); f.involved.add(m.to); }
    if (m.activate) actStack.set(m.from, (actStack.get(m.from) ?? [])); // marca; ativação real vem por ACT_START
    y += ROW;
    continue;
  }
  // notas e outros: ignorados no spike
}

const totalH = y + 40;
for (const nd of nodes) if (nd.type === 'lifeline') nd.height = totalH - HEADER_H;

// Post-pass: fragmentos internos fecham ANTES do pai, então o node do pai só existe
// agora. React Flow exige position do filho RELATIVA ao pai — recalcula aqui com todos
// os group-nodes já criados. (data.box segue absoluto p/ as invariantes.)
for (const g of nodes.filter(nd => nd.type === 'group')) {
  const parentAbs = g.parentNode ? nodes.find(nd => nd.id === g.parentNode).data.absPosition : { x: 0, y: 0 };
  g.position = { x: g.data.absPosition.x - parentAbs.x, y: g.data.absPosition.y - parentAbs.y };
}

// ---------- INVARIANTES (a prova) ----------
const checks = [];
const ok = (name, cond, detail = '') => checks.push({ name, pass: !!cond, detail });

ok('fragmentos balanceados (pilha vazia)', fragStack.length === 0, `restaram ${fragStack.length}`);
let openAct = 0; for (const st of actStack.values()) openAct += st.length;
ok('ativações balanceadas', openAct === 0, `${openAct} abertas`);

const actorIds = new Set(actorKeys.map(k => `actor-${k}`));
ok('toda edge de mensagem liga dois lifelines existentes',
  edges.every(e => actorIds.has(e.source) && actorIds.has(e.target)));

const ys = edges.map(e => e.data.y);
ok('ordem temporal preservada (y estritamente crescente)', ys.every((v, i) => i === 0 || v > ys[i - 1]));

const groups = nodes.filter(nd => nd.type === 'group');
// containment: cada grupo contém suas mensagens-filhas (por y) e atores envolvidos (por x)
let containOK = true, containDetail = '';
for (const g of groups) {
  const b = g.data.box;
  const inside = edges.filter(e => e.data.y > b.top && e.data.y < b.bottom);
  for (const e of inside) {
    const sx = centerX(e.source.replace('actor-', '')), tx = centerX(e.target.replace('actor-', ''));
    if (sx < b.left || sx > b.right || tx < b.left || tx > b.right) { containOK = false; containDetail = `grupo ${g.data.kind} corta a mensagem "${e.label}"`; }
  }
}
ok('todo grupo contém geometricamente suas mensagens (sem clipping)', containOK, containDetail);

// nesting: parentNode <=> box do filho ⊂ box do pai
let nestOK = true, nestDetail = '';
for (const g of groups) {
  if (!g.parentNode) continue;
  const p = nodes.find(nd => nd.id === g.parentNode);
  const cb = g.data.box, pb = p.data.box;
  if (!(pb.left <= cb.left && pb.top <= cb.top && cb.right <= pb.right && cb.bottom <= pb.bottom)) {
    nestOK = false; nestDetail = `${g.data.kind} não está contido em ${p.data.kind}`;
  }
}
ok('fragmentos aninhados: box filho ⊂ box pai (parentNode == geometria)', nestOK, nestDetail);

// dividers dentro da caixa
let divOK = true;
for (const g of groups) for (const d of g.data.dividers) if (!(d.y > g.data.box.top && d.y < g.data.box.bottom)) divOK = false;
ok('divisores (else/and) ficam dentro da caixa do fragmento', divOK);

// contrato React Flow: posição relativa do filho + posição absoluta do pai == box absoluto do filho
let relOK = true, relDetail = '';
for (const g of groups) {
  const parentAbs = g.parentNode ? nodes.find(nd => nd.id === g.parentNode).data.absPosition : { x: 0, y: 0 };
  const reconX = g.position.x + parentAbs.x, reconY = g.position.y + parentAbs.y;
  if (reconX !== g.data.box.left || reconY !== g.data.box.top) { relOK = false; relDetail = `${g.data.kind}: recon(${reconX},${reconY}) != box(${g.data.box.left},${g.data.box.top})`; }
}
ok('contrato React Flow: posRel(filho) + posAbs(pai) reconstrói o box absoluto', relOK, relDetail);

ok('sem problemas acumulados no mapeamento', problems.length === 0, problems.join('; '));

// ---------- relatório ----------
console.log('=== SPIKE: Sequence -> modelo React Flow (nodes+edges) ===');
console.log(`atores: ${actorKeys.length} | mensagens: ${signalCount} | grupos(fragmentos): ${groups.length} ` +
  `(aninhados: ${groups.filter(g => g.parentNode).length}) | ativações: ${nodes.filter(nd => nd.type === 'activation').length}`);
console.log('nós React Flow por tipo:',
  ['actorHeader', 'lifeline', 'group', 'activation'].map(tp => `${tp}=${nodes.filter(nd => nd.type === tp).length}`).join(' '));
console.log('');
for (const c of checks) console.log(`  [${c.pass ? 'PASS' : 'FAIL'}] ${c.name}${c.pass ? '' : '  -> ' + c.detail}`);
const allPass = checks.every(c => c.pass);
console.log('');
console.log(allPass ? '>>> TODAS AS INVARIANTES PASSARAM' : '>>> HÁ FALHAS');

// exemplo de nesting como o React Flow consumiria (parentNode + posição relativa)
console.log('\n=== amostra de group-nodes (parentNode + posição relativa) ===');
for (const g of groups) console.log(`  ${g.id} kind=${g.data.kind} parent=${g.parentNode ?? '(root)'} posRel=(${g.position.x},${g.position.y}) size=${g.width}x${g.height}`);

// ---------- SVG (sanity da geometria — NÃO é o render do React Flow) ----------
const esc = s => String(s ?? '').replace(/[<&>]/g, c => ({ '<': '&lt;', '&': '&amp;', '>': '&gt;' }[c]));
const svg = [];
const W = X0 + actorKeys.length * COL_W + 40;
svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${totalH}" font-family="ui-sans-serif,system-ui" font-size="13">`);
svg.push(`<rect width="${W}" height="${totalH}" fill="#0d1117"/>`);
svg.push(`<defs><marker id="a" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 Z" fill="#c9d1d9"/></marker></defs>`);
// grupos (fundo primeiro, do mais externo ao mais interno)
const depth = g => { let d = 0, p = g; while (p.parentNode) { d++; p = nodes.find(nd => nd.id === p.parentNode); } return d; };
const kindColor = { loop: '#1f6feb', alt: '#8957e5', opt: '#238636', par: '#9e6a03', rect: '#6e7681', critical: '#da3633', break: '#bb8009' };
for (const g of [...groups].sort((a, b) => depth(a) - depth(b))) {
  const b = g.data.box, c = kindColor[g.data.kind] ?? '#6e7681';
  svg.push(`<rect x="${b.left}" y="${b.top}" width="${b.right - b.left}" height="${b.bottom - b.top}" fill="${c}" fill-opacity="0.06" stroke="${c}" stroke-opacity="0.7" rx="6"/>`);
  svg.push(`<rect x="${b.left}" y="${b.top}" width="${40 + g.data.kind.length * 7}" height="18" fill="${c}" rx="3"/>`);
  svg.push(`<text x="${b.left + 6}" y="${b.top + 13}" fill="#fff" font-weight="600">${g.data.kind}${g.data.label ? ' [' + esc(g.data.label) + ']' : ''}</text>`);
  for (const d of g.data.dividers) {
    svg.push(`<line x1="${b.left}" y1="${d.y}" x2="${b.right}" y2="${d.y}" stroke="${c}" stroke-dasharray="4 3" stroke-opacity="0.7"/>`);
    svg.push(`<text x="${b.left + 6}" y="${d.y - 3}" fill="${c}">${esc(d.label)}</text>`);
  }
}
// lifelines
for (const k of actorKeys) svg.push(`<line x1="${centerX(k)}" y1="${HEADER_H}" x2="${centerX(k)}" y2="${totalH - 10}" stroke="#30363d" stroke-dasharray="4 4"/>`);
// ativações
for (const nd of nodes.filter(nd => nd.type === 'activation')) svg.push(`<rect x="${nd.position.x}" y="${nd.position.y}" width="${nd.width}" height="${nd.height}" fill="#c9d1d9" fill-opacity="0.5" stroke="#c9d1d9"/>`);
// mensagens
for (const e of edges) {
  const sx = centerX(e.source.replace('actor-', '')), tx = centerX(e.target.replace('actor-', '')), yy = e.data.y;
  svg.push(`<line x1="${sx}" y1="${yy}" x2="${tx}" y2="${yy}" stroke="#c9d1d9" ${e.data.dotted ? 'stroke-dasharray="5 3"' : ''} marker-end="url(#a)"/>`);
  const mid = (sx + tx) / 2;
  svg.push(`<text x="${mid}" y="${yy - 5}" fill="#c9d1d9" text-anchor="middle">${esc(e.label)}</text>`);
}
// actor headers
for (const k of actorKeys) {
  svg.push(`<rect x="${centerX(k) - ACTOR_W / 2}" y="8" width="${ACTOR_W}" height="${HEADER_H - 8}" fill="#161b22" stroke="#30363d" rx="5"/>`);
  svg.push(`<text x="${centerX(k)}" y="30" fill="#e6edf3" text-anchor="middle" font-weight="600">${esc(label(k))}</text>`);
}
svg.push('</svg>');
writeFileSync(new URL('./sequence-render.svg', import.meta.url), svg.join('\n'));
console.log('\nSVG (geometria) escrito em sequence-render.svg');

process.exit(allPass && problems.length === 0 ? 0 : 1);
