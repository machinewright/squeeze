import { LEVELS } from './src/levels.js';
import { mountPairs } from './src/views/pairs.js';
import { mountGrid } from './src/views/grid.js';
import { mountPipes } from './src/views/pipes.js';
import { mountBoxes } from './src/views/boxes.js';
import { mountHubs } from './src/views/hubs.js';

const VIEWS = { pairs: mountPairs, grid: mountGrid, pipes: mountPipes, boxes: mountBoxes, hubs: mountHubs };
const KEY = 'squeeze.v1';
const $ = id => document.getElementById(id);

function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && Array.isArray(s.solved)) return { solved: s.solved.filter(x => typeof x === 'string') }; } catch { /* ignore */ }
  return { solved: [] };
}
const progress = load();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(progress)); } catch { /* private mode */ } };
const work = new Map(); // level id -> the view's state, kept while the page is open

let cur = 0, view = null, mode = 'build', last = null;

function nav() {
  const el = $('levels'); el.innerHTML = '';
  let ch = null;
  LEVELS.forEach((lv, i) => {
    if (ch !== null && lv.chapter !== ch) { const s = document.createElement('span'); s.className = 'sep'; el.append(s); }
    ch = lv.chapter;
    const b = document.createElement('button');
    b.textContent = i + 1;
    b.title = `${lv.chapter}: ${lv.title}`;
    b.setAttribute('aria-label', `Level ${i + 1}, ${lv.title}${progress.solved.includes(lv.id) ? ', solved' : ''}`);
    if (progress.solved.includes(lv.id)) b.classList.add('solved');
    if (i === cur) b.setAttribute('aria-current', 'true');
    b.onclick = () => open(i);
    el.append(b);
  });
}

function setMode(m) {
  mode = m;
  for (const [id, k] of [['mode-build', 'build'], ['mode-bound', 'bound']]) $(id).setAttribute('aria-checked', String(k === m));
  const lv = LEVELS[cur];
  $('howto').innerHTML = m === 'build' ? lv.howBuild : lv.howBound;
  view.setMode(m);
}

function open(i) {
  cur = i; last = null;
  const lv = LEVELS[i];
  try { history.replaceState(null, '', '#' + (i + 1)); } catch { /* file:// */ }
  $('chapter').textContent = `${lv.chapter}`;
  $('title').textContent = lv.title;
  $('setup').innerHTML = lv.setup;
  $('question').textContent = lv.question;
  $('mode-build').innerHTML = `<span class="sw"></span>${lv.labels.build}`;
  $('mode-bound').innerHTML = `<span class="sw"></span>${lv.labels.bound}`;
  $('mode-build').className = 'mode b-build'; $('mode-bound').className = 'mode b-bound';
  $('hint').hidden = true; $('hint-btn').setAttribute('aria-expanded', 'false');
  $('hint').innerHTML = lv.hint || '';
  $('hint-btn').hidden = !lv.hint;
  $('verdict').innerHTML = ''; $('next-btn').hidden = true;
  if (!work.has(lv.id)) work.set(lv.id, {});
  const stage = $('stage'); stage.innerHTML = '';
  view = VIEWS[lv.kind](stage, lv, work.get(lv.id), report);
  // keep the board still when switching modes: reserve room for the longer instructions
  const h = $('howto'); h.style.minHeight = '';
  let tall = 0; for (const t of [lv.howBuild, lv.howBound]) { h.innerHTML = t; tall = Math.max(tall, h.offsetHeight); }
  h.style.minHeight = tall + 'px';
  setMode('build');
  nav();
}

const plural = (lv, k) => `${k} ${k === 1 ? lv.unit[0] : lv.unit[1]}`;

function report(r) {
  const lv = LEVELS[cur];
  last = r;
  const max = lv.sense === 'max';
  const built = r.built, bound = r.bound;
  const lo = max ? (built ?? 0) : (bound ?? lv.trivial.low);
  const hi = max ? (bound ?? lv.trivial.value) : (built ?? lv.trivial.value);
  const top = lv.trivial.value;
  const met = built !== null && bound !== null && built === bound;
  // meter cells 0..top
  let cells = '';
  for (let k = lv.trivial.low; k <= top; k++) {
    let c = 'cell';
    if (met && k === built) c += ' met';
    else if (k === (max ? built : bound) && (max ? built !== null : bound !== null)) c += max ? ' built' : ' bound';
    else if (k === (max ? bound : built) && (max ? bound !== null : built !== null)) c += max ? ' bound' : ' built';
    else if (k >= lo && k <= hi) c += ' in';
    cells += `<span class="${c}" aria-hidden="true">${k}</span>`;
  }
  const bTxt = built !== null ? `Your answer: ${plural(lv, built)}` : `Your answer: ${r.builtProblem || 'none yet'}`;
  const pTxt = bound !== null ? `Your proof: ${max ? 'at most' : 'at least'} ${bound}` : `Your proof: ${r.boundProblem || 'none yet'}${lv.trivial.text ? ` (${lv.trivial.text})` : ''}`;
  const range = met ? `The answer is exactly ${built}.` : lo === hi ? `` : `The answer is somewhere from ${lo} to ${hi}.`;
  $('meter').innerHTML = `<p class="lab">${met ? 'The answer' : 'The answer could be'}</p><div class="row">${cells}</div><div class="cap"><span class="b1">${bTxt}</span><span class="b2">${pTxt}</span></div><span class="visually-hidden">${range}</span>`;
  $('status').innerHTML = r.status || '';
  if (met) {
    const first = !progress.solved.includes(lv.id);
    if (first) { progress.solved.push(lv.id); save(); nav(); }
    $('verdict').innerHTML = `<p class="solved">Squeezed: the ${max ? 'most' : 'fewest'} is ${built}.</p><p class="why">${lv.why}</p>`;
    $('next-btn').hidden = cur + 1 >= LEVELS.length;
  } else {
    $('verdict').innerHTML = '';
    $('next-btn').hidden = true;
  }
}

$('mode-build').onclick = () => setMode('build');
$('mode-bound').onclick = () => setMode('bound');
for (const id of ['mode-build', 'mode-bound']) $(id).addEventListener('keydown', e => {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) { e.preventDefault(); setMode(mode === 'build' ? 'bound' : 'build'); $(mode === 'build' ? 'mode-build' : 'mode-bound').focus(); }
});
$('clear-btn').onclick = () => view.clear(mode);
$('hint-btn').onclick = () => { const h = $('hint'); h.hidden = !h.hidden; $('hint-btn').setAttribute('aria-expanded', String(!h.hidden)); };
$('next-btn').onclick = () => { open(cur + 1); $('title').scrollIntoView({ block: 'start', behavior: 'smooth' }); };

const fromHash = parseInt(location.hash.slice(1), 10);
const firstOpen = LEVELS.findIndex(lv => !progress.solved.includes(lv.id));
open(fromHash >= 1 && fromHash <= LEVELS.length ? fromHash - 1 : Math.max(0, firstOpen));
void last;
