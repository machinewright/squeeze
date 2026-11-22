// Search for level candidates. Usage: node proto/gen.mjs pairs|grid|pipes|boxes [count]
import { maxMatching, uncovered, maxFlow, reachable, minStacks, nests, gridGraph } from '../src/core.js';
const kind = process.argv[2], want = +(process.argv[3] || 5);
let seed = +(process.argv[4] || 1);
const R = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const ri = (a, b) => a + Math.floor(R() * (b - a + 1));
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
// share of random maximal matchings that are maximum
function greedyRate(edges, m, trials = 400) {
  let hit = 0;
  for (let t = 0; t < trials; t++) { const used = new Set(); let k = 0; for (const [a, b] of shuffle(edges.slice())) if (!used.has(a) && !used.has(b)) { used.add(a); used.add(b); k++; } if (k === m) hit++; }
  return hit / trials;
}
function minCovers(n, edges, nodes, m) { // all covers of size m over the given nodes
  const out = [], k = nodes.length;
  const go = (i, s) => { if (s.length === m) { if (!uncovered(edges, s).length) out.push(s.slice()); return; } if (k - i < m - s.length) return; s.push(nodes[i]); go(i + 1, s); s.pop(); go(i + 1, s); };
  go(0, []); return out;
}
const found = [];
if (kind === 'pairs') {
  const [A, B, P, M, MD = 1] = (process.argv[5] || '6,6,0.35,5').split(',').map(Number);
  for (let tries = 0; tries < 20000 && found.length < want; tries++) {
    const edges = [];
    for (let i = 0; i < A; i++) for (let j = 0; j < B; j++) if (R() < P) edges.push([i, A + j]);
    const deg = new Array(A + B).fill(0); edges.forEach(([a, b]) => { deg[a]++; deg[b]++; });
    if (deg.some(d => d < MD)) continue;
    const m = maxMatching(A + B, edges).length;
    if (m !== M) continue;
    const covers = minCovers(A + B, edges, [...Array(A + B).keys()], m);
    if (covers.some(c => c.every(v => v < A) || c.every(v => v >= A))) continue; // must mix rows
    const g = greedyRate(edges, m);
    if (g > 0.35) continue;
    found.push({ A, B, edges, m, covers: covers.length, greedy: g });
  }
} else if (kind === 'hall') { // plant a set S of k top people whose partners are only k-1 bottom people
  const [A, B, K, P, MD = 2] = (process.argv[5] || '7,7,3,0.3').split(',').map(Number);
  for (let tries = 0; tries < 50000 && found.length < want; tries++) {
    const S = shuffle([...Array(A).keys()]).slice(0, K), NS = shuffle([...Array(B).keys()]).slice(0, K - 1), edges = [];
    for (let i = 0; i < A; i++) for (let j = 0; j < B; j++) {
      if (S.includes(i)) { if (NS.includes(j) && R() < 0.8) edges.push([i, A + j]); }
      else if (R() < P) edges.push([i, A + j]);
    }
    const deg = new Array(A + B).fill(0); edges.forEach(([a, b]) => { deg[a]++; deg[b]++; });
    if (deg.some(d => d < MD)) continue;
    const m = maxMatching(A + B, edges).length;
    if (m !== Math.min(A, B) - 1) continue;
    const g = greedyRate(edges, m);
    if (g > 0.5) continue;
    found.push({ A, B, edges: edges.map(([a, b]) => [a, b - A]), m, greedy: g, S });
  }
} else if (kind === 'grid') {
  const [H, W, holes] = (process.argv[5] || '5,5,4').split(',').map(Number);
  for (let tries = 0; tries < 50000 && found.length < want; tries++) {
    const g = Array.from({ length: H }, () => Array(W).fill('.'));
    for (let k = 0; k < holes; k++) g[ri(0, H - 1)][ri(0, W - 1)] = '#';
    const rows = g.map(r => r.join('')), gg = gridGraph(rows);
    const black = gg.cells.filter(v => (Math.floor(v / W) + v % W) % 2 === 0).length, white = gg.cells.length - black;
    if (Math.abs(black - white) > 1) continue;
    if (gg.cells.some(v => !gg.edges.some(e => e.includes(v)))) continue; // no isolated cells
    const m = maxMatching(gg.n, gg.edges).length;
    if (m >= Math.min(black, white)) continue;
    const gr = greedyRate(gg.edges, m);
    found.push({ rows, m, cells: gg.cells.length, greedy: gr });
  }
} else if (kind === 'pipes') {
  const layers = (process.argv[5] || '3,3').split(',').map(Number), MAXC = +(process.argv[6] || 0);
  for (let tries = 0; tries < 20000 && found.length < want; tries++) {
    const L = [[0]]; let n = 1;
    for (const k of layers) { L.push([...Array(k).keys()].map(i => n + i)); n += k; }
    L.push([n]); n++;
    const edges = [];
    // local edges only: node i of a layer to nodes at a similar height in the next layer
    const yOf = v => { for (const lay of L) { const i = lay.indexOf(v); if (i >= 0) return lay.length === 1 ? 0.5 : i / (lay.length - 1); } };
    for (let l = 0; l + 1 < L.length; l++) for (const a of L[l]) for (const b of L[l + 1]) if (l === 0 || l === L.length - 2 || (Math.abs(yOf(a) - yOf(b)) < 0.6 && R() < 0.6)) edges.push([a, b, ri(1, 5)]);
    for (let l = 1; l + 1 < L.length; l++) for (let i = 0; i + 1 < L[l].length; i++) if (R() < 0.3) edges.push(R() < 0.5 ? [L[l][i], L[l][i + 1], ri(1, 3)] : [L[l][i + 1], L[l][i], ri(1, 3)]);
    const s = 0, t = n - 1;
    const P = []; L.forEach((lay, l) => lay.forEach(v => { P[v] = [l / (L.length - 1), yOf(v)]; }));
    const cross = (p1, p2, p3, p4) => { const d = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]); return d(p1, p2, p3) * d(p1, p2, p4) < 0 && d(p3, p4, p1) * d(p3, p4, p2) < 0; };
    let nc = 0; for (let i = 0; i < edges.length; i++) for (let j = i + 1; j < edges.length; j++) if (cross(P[edges[i][0]], P[edges[i][1]], P[edges[j][0]], P[edges[j][1]])) nc++;
    if (nc > MAXC) continue;
    const v = maxFlow(n, edges, s, t).value;
    const outCap = edges.filter(e => e[0] === s).reduce((x, e) => x + e[2], 0), inCap = edges.filter(e => e[1] === t).reduce((x, e) => x + e[2], 0);
    if (v >= Math.min(outCap, inCap) - 1) continue;
    // greedy: repeatedly route one unit along a random simple path with spare capacity
    let hit = 0;
    for (let tr = 0; tr < 200; tr++) {
      const load = edges.map(() => 0); let k = 0;
      for (;;) {
        const path = []; const seen = new Set([s]); let u = s, ok = false;
        while (true) { if (u === t) { ok = true; break; } const opts = edges.map((e, i) => i).filter(i => edges[i][0] === u && load[i] < edges[i][2] && !seen.has(edges[i][1])); if (!opts.length) break; const i = opts[ri(0, opts.length - 1)]; path.push(i); u = edges[i][1]; seen.add(u); }
        if (!ok) { // try a few more times before giving up
          let any = false; for (let q = 0; q < 30 && !any; q++) { /* retry */ const p2 = []; const s2 = new Set([s]); let w = s; while (w !== t) { const o = edges.map((e, i) => i).filter(i => edges[i][0] === w && load[i] < edges[i][2] && !s2.has(edges[i][1])); if (!o.length) break; const i = o[ri(0, o.length - 1)]; p2.push(i); w = edges[i][1]; s2.add(w); } if (w === t) { p2.forEach(i => load[i]++); k++; any = true; } }
          if (!any) break; continue;
        }
        path.forEach(i => load[i]++); k++;
      }
      if (k === v) hit++;
    }
    const g = hit / 200;
    if (g > 0.4) continue;
    found.push({ layers, n, edges, v, src: outCap, sink: inCap, greedy: g });
  }
} else if (kind === 'boxes') {
  const [N, S, K] = (process.argv[5] || '9,12,4').split(',').map(Number);
  for (let tries = 0; tries < 50000 && found.length < want; tries++) {
    const xs = shuffle([...Array(S).keys()].map(i => i + 1)).slice(0, N), ys = shuffle([...Array(S).keys()].map(i => i + 1)).slice(0, N);
    const boxes = xs.map((x, i) => [x, ys[i]]);
    const k = minStacks(boxes);
    if (k !== K) continue;
    let hit = 0;
    for (let t = 0; t < 300; t++) { const st = []; for (const i of shuffle([...Array(N).keys()])) { const s = st.find(s => s.every(j => nests(boxes[i], boxes[j]))); if (s) s.push(i); else st.push([i]); } if (st.length === k) hit++; }
    const g = hit / 300;
    if (g > 0.3) continue;
    found.push({ boxes, k, greedy: g });
  }
}
for (const f of found) console.log(JSON.stringify(f));
