// Exact solution + proof for each level, as indices the play-through clicks (JSON on stdout).
import { LEVELS } from '../src/levels.js';
import { maxMatching, konigCover, maxFlow, reachable, minStacks, fits, gridGraph } from '../src/core.js';
const out = LEVELS.map(lv => {
  if (lv.kind === 'pairs') {
    const A = lv.top, edges = lv.edges.map(([a, b]) => [a, A + b]), n = A + lv.bottom;
    return { id: lv.id, kind: lv.kind, build: maxMatching(n, edges), bound: konigCover(n, edges) };
  }
  if (lv.kind === 'grid') {
    const g = gridGraph(lv.rows);
    return { id: lv.id, kind: lv.kind, build: maxMatching(g.n, g.edges).map(i => g.edges[i]), bound: konigCover(g.n, g.edges) };
  }
  if (lv.kind === 'pipes') {
    const n = lv.pos.length, E = lv.edges, { flow } = maxFlow(n, E, 0, n - 1), f = flow.slice(), paths = [];
    for (;;) { // decompose into unit paths
      const path = [0]; const seen = new Set([0]); let u = 0;
      while (u !== n - 1) { const i = E.findIndex((e, j) => e[0] === u && f[j] > 0 && !seen.has(e[1])); if (i < 0) break; u = E[i][1]; seen.add(u); path.push(u); }
      if (u !== n - 1) break;
      for (let k = 1; k < path.length; k++) f[E.findIndex(e => e[0] === path[k - 1] && e[1] === path[k])]--;
      paths.push(path);
    }
    // min cut from the residual graph: nodes reachable from IN in the residual network
    const resid = [0]; const R = new Set([0]);
    while (resid.length) { const u = resid.pop(); E.forEach((e, i) => { if (e[0] === u && flow[i] < e[2] && !R.has(e[1])) { R.add(e[1]); resid.push(e[1]); } if (e[1] === u && flow[i] > 0 && !R.has(e[0])) { R.add(e[0]); resid.push(e[0]); } }); }
    return { id: lv.id, kind: lv.kind, build: paths, bound: E.map((e, i) => i).filter(i => R.has(E[i][0]) && !R.has(E[i][1])) };
  }
  // boxes: chains from a maximum matching, antichain by brute force over sizes
  const B = lv.boxes, n = B.length, edges = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (fits(B[i], B[j])) edges.push([i, n + j]);
  const M = maxMatching(2 * n, edges), next = new Array(n).fill(-1), hasPrev = new Array(n).fill(false);
  for (const k of M) { const [a, b] = edges[k]; next[a] = b - n; hasPrev[b - n] = true; }
  const chains = [];
  for (let i = 0; i < n; i++) if (!hasPrev[i]) { const c = []; for (let v = i; v >= 0; v = next[v]) c.push(v); chains.push(c); }
  const k = minStacks(B); let anti = null;
  for (let m = 0; m < 1 << n && !anti; m++) { const s = []; for (let i = 0; i < n; i++) if (m >> i & 1) s.push(i); if (s.length === k && s.every((a, x) => s.slice(x + 1).every(b => !fits(B[a], B[b]) && !fits(B[b], B[a])))) anti = s; }
  return { id: lv.id, kind: lv.kind, build: chains, bound: anti };
});
console.log(JSON.stringify(out));
