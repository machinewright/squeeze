// Search general graphs whose best proof needs K hubs. Usage: node proto/hubs.mjs N P K count seed
import { maxMatchingGeneral, hubBound, groupsWithout } from '../src/core.js';
const [N, P, K, want, seed0] = process.argv.slice(2).map(Number);
let seed = seed0 || 1;
const R = () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
function layout(n, edges) {
  let p = [...Array(n)].map((_, i) => [Math.cos(2 * Math.PI * i / n) + R() * 0.1, Math.sin(2 * Math.PI * i / n) + R() * 0.1]);
  for (let it = 0; it < 600; it++) {
    const f = p.map(() => [0, 0]), T = 0.08 * (1 - it / 600) + 0.005;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j) { const dx = p[i][0] - p[j][0], dy = p[i][1] - p[j][1], d2 = dx * dx + dy * dy + 1e-4; f[i][0] += 0.04 * dx / d2; f[i][1] += 0.04 * dy / d2; }
    for (const [a, b] of edges) { const dx = p[a][0] - p[b][0], dy = p[a][1] - p[b][1]; f[a][0] -= 0.5 * dx; f[a][1] -= 0.5 * dy; f[b][0] += 0.5 * dx; f[b][1] += 0.5 * dy; }
    p = p.map(([x, y], i) => { const l = Math.hypot(...f[i]) || 1, s = Math.min(l, T); return [x + f[i][0] / l * s, y + f[i][1] / l * s]; });
  }
  const xs = p.map(q => q[0]), ys = p.map(q => q[1]), [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  return p.map(([x, y]) => [+((x - x0) / (x1 - x0)).toFixed(3), +((y - y0) / (y1 - y0)).toFixed(3)]);
}
function crossings(P, E) {
  const d = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]); let c = 0;
  for (let i = 0; i < E.length; i++) for (let j = i + 1; j < E.length; j++) { const [p1, p2, p3, p4] = [P[E[i][0]], P[E[i][1]], P[E[j][0]], P[E[j][1]]]; if (d(p1, p2, p3) * d(p1, p2, p4) < 0 && d(p3, p4, p1) * d(p3, p4, p2) < 0) c++; }
  return c;
}
function minDist(P) { let m = 9; for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) m = Math.min(m, Math.hypot(P[i][0] - P[j][0], P[i][1] - P[j][1])); return m; }
let found = 0;
for (let tries = 0; tries < 200000 && found < want; tries++) {
  const edges = [];
  for (let a = 0; a < N; a++) for (let b = a + 1; b < N; b++) if (R() < P) edges.push([a, b]);
  if (groupsWithout(N, edges, []).length !== 1) continue;
  if ([...Array(N).keys()].some(v => edges.filter(e => e.includes(v)).length < (+process.env.MINDEG || 1))) continue;
  const m = maxMatchingGeneral(N, edges);
  if (m >= Math.floor(N / 2)) continue;
  let bestK = null, sets = [];
  for (let s = 0; s < 1 << N; s++) { const h = []; for (let i = 0; i < N; i++) if (s >> i & 1) h.push(i); if (hubBound(N, edges, h) === m) { if (bestK === null || h.length < bestK) { bestK = h.length; sets = []; } if (h.length === bestK) sets.push(h); } }
  if (bestK !== K) continue;
  const pos = layout(N, edges), c = crossings(pos, edges);
  if (c > 1 || minDist(pos) < 0.12) continue;
  // greedy: random maximal matchings that are maximum
  let hit = 0; for (let t = 0; t < 300; t++) { const used = new Set(); let k = 0; for (const [a, b] of edges.slice().sort(() => R() - 0.5)) if (!used.has(a) && !used.has(b)) { used.add(a); used.add(b); k++; } if (k === m) hit++; }
  found++;
  console.log(JSON.stringify({ n: N, m, hubs: sets, crossings: c, greedy: hit / 300, edges, pos }));
}
