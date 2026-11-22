// Pure logic: the exact answers, and the checks for what the player builds.
// Every level's answer comes from these functions, and tests check them against brute force.

/** Maximum matching in a bipartite graph. Nodes 0..n-1, edges [a, b] with a on one side and b on the other.
 *  Returns the matched edges as indices into `edges`. */
export function maxMatching(n, edges) {
  const adj = Array.from({ length: n }, () => []);
  edges.forEach(([a, b], i) => { adj[a].push([b, i]); adj[b].push([a, i]); });
  const left = sideOf(n, edges);
  const mate = new Array(n).fill(-1), via = new Array(n).fill(-1);
  function augment(u, seen) {
    for (const [v, i] of adj[u]) {
      if (seen[v]) continue;
      seen[v] = true;
      if (mate[v] < 0 || augment(mate[v], seen)) { mate[u] = v; mate[v] = u; via[u] = i; via[v] = i; return true; }
    }
    return false;
  }
  for (let u = 0; u < n; u++) if (left[u] && mate[u] < 0) augment(u, new Array(n).fill(false));
  const out = [];
  for (let u = 0; u < n; u++) if (left[u] && mate[u] >= 0) out.push(via[u]);
  return out;
}

/** 2-colours a bipartite graph: true for the side of each component's first node. Throws if not bipartite. */
export function sideOf(n, edges) {
  const adj = Array.from({ length: n }, () => []);
  for (const [a, b] of edges) { adj[a].push(b); adj[b].push(a); }
  const side = new Array(n).fill(null);
  for (let s = 0; s < n; s++) {
    if (side[s] !== null) continue;
    side[s] = true;
    const q = [s];
    while (q.length) {
      const u = q.pop();
      for (const v of adj[u]) {
        if (side[v] === null) { side[v] = !side[u]; q.push(v); }
        else if (side[v] === side[u]) throw new Error('not bipartite');
      }
    }
  }
  return side;
}

/** Chosen edge indices form a matching: no node in two of them. */
export function isMatching(edges, chosen) {
  const used = new Set();
  for (const i of chosen) for (const v of edges[i]) { if (used.has(v)) return false; used.add(v); }
  return true;
}

/** Edges (indices) that touch no marked node. A cover is a marking with none. */
export function uncovered(edges, marked) {
  const m = new Set(marked);
  return edges.map((e, i) => i).filter(i => !m.has(edges[i][0]) && !m.has(edges[i][1]));
}

/** Maximum flow from s to t. Edges [a, b, cap], directed. Returns { value, flow } with flow per edge. */
export function maxFlow(n, edges, s, t) {
  // residual graph with paired arcs
  const head = [], cap = [], to = [], adj = Array.from({ length: n }, () => []);
  edges.forEach(([a, b, c]) => {
    adj[a].push(to.length); to.push(b); cap.push(c);
    adj[b].push(to.length); to.push(a); cap.push(0);
  });
  let value = 0;
  for (;;) {
    const prev = new Array(n).fill(-1); prev[s] = -2;
    const q = [s];
    while (q.length && prev[t] === -1) {
      const u = q.shift();
      for (const k of adj[u]) if (cap[k] > 0 && prev[to[k]] === -1) { prev[to[k]] = k; q.push(to[k]); }
    }
    if (prev[t] === -1) break;
    let f = Infinity;
    for (let v = t; v !== s; v = to[prev[v] ^ 1]) f = Math.min(f, cap[prev[v]]);
    for (let v = t; v !== s; v = to[prev[v] ^ 1]) { cap[prev[v]] -= f; cap[prev[v] ^ 1] += f; }
    value += f;
  }
  void head;
  return { value, flow: edges.map((e, i) => cap[2 * i + 1]) };
}

/** Load on each edge from a list of routes (each a node list). Returns null if a step isn't an edge. */
export function routeLoad(edges, routes) {
  const load = new Array(edges.length).fill(0);
  for (const r of routes) for (let k = 1; k < r.length; k++) {
    const i = edges.findIndex(([a, b]) => a === r[k - 1] && b === r[k]);
    if (i < 0) return null;
    load[i]++;
  }
  return load;
}

/** Routes are valid when each runs s..t along edges and no edge carries more than its capacity. */
export function routesValid(edges, routes, s, t) {
  if (routes.some(r => r[0] !== s || r[r.length - 1] !== t)) return false;
  const load = routeLoad(edges, routes);
  return !!load && load.every((x, i) => x <= edges[i][2]);
}

/** Nodes reachable from s using edges not in `closed` (edge indices). */
export function reachable(n, edges, s, closed) {
  const shut = new Set(closed), seen = new Array(n).fill(false), q = [s];
  seen[s] = true;
  while (q.length) {
    const u = q.pop();
    edges.forEach(([a, b], i) => { if (a === u && !shut.has(i) && !seen[b]) { seen[b] = true; q.push(b); } });
  }
  return seen;
}

/** Box a fits strictly inside box b (both sides smaller). */
export const fits = (a, b) => a[0] < b[0] && a[1] < b[1];
export const nests = (a, b) => fits(a, b) || fits(b, a);

/** Fewest stacks (chains) covering all boxes: Dilworth via matching (n minus a maximum matching of the
 *  "fits directly or indirectly into" relation, which is transitive here). */
export function minStacks(boxes) {
  const n = boxes.length, edges = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (fits(boxes[i], boxes[j])) edges.push([i, n + j]);
  return n - maxMatching(2 * n, edges).length;
}

/** A set of boxes in which no box fits in another. */
export const isMisfitSet = (boxes, set) => set.every((i, k) => set.slice(k + 1).every(j => !nests(boxes[i], boxes[j])));

/** A stack is valid when its boxes can be ordered so each fits in the next, i.e. every pair nests. */
export const isStack = (boxes, set) => isMisfitPairs(boxes, set) === 0;
function isMisfitPairs(boxes, set) {
  let bad = 0;
  set.forEach((i, k) => set.slice(k + 1).forEach(j => { if (!nests(boxes[i], boxes[j])) bad++; }));
  return bad;
}

/** Largest set of boxes with no two nesting (by Dilworth it equals minStacks; computed independently by brute force
 *  for tests, so keep n small there). */
export function maxMisfitsBrute(boxes) {
  const n = boxes.length; let best = 0;
  for (let m = 0; m < 1 << n; m++) {
    const set = []; for (let i = 0; i < n; i++) if (m >> i & 1) set.push(i);
    if (set.length > best && isMisfitSet(boxes, set)) best = set.length;
  }
  return best;
}

/** Grid helpers for domino boards. A board is an array of strings, '.' free, '#' hole. Cells numbered r*W+c. */
export function gridGraph(rows) {
  const H = rows.length, W = rows[0].length, cells = [], edges = [];
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (rows[r][c] === '.') cells.push(r * W + c);
  const free = new Set(cells);
  for (const v of cells) {
    const r = Math.floor(v / W), c = v % W;
    if (c + 1 < W && free.has(v + 1)) edges.push([v, v + 1]);
    if (r + 1 < H && free.has(v + W)) edges.push([v, v + W]);
  }
  return { H, W, n: H * W, cells, edges };
}

/** A smallest cover (König's construction from a maximum matching): left nodes not reached by alternating paths
 *  from unmatched left nodes, plus right nodes that are reached. */
export function konigCover(n, edges) {
  const left = sideOf(n, edges), M = maxMatching(n, edges), mate = new Array(n).fill(-1);
  for (const i of M) { const [a, b] = edges[i]; mate[a] = b; mate[b] = a; }
  const adj = Array.from({ length: n }, () => []);
  for (const [a, b] of edges) { adj[a].push(b); adj[b].push(a); }
  const seen = new Array(n).fill(false), q = [];
  for (let u = 0; u < n; u++) if (left[u] && mate[u] < 0 && adj[u].length) { seen[u] = true; q.push(u); }
  while (q.length) {
    const u = q.pop();
    for (const v of adj[u]) if (!seen[v]) { seen[v] = true; if (mate[v] >= 0 && !seen[mate[v]]) { seen[mate[v]] = true; q.push(mate[v]); } }
  }
  const cover = [];
  for (let v = 0; v < n; v++) if (adj[v].length && (left[v] ? !seen[v] : seen[v])) cover.push(v);
  return cover;
}
