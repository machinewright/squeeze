// Print each level's exact answer and its minimum certificates, with on-screen names.
import { LEVELS } from '../src/levels.js';
import { konigCover, maxMatching, uncovered, maxFlow, reachable, minStacks, isMisfitSet, gridGraph } from '../src/core.js';
import { orderRows } from '../src/views/pairs.js';
const only = process.argv[2];
function subsets(items, k, f) { const go = (i, s) => { if (s.length === k) return f(s.slice()); if (items.length - i < k - s.length) return; s.push(items[i]); go(i + 1, s); s.pop(); go(i + 1, s); }; go(0, []); }
LEVELS.forEach((lv, li) => {
  if (only && lv.id[0] !== only) return;
  let line = `L${li + 1} ${lv.id} ${lv.title}: `;
  if (lv.kind === 'pairs') {
    const A = lv.top, edges = lv.edges.map(([a, b]) => [a, A + b]), n = A + lv.bottom;
    const o = orderRows(A, lv.bottom, edges), name = [];
    o.top.forEach((v, k) => name[v] = String.fromCharCode(65 + k)); o.bottom.forEach((v, k) => name[v] = String(k + 1));
    const m = maxMatching(n, edges).length, covers = [];
    subsets([...Array(n).keys()], m, s => { if (!uncovered(edges, s).length) covers.push(s.map(v => name[v]).join('')); });
    const nb = v => edges.filter(e => e.includes(v)).map(e => name[e[0] === v ? e[1] : e[0]]).sort().join('');
    line += `max ${m}, trivial ${lv.trivial.value}; covers ${covers.join(' ')}\n   ` + [...Array(n).keys()].sort((a, b) => name[a] < name[b] ? -1 : 1).map(v => `${name[v]}:${nb(v)}`).join(' ');
  } else if (lv.kind === 'grid') {
    const g = gridGraph(lv.rows), m = maxMatching(g.n, g.edges).length;
    const dark = g.cells.filter(v => (Math.floor(v / g.W) + v % g.W) % 2 === 0).length;
    const ex = konigCover(g.n, g.edges), covers = '?';
    const pic = lv.rows.map((r, y) => r.split('').map((ch, x) => ch === '#' ? '#' : ex.includes(y * g.W + x) ? 'o' : '.').join('')).join(' ');
    line += `max ${m}, trivial ${lv.trivial.value}, dark ${dark}/${g.cells.length}; ${covers} min covers; e.g. ${pic}`;
  } else if (lv.kind === 'pipes') {
    const n = lv.pos.length, { value } = maxFlow(n, lv.edges, 0, n - 1), cuts = [];
    const nm = v => v === 0 ? 'IN' : v === n - 1 ? 'OUT' : String.fromCharCode(64 + v);
    for (let m = 0; m < 1 << lv.edges.length; m++) { const c = []; let cap = 0; lv.edges.forEach((e, i) => { if (m >> i & 1) { c.push(i); cap += e[2]; } }); if (cap === value && !reachable(n, lv.edges, 0, c)[n - 1] && c.every(i => reachable(n, lv.edges, 0, c.filter(j => j !== i))[n - 1])) cuts.push(c.map(i => nm(lv.edges[i][0]) + nm(lv.edges[i][1])).join(',')); }
    line += `max ${value}, trivial ${lv.trivial.value}; min cuts: ${cuts.join(' | ')}`;
  } else {
    const k = minStacks(lv.boxes), anti = [];
    subsets([...Array(lv.boxes.length).keys()], k, s => { if (isMisfitSet(lv.boxes, s)) anti.push(s.map(i => String.fromCharCode(65 + i)).join('')); });
    line += `min stacks ${k}, n ${lv.boxes.length}; max misfit sets: ${anti.join(' ')}`;
  }
  console.log(line);
});
