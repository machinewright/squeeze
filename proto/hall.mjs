// Smallest Hall violator (a set S of one colour with fewer free neighbours than |S|) for domino boards.
import { gridGraph } from '../src/core.js';
const boards = JSON.parse(process.argv[2]);
for (const rows of boards) {
  const g = gridGraph(rows), W = g.W, col = v => (Math.floor(v / W) + v % W) % 2;
  const nb = v => g.edges.filter(e => e.includes(v)).map(e => e[0] === v ? e[1] : e[0]);
  let best = null;
  for (const c of [0, 1]) {
    const cs = g.cells.filter(v => col(v) === c);
    const go = (i, S) => {
      if (S.length && (!best || S.length < best.length)) { const N = new Set(S.flatMap(nb)); if (N.size < S.length) { best = S.slice(); return; } }
      if (S.length >= 7 || i >= cs.length) return;
      S.push(cs[i]); go(i + 1, S); S.pop(); go(i + 1, S);
    };
    go(0, []);
  }
  console.log(rows.join(' '), '-> smallest violator', best && best.length, best && best.map(v => `r${Math.floor(v / W) + 1}c${v % W + 1}`).join(','));
}
