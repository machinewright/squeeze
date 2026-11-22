import { isMatching, uncovered } from '../core.js';
import { activate, svgEl } from './ui.js';

/** Two rows of people; a line joins two people who could be a pair. Build: click lines to pair. Bound: click people
 *  to mark them so every line touches a marked person. */
export function mountPairs(el, lv, st, report) {
  const A = lv.top, B = lv.bottom, n = A + B, edges = lv.edges.map(([a, b]) => [a, A + b]);
  st.pairs ??= []; st.marks ??= [];
  const order = orderRows(A, B, edges);
  const narrow = el.clientWidth > 0 && el.clientWidth < 480;
  const W = narrow ? 330 : 560, H = narrow ? 230 : 250, pad = narrow ? 24 : 40;
  const pos = new Array(n);
  order.top.forEach((v, k) => { pos[v] = [pad + (W - 2 * pad) * (A === 1 ? 0.5 : k / (A - 1)), 40]; });
  order.bottom.forEach((v, k) => { pos[v] = [pad + (W - 2 * pad) * (B === 1 ? 0.5 : k / (B - 1)), H - 40]; });
  const name = new Array(n);
  order.top.forEach((v, k) => { name[v] = String.fromCharCode(65 + k); });
  order.bottom.forEach((v, k) => { name[v] = String(k + 1); });
  const R = narrow ? 15 : 18;
  el.innerHTML = '';
  const svg = svgEl('svg', { class: 'board', viewBox: `0 0 ${W} ${H}`, role: 'group', 'aria-label': 'People and lines' });
  el.append(svg);
  const lines = edges.map(([a, b], i) => {
    const g = svgEl('g', { class: 'act line', 'aria-label': `Pair ${name[a]} with ${name[b]}` });
    const [x1, y1] = pos[a], [x2, y2] = pos[b];
    const vis = svgEl('line', { x1, y1, x2, y2, class: 'ln' }), hit = svgEl('line', { x1, y1, x2, y2, class: 'hit' });
    g.append(vis, hit); svg.append(g);
    activate(g, () => { if (mode !== 'build') return; togglePair(i); });
    return { g, vis };
  });
  const nodes = [...Array(n).keys()].map(v => {
    const g = svgEl('g', { class: 'act node', tabindex: '0', 'aria-label': `Person ${name[v]}` });
    const [x, y] = pos[v];
    g.append(svgEl('circle', { cx: x, cy: y, r: R + 6, class: 'halo' }), svgEl('circle', { cx: x, cy: y, r: R, class: 'ring' }));
    const t = svgEl('text', { x, y, class: 'lbl' }); t.textContent = name[v]; g.append(t);
    svg.append(g);
    activate(g, () => { if (mode === 'bound') { toggle(st.marks, v); draw(); } else pick(v); });
    return g;
  });
  let mode = 'build';

  let sel = -1, msg = '';
  const nm = v => name[v];
  function togglePair(i) {
    sel = -1; msg = '';
    const k = st.pairs.indexOf(i);
    if (k >= 0) st.pairs.splice(k, 1);
    else {
      const [a, b] = edges[i];
      const broken = st.pairs.filter(j => edges[j].includes(a) || edges[j].includes(b));
      if (broken.length) msg = `Broke up ${broken.map(j => edges[j].map(nm).join('–')).join(' and ')} to pair ${nm(a)}–${nm(b)}.`;
      st.pairs = st.pairs.filter(j => !broken.includes(j));
      st.pairs.push(i);
    }
    draw();
  }
  function pick(v) {
    if (sel < 0 || sel === v) { sel = sel === v ? -1 : v; msg = sel >= 0 ? `${nm(v)} selected: now tap someone joined to ${nm(v)} by a line.` : ''; return draw(); }
    const i = edges.findIndex(e => e.includes(sel) && e.includes(v));
    if (i < 0) { sel = v; msg = `${nm(v)} selected: now tap someone joined to ${nm(v)} by a line.`; return draw(); }
    togglePair(i);
  }

  function draw() {
    const open = new Set(uncovered(edges, st.marks)), pairSet = new Set(st.pairs), marks = new Set(st.marks);
    lines.forEach(({ g, vis }, i) => {
      vis.setAttribute('class', 'ln' + (pairSet.has(i) ? ' paired' : '') + (mode === 'bound' && open.has(i) ? ' open' : '') + (mode === 'bound' && !open.has(i) ? ' covered' : ''));
      g.setAttribute('tabindex', mode === 'build' ? '0' : '-1');
      g.setAttribute('aria-pressed', String(pairSet.has(i)));
    });
    nodes.forEach((g, v) => {
      g.classList.toggle('marked', marks.has(v));
      g.classList.toggle('inpair', st.pairs.some(i => edges[i].includes(v)));
      g.classList.toggle('sel', mode === 'build' && v === sel);
      g.setAttribute('aria-pressed', String(mode === 'bound' ? marks.has(v) : v === sel));
    });
    svg.classList.toggle('m-bound', mode === 'bound');
    const ok = isMatching(edges, st.pairs);
    report({
      built: ok ? st.pairs.length : null,
      bound: open.size === 0 && st.marks.length ? st.marks.length : null,
      boundProblem: st.marks.length ? `${open.size} line${open.size === 1 ? '' : 's'} touch no marked person` : null,
      status: mode === 'build' ? msg : st.marks.length && open.size ? `<span class="bad">${open.size} line${open.size === 1 ? '' : 's'}</span> still touch${open.size === 1 ? 'es' : ''} no marked person (shown in red).` : '',
    });
  }
  return {
    setMode(m) { mode = m; sel = -1; msg = ''; draw(); },
    clear(m) { if (m === 'build') st.pairs = []; else st.marks = []; draw(); },
  };
}

function toggle(arr, x) { const k = arr.indexOf(x); if (k >= 0) arr.splice(k, 1); else arr.push(x); }

/** Order each row by the average position of its neighbours (a few rounds), to cut down crossings. */
export function orderRows(A, B, edges) {
  let top = [...Array(A).keys()], bottom = [...Array(B).keys()].map(j => A + j);
  const nb = v => edges.filter(e => e.includes(v)).map(e => e[0] === v ? e[1] : e[0]);
  const crossings = () => {
    const p = new Map(); top.forEach((v, k) => p.set(v, k)); bottom.forEach((v, k) => p.set(v, k));
    let c = 0;
    for (let i = 0; i < edges.length; i++) for (let j = i + 1; j < edges.length; j++) {
      const [a, b] = edges[i], [x, y] = edges[j];
      if ((p.get(a) - p.get(x)) * (p.get(b) - p.get(y)) < 0) c++;
    }
    return c;
  };
  let best = [top.slice(), bottom.slice()], bc = crossings();
  for (let round = 0; round < 8; round++) {
    const bp = new Map(bottom.map((v, k) => [v, k]));
    top.sort((u, v) => avg(nb(u).map(w => bp.get(w))) - avg(nb(v).map(w => bp.get(w))) || u - v);
    const tp = new Map(top.map((v, k) => [v, k]));
    bottom.sort((u, v) => avg(nb(u).map(w => tp.get(w))) - avg(nb(v).map(w => tp.get(w))) || u - v);
    const c = crossings();
    if (c < bc) { bc = c; best = [top.slice(), bottom.slice()]; }
  }
  return { top: best[0], bottom: best[1] };
}
const avg = xs => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
