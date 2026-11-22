import { gridGraph, uncovered } from '../core.js';

/** A board with holes. Build: tap a square, then a neighbouring square, to lay a domino (tap a domino to lift it).
 *  Bound: tap squares to mark them so every two neighbouring free squares include a marked one. */
export function mountGrid(el, lv, st, report) {
  const g = gridGraph(lv.rows), { W, H } = g;
  st.doms ??= []; st.marks ??= [];
  let mode = 'build', sel = -1;
  const narrow = el.clientWidth > 0 && el.clientWidth < 480, S = narrow ? 40 : 46;
  el.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'grid';
  grid.style.gridTemplateColumns = `repeat(${W}, ${S}px)`;
  grid.setAttribute('role', 'grid'); grid.setAttribute('aria-label', `Board, ${H} rows by ${W} columns`);
  const tools = document.createElement('div'); tools.className = 'palette';
  for (const [label, c] of [['Mark every dark square', 0], ['Mark every light square', 1]]) {
    const b = document.createElement('button'); b.textContent = label;
    b.onclick = () => { st.marks = g.cells.filter(v => (Math.floor(v / W) + v % W) % 2 === c); draw(); };
    tools.append(b);
  }
  el.append(tools, grid);
  const name = v => `row ${Math.floor(v / W) + 1}, column ${v % W + 1}`;
  const sq = [];
  for (let v = 0; v < W * H; v++) {
    const hole = lv.rows[Math.floor(v / W)][v % W] !== '.';
    const b = document.createElement(hole ? 'div' : 'button');
    b.className = 'sq ' + (hole ? 'hole' : (Math.floor(v / W) + v % W) % 2 ? 'light' : 'dark');
    b.setAttribute('aria-label', hole ? `${name(v)}, hole` : name(v));
    if (!hole) b.onclick = () => tap(v);
    if (!hole) b.addEventListener('keydown', e => {
      const d = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -W, ArrowDown: W }[e.key];
      if (d === undefined) return;
      e.preventDefault();
      let u = v + d;
      while (u >= 0 && u < W * H && !(Math.abs(d) === 1 && Math.floor(u / W) !== Math.floor(v / W)) && !(sq[u] instanceof HTMLButtonElement)) u += d;
      if (u >= 0 && u < W * H && sq[u] instanceof HTMLButtonElement && !(Math.abs(d) === 1 && Math.floor(u / W) !== Math.floor(v / W))) sq[u].focus();
    });
    sq.push(b); grid.append(b);
  }
  const layer = document.createElement('div'); layer.style.cssText = 'position:absolute;inset:0;pointer-events:none';
  grid.append(layer);
  const adj = (a, b) => g.edges.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

  function tap(v) {
    if (mode === 'bound') { toggle(st.marks, v); draw(); return; }
    const d = st.doms.findIndex(p => p.includes(v));
    if (sel < 0) {
      if (d >= 0) { st.doms.splice(d, 1); sel = -1; } else sel = v;
    } else if (sel === v) sel = -1;
    else if (adj(sel, v)) {
      st.doms = st.doms.filter(p => !p.includes(v) && !p.includes(sel));
      st.doms.push([sel, v]); sel = -1;
    } else sel = d >= 0 ? -1 : v;
    draw();
  }

  function draw() {
    const marks = new Set(st.marks), open = uncovered(g.edges, st.marks);
    sq.forEach((b, v) => {
      if (!(b instanceof HTMLButtonElement)) return;
      b.classList.toggle('sel', v === sel && mode === 'build');
      b.classList.toggle('mark', marks.has(v));
      const inDom = st.doms.some(p => p.includes(v));
      b.setAttribute('aria-label', `${name(v)}${inDom ? ', covered by a domino' : ''}${marks.has(v) ? ', marked' : ''}${v === sel ? ', selected' : ''}`);
    });
    grid.classList.toggle('faint', mode === 'bound');
    tools.hidden = mode !== 'bound' || lv.shortcuts === false;
    const box = v => { const b = sq[v]; return [b.offsetLeft, b.offsetTop, b.offsetWidth, b.offsetHeight]; };
    let html = '';
    for (const [a, b] of st.doms) {
      const [x1, y1, w, h] = box(Math.min(a, b)), [x2, y2] = box(Math.max(a, b));
      html += `<div class="dom" style="left:${x1 + 4}px;top:${y1 + 4}px;width:${x2 - x1 + w - 8}px;height:${y2 - y1 + h - 8}px"></div>`;
    }
    for (const v of st.marks) { const [x, y, w, h] = box(v); html += `<div class="dot" style="left:${x + w / 2 - 9}px;top:${y + h / 2 - 9}px"></div>`; }
    if (mode === 'bound' && st.marks.length) for (const i of open) {
      const [a, b] = g.edges[i], [x1, y1, w, h] = box(a), [x2, y2] = box(b);
      html += x2 > x1
        ? `<div class="gap" style="left:${x2 - 3}px;top:${y1 + h / 2 - 9}px;width:6px;height:18px"></div>`
        : `<div class="gap" style="left:${x1 + w / 2 - 9}px;top:${y2 - 3}px;width:18px;height:6px"></div>`;
    }
    layer.innerHTML = html;
    report({
      built: st.doms.length,
      bound: open.length === 0 && st.marks.length ? st.marks.length : null,
      boundProblem: st.marks.length ? `${open.length} neighbouring pair${open.length === 1 ? '' : 's'} with no mark` : null,
      status: mode === 'bound' && st.marks.length && open.length ? `<span class="bad">${open.length} pair${open.length === 1 ? '' : 's'}</span> of neighbouring squares still ha${open.length === 1 ? 's' : 've'} no mark (red bars).` : '',
    });
  }
  // dominoes are positioned from layout, so redraw on resize
  addEventListener('resize', () => { if (grid.isConnected) draw(); });
  return {
    setMode(m) { mode = m; sel = -1; draw(); },
    clear(m) { if (m === 'build') st.doms = []; else st.marks = []; sel = -1; draw(); },
  };
}

function toggle(arr, x) { const k = arr.indexOf(x); if (k >= 0) arr.splice(k, 1); else arr.push(x); }
