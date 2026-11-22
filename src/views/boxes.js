import { fits, nests } from '../core.js';
import { activate, svgEl } from './ui.js';

export const STACK_COLOURS = ['#c98a2b', '#4f9a5f', '#8a5cc2', '#d0533f', '#2a9d9b', '#b5527f'];

/** Boxes drawn from a shared corner, so box P fits in box Q exactly when P's far corner lies inside Q.
 *  Build: pick a stack, click boxes to put them in it. Bound: mark boxes no two of which fit one inside the other. */
export function mountBoxes(el, lv, st, report) {
  const B = lv.boxes, n = B.length, M = lv.size || 12;
  st.stack ??= new Array(n).fill(-1); st.marks ??= [];
  let mode = 'build', pen = 0;
  const narrow = el.clientWidth > 0 && el.clientWidth < 480;
  const W = narrow ? 320 : 420, pad = 30, U = (W - pad - 14) / M;
  const X = x => pad + x * U, Y = y => W - pad - y * U;
  const name = i => String.fromCharCode(65 + i);
  el.innerHTML = '';
  const pal = document.createElement('div'); pal.className = 'palette'; pal.setAttribute('role', 'radiogroup'); pal.setAttribute('aria-label', 'Stack to put boxes in');
  const svg = svgEl('svg', { class: 'board boxes', viewBox: `0 0 ${W} ${W}`, role: 'group', 'aria-label': 'Boxes', style: `max-width:${W}px` });
  el.append(pal, svg);
  const K = Math.min(STACK_COLOURS.length, lv.stacks || 6);
  const penBtns = [...Array(K).keys()].map(k => {
    const b = document.createElement('button'); b.setAttribute('role', 'radio');
    b.innerHTML = `<span class="dot" style="background:${STACK_COLOURS[k]}"></span>Stack ${k + 1}`;
    b.onclick = () => { pen = k; draw(); };
    pal.append(b); return b;
  });
  // axes
  svg.append(svgEl('line', { x1: X(0), y1: Y(0), x2: X(M), y2: Y(0), class: 'axis' }), svgEl('line', { x1: X(0), y1: Y(0), x2: X(0), y2: Y(M), class: 'axis' }));
  const ax = svgEl('text', { x: X(M / 2), y: Y(0) + 18, class: 'small' }); ax.textContent = 'width →';
  const ay = svgEl('text', { x: X(0) - 16, y: Y(M / 2), class: 'small', transform: `rotate(-90 ${X(0) - 16} ${Y(M / 2)})` }); ay.textContent = 'height →';
  svg.append(ax, ay);
  const rects = B.map(([w, h]) => { const r = svgEl('rect', { x: X(0), y: Y(h), width: w * U, height: h * U, class: 'box' }); svg.append(r); return r; });
  const links = svgEl('g'), clash = svgEl('g');
  svg.append(links, clash);
  const handles = B.map(([w, h], i) => {
    const g = svgEl('g', { class: 'act handle', 'aria-label': `Box ${name(i)}, ${w} wide, ${h} high` });
    g.append(svgEl('circle', { cx: X(w), cy: Y(h), r: 19, class: 'halo' }), svgEl('circle', { cx: X(w), cy: Y(h), r: 12, class: 'ring' }));
    const t = svgEl('text', { x: X(w), y: Y(h), class: 'lbl' }); t.textContent = name(i); g.append(t);
    svg.append(g);
    activate(g, () => {
      if (mode === 'build') st.stack[i] = st.stack[i] === pen ? -1 : pen;
      else toggle(st.marks, i);
      draw();
    });
    return g;
  });

  function draw() {
    penBtns.forEach((b, k) => { b.setAttribute('aria-checked', String(k === pen)); b.style.boxShadow = k === pen ? `inset 0 0 0 2px ${STACK_COLOURS[k]}` : ''; });
    pal.hidden = mode !== 'build';
    const marks = new Set(st.marks);
    let lk = '', badStack = null;
    for (let k = 0; k < K; k++) {
      const members = B.map((b, i) => i).filter(i => st.stack[i] === k).sort((a, b) => B[a][0] - B[b][0]);
      for (let j = 1; j < members.length; j++) {
        const a = members[j - 1], b = members[j], ok = fits(B[a], B[b]);
        if (!ok && !badStack) badStack = [k, a, b];
        lk += `<line x1="${X(B[a][0])}" y1="${Y(B[a][1])}" x2="${X(B[b][0])}" y2="${Y(B[b][1])}" stroke="${STACK_COLOURS[k]}" class="chain${ok ? '' : ' broken'}"/>`;
      }
    }
    links.innerHTML = lk;
    let bad = null, ck = '';
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) if (marks.has(a) && marks.has(b) && nests(B[a], B[b])) {
      if (!bad) bad = [a, b];
      ck += `<line x1="${X(B[a][0])}" y1="${Y(B[a][1])}" x2="${X(B[b][0])}" y2="${Y(B[b][1])}" class="clash"/>`;
    }
    clash.innerHTML = mode === 'bound' ? ck : '';
    links.style.opacity = mode === 'bound' ? 0.3 : 1;
    rects.forEach((r, i) => {
      const k = st.stack[i];
      r.style.stroke = mode === 'build' && k >= 0 ? STACK_COLOURS[k] : '';
      r.classList.toggle('instack', mode === 'build' && k >= 0);
    });
    handles.forEach((g, i) => {
      const k = st.stack[i];
      g.querySelector('.ring').style.fill = k >= 0 ? STACK_COLOURS[k] : '';
      g.classList.toggle('instack', k >= 0);
      g.classList.toggle('marked', marks.has(i));
      g.classList.toggle('m-bound', mode === 'bound');
      g.setAttribute('aria-pressed', String(mode === 'build' ? k === pen : marks.has(i)));
      g.setAttribute('aria-label', `Box ${name(i)}, ${B[i][0]} wide, ${B[i][1]} high${k >= 0 ? `, in stack ${k + 1}` : ''}${marks.has(i) ? ', marked' : ''}`);
    });
    svg.classList.toggle('m-bound', mode === 'bound');
    const used = new Set(st.stack.filter(k => k >= 0)).size, alone = st.stack.filter(k => k < 0).length;
    const fmt = ([a, b]) => { const [p, q] = fits(B[a], B[b]) ? [a, b] : [b, a]; return `${name(p)} fits inside ${name(q)}`; };
    let status = '';
    if (mode === 'build') status = badStack ? `<span class="bad">Stack ${badStack[0] + 1} doesn't stack:</span> neither of ${name(badStack[1])} and ${name(badStack[2])} fits inside the other.` : alone && used ? `Boxes in no stack count as a stack of one each (${alone} now).` : '';
    else if (bad) status = `<span class="bad">${fmt(bad)}</span>, so those two could share a stack. Marked boxes must be ones that never fit together.`;
    report({
      built: badStack ? null : used + alone,
      builtProblem: badStack ? `stack ${badStack[0] + 1} doesn't stack` : null,
      bound: st.marks.length && !bad ? st.marks.length : null,
      boundProblem: bad ? 'two marked boxes fit together' : null,
      status,
    });
  }
  return {
    setMode(m) { mode = m; draw(); },
    clear(m) { if (m === 'build') st.stack.fill(-1); else st.marks = []; draw(); },
  };
}

function toggle(arr, x) { const k = arr.indexOf(x); if (k >= 0) arr.splice(k, 1); else arr.push(x); }
