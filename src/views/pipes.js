import { routeLoad, reachable } from '../core.js';
import { activate, svgEl } from './ui.js';

/** Pipes carry water one way (arrows); each pipe's number is how many units it carries at most.
 *  Build: click junctions from IN to OUT to send one unit along that route. Bound: click pipes to close them until
 *  no water can get from IN to OUT. */
export function mountPipes(el, lv, st, report) {
  const n = lv.pos.length, E = lv.edges, s = 0, t = n - 1;
  st.routes ??= []; st.closed ??= [];
  let mode = 'build', cur = [s], msg = '';
  const narrow = el.clientWidth > 0 && el.clientWidth < 480;
  const W = narrow ? 330 : 560, H = Math.round(W * (narrow ? Math.max(0.8, (lv.aspect || 0.52) * 1.5) : (lv.aspect || 0.52))), pad = narrow ? 28 : 40, R = narrow ? 14 : 17;
  const P = lv.pos.map(([x, y]) => [pad + x * (W - 2 * pad), pad + y * (H - 2 * pad)]);
  const name = v => v === s ? 'IN' : v === t ? 'OUT' : String.fromCharCode(64 + v);
  el.innerHTML = '';
  const svg = svgEl('svg', { class: 'board pipes' + (narrow ? ' narrow' : ''), viewBox: `0 0 ${W} ${H}`, role: 'group', 'aria-label': 'Pipes' });
  const chips = document.createElement('div'); chips.className = 'chips';
  el.append(svg, chips);
  const pipes = E.map(([a, b, c], i) => {
    const [x1, y1] = P[a], [x2, y2] = P[b], d = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / d, uy = (y2 - y1) / d;
    const g = svgEl('g', { class: 'act pipe', 'aria-label': `Pipe ${name(a)} to ${name(b)}, carries up to ${c}` });
    const wpx = narrow ? 2 + 1.5 * c : 3 + 2.2 * c;
    const shell = svgEl('line', { x1, y1, x2, y2, class: 'shell', 'stroke-width': wpx + 3 });
    const water = svgEl('line', { x1, y1, x2, y2, class: 'water', 'stroke-width': 0 });
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const ah = 6 + c * 0.6;
    const arrow = svgEl('path', { class: 'arrow', d: `M${mx + ux * ah},${my + uy * ah} L${mx - ux * ah - uy * ah * 0.6},${my - uy * ah + ux * ah * 0.6} L${mx - ux * ah + uy * ah * 0.6},${my - uy * ah - ux * ah * 0.6}Z` });
    const lx = mx - uy * (wpx / 2 + 11), ly = my + ux * (wpx / 2 + 11);
    const lab = svgEl('text', { x: lx, y: ly, class: 'small' });
    const ct = Math.min(0.5, Math.max(0.3, (R + 14) / d)), cx = x1 + (x2 - x1) * ct, cy = y1 + (y2 - y1) * ct;
    const cross = svgEl('path', { class: 'cross', d: `M${cx - 8},${cy - 8}L${cx + 8},${cy + 8}M${cx + 8},${cy - 8}L${cx - 8},${cy + 8}` });
    const hit = svgEl('line', { x1, y1, x2, y2, class: 'hit' });
    g.append(shell, water, arrow, lab, cross, hit);
    svg.append(g);
    activate(g, () => { if (mode !== 'bound') return; toggle(st.closed, i); draw(); });
    return { g, shell, water, lab, wpx };
  });
  const nodes = P.map(([x, y], v) => {
    const g = svgEl('g', { class: 'act junction' + (v === s || v === t ? ' end' : ''), 'aria-label': `Junction ${name(v)}` });
    const r = v === s || v === t ? R + 6 : R;
    g.append(svgEl('circle', { cx: x, cy: y, r: r + 8, class: 'halo' }), svgEl('circle', { cx: x, cy: y, r, class: 'ring' }));
    const tx = svgEl('text', { x, y, class: v === s || v === t ? 'small' : 'lbl' }); tx.textContent = name(v); g.append(tx);
    svg.append(g);
    activate(g, () => { if (mode === 'build') step(v); });
    return g;
  });

  const loads = routes => routeLoad(E, routes.flatMap(r => Array(r.k).fill(r.path)));
  function step(v) {
    msg = '';
    const k = cur.indexOf(v);
    if (k >= 0) { cur = cur.slice(0, k + 1); return draw(); }
    const u = cur[cur.length - 1], i = E.findIndex(([a, b]) => a === u && b === v);
    if (i < 0) { msg = E.some(([a, b]) => a === v && b === u) ? `That pipe flows from ${name(v)} to ${name(u)}, not the other way.` : `No pipe from ${name(u)} to ${name(v)}.`; return draw(); }
    const used = loads(st.routes)[i] + countStep(cur, u, v);
    if (used >= E[i][2]) { msg = `The pipe ${name(u)}→${name(v)} is full (${E[i][2]}). Take a unit off a route that uses it, or go another way.`; return draw(); }
    cur.push(v);
    if (v === t) {
      const same = st.routes.find(r => r.path.join() === cur.join());
      if (same) same.k++; else st.routes.push({ path: cur, k: 1 });
      cur = [s];
    }
    draw();
  }
  const countStep = (path, u, v) => path.slice(1).filter((w, j) => path[j] === u && w === v).length;
  const fits = routes => loads(routes).every((x, i) => x <= E[i][2]);

  function draw() {
    const load = loads(st.routes), closed = new Set(st.closed), wet = reachable(n, E, s, st.closed);
    const curEdges = new Set(cur.slice(1).map((v, j) => E.findIndex(([a, b]) => a === cur[j] && b === v)));
    pipes.forEach((p, i) => {
      const c = E[i][2];
      p.water.setAttribute('stroke-width', load[i] ? Math.max(2.5, p.wpx * load[i] / c) : 0);
      p.lab.textContent = mode === 'build' ? `${load[i]}/${c}` : String(c);
      p.g.setAttribute('class', 'act pipe' + (closed.has(i) ? ' closed' : '') + (curEdges.has(i) ? ' cur' : '') + (load[i] >= c ? ' full' : '') +
        (mode === 'bound' && !closed.has(i) && wet[E[i][0]] ? ' wet' : ''));
      p.g.setAttribute('tabindex', mode === 'bound' ? '0' : '-1');
      p.g.setAttribute('aria-pressed', String(closed.has(i)));
      p.g.setAttribute('aria-label', `Pipe ${name(E[i][0])} to ${name(E[i][1])}, carries up to ${c}${mode === 'build' ? `, now ${load[i]}` : ''}${closed.has(i) ? ', closed' : ''}`);
    });
    nodes.forEach((g, v) => {
      g.classList.toggle('oncur', mode === 'build' && cur.includes(v) && cur.length > 1);
      g.classList.toggle('wet', mode === 'bound' && wet[v]);
      g.setAttribute('tabindex', mode === 'build' ? '0' : '-1');
    });
    svg.classList.toggle('m-bound', mode === 'bound');
    const total = st.routes.reduce((x, r) => x + r.k, 0);
    chips.innerHTML = '';
    chips.hidden = mode !== 'build' || !st.routes.length;
    st.routes.forEach((r, j) => {
      const c = document.createElement('span'); c.className = 'chip';
      c.innerHTML = `<span>${r.path.map(name).join('→')} ×${r.k}</span>`;
      const minus = document.createElement('button'); minus.textContent = '−'; minus.setAttribute('aria-label', `One unit less along ${r.path.map(name).join(' ')}`);
      minus.onclick = () => { r.k--; if (!r.k) st.routes.splice(j, 1); msg = ''; draw(); };
      const plus = document.createElement('button'); plus.textContent = '+'; plus.setAttribute('aria-label', `One unit more along ${r.path.map(name).join(' ')}`);
      plus.disabled = !fits(st.routes.map(q => q === r ? { ...q, k: q.k + 1 } : q));
      plus.onclick = () => { r.k++; msg = ''; draw(); };
      c.append(minus, plus); chips.append(c);
    });
    let status = '';
    if (mode === 'build') status = msg || (cur.length > 1 ? `Route so far: ${cur.map(name).join('→')}. Keep going to OUT, or click a junction on it to back up.` : '');
    else if (st.closed.length && wet[t]) status = '<span class="bad">Water still reaches OUT</span> through the open pipes (shown blue).';
    report({
      built: total,
      bound: st.closed.length && !wet[t] ? st.closed.reduce((x, i) => x + E[i][2], 0) : null,
      boundProblem: st.closed.length ? 'water still gets through' : null,
      status,
    });
  }
  return {
    setMode(m) { mode = m; msg = ''; cur = [s]; draw(); },
    clear(m) { if (m === 'build') { st.routes = []; cur = [s]; } else st.closed = []; msg = ''; draw(); },
  };
}

function toggle(arr, x) { const k = arr.indexOf(x); if (k >= 0) arr.splice(k, 1); else arr.push(x); }
