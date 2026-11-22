import { test } from 'node:test';
import assert from 'node:assert/strict';
import { konigCover, maxMatching, isMatching, uncovered, maxFlow, routesValid, reachable, minStacks, maxMisfitsBrute, gridGraph } from '../src/core.js';

function rng(seed) { return () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function bruteMatch(edges) {
  let best = 0;
  const go = (i, used, k) => { if (k > best) best = k; for (let j = i; j < edges.length; j++) { const [a, b] = edges[j]; if (!used.has(a) && !used.has(b)) { used.add(a); used.add(b); go(j + 1, used, k + 1); used.delete(a); used.delete(b); } } };
  go(0, new Set(), 0); return best;
}
function bruteCover(n, edges) {
  let best = n;
  for (let m = 0; m < 1 << n; m++) { const s = []; for (let i = 0; i < n; i++) if (m >> i & 1) s.push(i); if (s.length < best && uncovered(edges, s).length === 0) best = s.length; }
  return best;
}

test('matching is maximum and equals the smallest cover (König), random bipartite graphs', () => {
  const R = rng(7);
  for (let t = 0; t < 300; t++) {
    const a = 1 + Math.floor(R() * 5), b = 1 + Math.floor(R() * 5), edges = [];
    for (let i = 0; i < a; i++) for (let j = 0; j < b; j++) if (R() < 0.4) edges.push([i, a + j]);
    const m = maxMatching(a + b, edges);
    assert.ok(isMatching(edges, m));
    assert.equal(m.length, bruteMatch(edges));
    assert.equal(m.length, bruteCover(a + b, edges));
    const c = konigCover(a + b, edges);
    assert.equal(c.length, m.length); assert.equal(uncovered(edges, c).length, 0);
  }
});

test('max flow equals the smallest cut, random small networks', () => {
  const R = rng(11);
  for (let t = 0; t < 200; t++) {
    const n = 3 + Math.floor(R() * 4), edges = [];
    for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) if (a !== b && b !== 0 && a !== n - 1 && R() < 0.45) edges.push([a, b, 1 + Math.floor(R() * 4)]);
    const { value, flow } = maxFlow(n, edges, 0, n - 1);
    flow.forEach((f, i) => assert.ok(f >= 0 && f <= edges[i][2]));
    let best = Infinity;
    for (let m = 0; m < 1 << edges.length; m++) {
      const closed = []; let c = 0;
      edges.forEach((e, i) => { if (m >> i & 1) { closed.push(i); c += e[2]; } });
      if (c < best && !reachable(n, edges, 0, closed)[n - 1]) best = c;
    }
    assert.equal(value, best);
  }
});

test('routes: capacity and endpoints are checked', () => {
  const e = [[0, 1, 1], [1, 2, 1], [0, 2, 1]];
  assert.ok(routesValid(e, [[0, 1, 2], [0, 2]], 0, 2));
  assert.ok(!routesValid(e, [[0, 1, 2], [0, 1, 2]], 0, 2));
  assert.ok(!routesValid(e, [[0, 1]], 0, 2));
  assert.ok(!routesValid(e, [[0, 2, 1]], 0, 2));
});

test('fewest stacks equals most boxes with no two nesting (Dilworth), random boxes', () => {
  const R = rng(3);
  for (let t = 0; t < 200; t++) {
    const n = 1 + Math.floor(R() * 9), boxes = [];
    for (let i = 0; i < n; i++) boxes.push([1 + Math.floor(R() * 8), 1 + Math.floor(R() * 8)]);
    assert.equal(minStacks(boxes), maxMisfitsBrute(boxes));
  }
});

test('grid graph', () => {
  const g = gridGraph(['..', '.#']);
  assert.deepEqual(g.cells, [0, 1, 2]);
  assert.deepEqual(g.edges, [[0, 1], [0, 2]]);
});

import { maxMatchingGeneral, hubBound } from '../src/core.js';
test('general matching: the best hub bound equals the most pairs (Tutte-Berge), random small graphs', () => {
  const R = rng(19);
  for (let t = 0; t < 150; t++) {
    const n = 2 + Math.floor(R() * 7), edges = [];
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) if (R() < 0.35) edges.push([a, b]);
    const m = maxMatchingGeneral(n, edges);
    assert.equal(m, bruteMatch(edges));
    let best = Infinity;
    for (let s = 0; s < 1 << n; s++) { const h = []; for (let i = 0; i < n; i++) if (s >> i & 1) h.push(i); best = Math.min(best, hubBound(n, edges, h)); }
    assert.equal(best, m);
  }
});
