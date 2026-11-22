import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from '../src/levels.js';
import { maxMatching, maxMatchingGeneral, maxFlow, minStacks, gridGraph } from '../src/core.js';

// The exact answers the level texts rely on.
const ANSWER = { p1: 2, p2: 3, p3: 5, p4: 6, d1: 6, d2: 14, d3: 14, d4: 13, w1: 4, w2: 5, w3: 8, w4: 5, b1: 3, b2: 4, b3: 4, b4: 5, h1: 4, h2: 5, h3: 5 };

function answer(lv) {
  if (lv.kind === 'pairs') return maxMatching(lv.top + lv.bottom, lv.edges.map(([a, b]) => [a, lv.top + b])).length;
  if (lv.kind === 'grid') { const g = gridGraph(lv.rows); return maxMatching(g.n, g.edges).length; }
  if (lv.kind === 'hubs') return maxMatchingGeneral(lv.pos.length, lv.edges);
  if (lv.kind === 'pipes') return maxFlow(lv.pos.length, lv.edges, 0, lv.pos.length - 1).value;
  return minStacks(lv.boxes);
}

test('every level has the answer its text assumes, and ids are unique', () => {
  assert.equal(new Set(LEVELS.map(l => l.id)).size, LEVELS.length);
  for (const lv of LEVELS) assert.equal(answer(lv), ANSWER[lv.id], lv.id);
});

test('the free bound is never already the answer (there is always something to prove)', () => {
  for (const lv of LEVELS) {
    const a = answer(lv);
    if (lv.sense === 'max') assert.ok(lv.trivial.value > a, lv.id);
    else assert.ok(lv.trivial.low < a && lv.trivial.value > a, lv.id);
  }
});

test('boxes: distinct widths and heights (no ties to squint at), inside the drawing, palette big enough', () => {
  for (const lv of LEVELS.filter(l => l.kind === 'boxes')) {
    const xs = lv.boxes.map(b => b[0]), ys = lv.boxes.map(b => b[1]);
    assert.equal(new Set(xs).size, xs.length, lv.id); assert.equal(new Set(ys).size, ys.length, lv.id);
    assert.ok(Math.max(...xs, ...ys) < lv.size, lv.id);
    assert.ok(lv.stacks > minStacks(lv.boxes), lv.id);
  }
});

test('pipes and hubs: no two lines cross in the drawing; every junction has a way in and out', () => {
  const d = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  for (const lv of LEVELS.filter(l => l.kind === 'pipes' || l.kind === 'hubs')) {
    const P = lv.pos, E = lv.edges, n = P.length;
    for (let i = 0; i < E.length; i++) for (let j = i + 1; j < E.length; j++) {
      const [p1, p2, p3, p4] = [P[E[i][0]], P[E[i][1]], P[E[j][0]], P[E[j][1]]];
      assert.ok(!(d(p1, p2, p3) * d(p1, p2, p4) < 0 && d(p3, p4, p1) * d(p3, p4, p2) < 0), `${lv.id} pipes ${i} and ${j} cross`);
    }
    if (lv.kind === 'hubs') continue;
    for (let v = 1; v < n - 1; v++) assert.ok(E.some(e => e[1] === v) && E.some(e => e[0] === v), `${lv.id} junction ${v}`);
    for (let i = 0; i < E.length; i++) for (let j = 0; j < E.length; j++) if (i !== j) assert.ok(!(E[i][0] === E[j][1] && E[i][1] === E[j][0]) && !(E[i][0] === E[j][0] && E[i][1] === E[j][1]), `${lv.id} parallel pipes`);
  }
});

// Pairs 3 and 4 promise that a first plan gets stuck: sweeping either row in either direction, each person taking
// the nearest free partner, must fall short of the best answer.
import { orderRows } from '../src/views/pairs.js';
test('Pairs 3 and 4: the obvious sweeps fall one short', () => {
  for (const id of ['p3', 'p4']) {
    const lv = LEVELS.find(l => l.id === id), A = lv.top;
    const edges = lv.edges.map(([a, b]) => [a, A + b]), order = orderRows(A, lv.bottom, edges);
    const best = maxMatching(A + lv.bottom, edges).length;
    for (const [row, other] of [[order.top, order.bottom], [order.bottom, order.top]]) for (const rev of [false, true]) {
      const r = rev ? [...row].reverse() : row, o = rev ? [...other].reverse() : other, used = new Set();
      let m = 0;
      for (const v of r) {
        const w = o.find(x => !used.has(x) && edges.some(e => e.includes(v) && e.includes(x)));
        if (w !== undefined) { used.add(w); m++; }
      }
      assert.ok(m < best, `${id}: a sweep reaches ${m} of ${best}`);
    }
  }
});

// Dominoes: the texts lean on the two colours. Level 1 is settled by counting them (8 against 6); from level 2 on
// the colours are balanced, so counting alone proves nothing and the answer is one below either count.
test('Dominoes: the colour counts are what the texts say', () => {
  const count = lv => { const g = gridGraph(lv.rows), n = [0, 0]; for (const v of g.cells) n[(Math.floor(v / g.W) + v % g.W) % 2]++; return n.sort((a, b) => a - b); };
  const grids = LEVELS.filter(l => l.kind === 'grid');
  assert.deepEqual(count(grids[0]), [6, 8]);
  assert.equal(answer(grids[0]), 6);
  for (const lv of grids.slice(1)) { const [lo, hi] = count(lv); assert.equal(lo, hi, lv.id); assert.equal(answer(lv), lo - 1, lv.id); }
});

// Pipes 3 says "if your water gets stuck, take a unit off a route": so filling routes without ever taking water
// back must be able to end short of the best answer (and must also be able to reach it).
test('Pipes 3: sending water without rerouting can get stuck short of the best', () => {
  const lv = LEVELS.find(l => l.id === 'w3'), n = lv.pos.length, E = lv.edges, ends = new Set();
  const paths = [], walk = (v, path) => { if (v === n - 1) { paths.push([...path]); return; } E.forEach(([a, b], i) => { if (a === v && !path.some(j => E[j][0] === b)) { path.push(i); walk(b, path); path.pop(); } }); };
  walk(0, []);
  const seen = new Set(), go = (cap, f) => {
    const key = cap.join(); if (seen.has(key)) return; seen.add(key);
    const open = paths.filter(p => p.every(i => cap[i] > 0));
    if (!open.length) { ends.add(f); return; }
    for (const p of open) { const c = [...cap]; p.forEach(i => c[i]--); go(c, f + 1); }
  };
  go(E.map(e => e[2]), 0);
  const best = answer(lv);
  assert.ok(ends.has(best) && Math.min(...ends) < best, `w3 can end at ${[...ends]}`);
});
