import { groupsWithout, hubBound } from '../core.js';
import { activate, svgEl } from './ui.js';

/** Pairs without rows: anyone may pair with anyone they're joined to. Build: click lines to pair.
 *  Bound: pick hubs. Without them, the rest falls into groups; every odd group has someone left over who could
 *  only dance with a hub, and each hub takes at most one of them. */
export function mountHubs(el, lv, st, report) {
  const n = lv.pos.length, edges = lv.edges;
  st.pairs ??= []; st.hubs ??= [];
  const narrow = el.clientWidth > 0 && el.clientWidth < 480;
  const W = narrow ? 330 : 520, H = Math.round(W * (lv.aspect || 0.62)), pad = narrow ? 24 : 34, R = narrow ? 15 : 17;
  const P = lv.pos.map(([x, y]) => [pad + x * (W - 2 * pad), pad + y * (H - 2 * pad)]);
  const name = v => String.fromCharCode(65 + v);
  let mode = 'build';
  el.innerHTML = '';
  const svg = svgEl('svg', { class: 'board hubs', viewBox: `0 0 ${W} ${H}`, role: 'group', 'aria-label': 'People and lines', style: `max-width:${W + 40}px` });
  el.append(svg);
  const lines = edges.map(([a, b], i) => {
    const g = svgEl('g', { class: 'act line', 'aria-label': `Pair ${name(a)} with ${name(b)}` });
    const [x1, y1] = P[a], [x2, y2] = P[b];
    const vis = svgEl('line', { x1, y1, x2, y2, class: 'ln' }), hit = svgEl('line', { x1, y1, x2, y2, class: 'hit' });
    g.append(vis, hit); svg.append(g);
    activate(g, () => {
      if (mode !== 'build') return;
      const k = st.pairs.indexOf(i);
      if (k >= 0) st.pairs.splice(k, 1);
      else { st.pairs = st.pairs.filter(j => !edges[j].includes(a) && !edges[j].includes(b)); st.pairs.push(i); }
      draw();
    });
    return { g, vis };
  });
  const nodes = P.map(([x, y], v) => {
    const g = svgEl('g', { class: 'act node' });
    g.append(svgEl('circle', { cx: x, cy: y, r: R + 6, class: 'halo' }), svgEl('circle', { cx: x, cy: y, r: R, class: 'ring' }));
    const t = svgEl('text', { x, y, class: 'lbl' }); t.textContent = name(v); g.append(t);
    svg.append(g);
    activate(g, () => { if (mode !== 'bound') return; const k = st.hubs.indexOf(v); if (k >= 0) st.hubs.splice(k, 1); else st.hubs.push(v); draw(); });
    return g;
  });
  const badges = svgEl('g'); svg.append(badges);

  function draw() {
    const pairSet = new Set(st.pairs), hubs = new Set(st.hubs);
    const groups = groupsWithout(n, edges, st.hubs), odd = groups.filter(g => g.length % 2);
    const oddOf = new Map(); odd.forEach((g, k) => g.forEach(v => oddOf.set(v, k)));
    lines.forEach(({ g, vis }, i) => {
      const [a, b] = edges[i], cut = hubs.has(a) || hubs.has(b);
      vis.setAttribute('class', 'ln' + (pairSet.has(i) ? ' paired' : '') + (mode === 'bound' && cut ? ' covered' : ''));
      g.setAttribute('tabindex', mode === 'build' ? '0' : '-1');
      g.setAttribute('aria-pressed', String(pairSet.has(i)));
    });
    nodes.forEach((g, v) => {
      g.classList.toggle('marked', hubs.has(v));
      g.classList.toggle('inpair', st.pairs.some(i => edges[i].includes(v)));
      g.classList.toggle('odd', mode === 'bound' && st.hubs.length > 0 && oddOf.has(v));
      g.setAttribute('tabindex', mode === 'bound' ? '0' : '-1');
      g.setAttribute('aria-pressed', String(hubs.has(v)));
      const grp = groups.find(gr => gr.includes(v));
      g.setAttribute('aria-label', `Person ${name(v)}${hubs.has(v) ? ', hub' : st.hubs.length ? `, in a group of ${grp.length}` : ''}`);
    });
    svg.classList.toggle('m-bound', mode === 'bound');
    // a size badge on each odd group, near its middle
    let bh = '';
    if (mode === 'bound' && st.hubs.length) for (const g of odd) {
      const cx = g.reduce((s, v) => s + P[v][0], 0) / g.length, cy = g.reduce((s, v) => s + P[v][1], 0) / g.length;
      const [x, y] = g.length === 1 ? [P[g[0]][0] + R + 4, P[g[0]][1] - R - 2] : [cx, cy];
      bh += `<g class="badge"><circle cx="${x}" cy="${y}" r="10"/><text x="${x}" y="${y}" class="small">${g.length}</text></g>`;
    }
    badges.innerHTML = bh;
    const left = Math.max(0, odd.length - st.hubs.length);
    const bound = st.hubs.length ? hubBound(n, edges, st.hubs) : null;
    const sizes = odd.map(g => g.length).sort((a, b) => b - a).join(', ');
    report({
      built: st.pairs.length,
      bound,
      status: mode === 'bound' && st.hubs.length
        ? `Without the hubs: ${odd.length} odd group${odd.length === 1 ? '' : 's'}${odd.length ? ` (${sizes})` : ''} and ${st.hubs.length} hub${st.hubs.length === 1 ? '' : 's'}, so at least ${left} ${left === 1 ? 'person dances' : 'people dance'} with nobody: at most (${n} − ${left}) ÷ 2${(n - left) % 2 ? ', rounded down,' : ''} = ${bound} pairs.`
        : '',
    });
  }
  return {
    setMode(m) { mode = m; draw(); },
    clear(m) { if (m === 'build') st.pairs = []; else st.hubs = []; draw(); },
  };
}
