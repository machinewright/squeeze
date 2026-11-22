const NS = 'http://www.w3.org/2000/svg';

export function svgEl(tag, attrs = {}) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

/** Click, Enter and Space all trigger `fn`. The element gets role=button. */
export function activate(el, fn) {
  el.setAttribute('role', 'button');
  el.addEventListener('click', e => { e.preventDefault(); fn(); });
  el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } });
}
