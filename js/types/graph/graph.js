// Graphs for the graph question types (graph-search, transitive-closure, floyd-warshall).
// Pure (no DOM); also loaded by tools/grade.mjs.
//
// Problem fields shared by the graph types:
//   "vertices": ["A", "B", ...]   optional: the vertex order (default: as they first appear in the
//                                 edges, sorted). Ties are broken in this order, and for transitive
//                                 closure / Floyd–Warshall it is the numbering v1, v2, ...
//   "edges":    "A-B 4, A-C 2" or ["A-B 4", "A C 2", ["B", "D", 5]]   (a weight is optional)
//   "directed": true | false (default false)
//   "weighted": true | false (default: true when an edge has a weight)
//   "layout":   { "A": [0.1, 0.5], ... }   optional positions in [0, 1] × [0, 1] (default: a circle)
(function (VE) {
'use strict';

const INF = Infinity;

function parseEdge(e, i) {
  if (Array.isArray(e)) {
    const [u, v, w] = e;
    if (u == null || v == null) throw new Error(`edge ${i + 1} must name two vertices`);
    return { u: String(u), v: String(v), w: w == null ? null : Number(w) };
  }
  const m = /^\s*([A-Za-z0-9_]+)\s*(?:->|→|-|–|,|\s)\s*([A-Za-z0-9_]+)\s*(?:[:=(]?\s*(-?\d+(?:\.\d+)?)\s*\)?)?\s*$/.exec(String(e));
  if (!m) throw new Error(`edge "${e}": write it like "A-B" or "A-B 4"`);
  return { u: m[1], v: m[2], w: m[3] == null ? null : Number(m[3]) };
}

/** { V, E: [{u, v, w}], directed, weighted, index: Map(v -> i), out: Map(v -> [{v, w}]) } */
function parseGraph(problem) {
  const raw = typeof problem.edges === 'string' ? problem.edges.split(/[,;\n]+/).filter((x) => x.trim()) : problem.edges;
  if (!Array.isArray(raw) || !raw.length) throw new Error('"edges" must list the edges, e.g. "A-B 4, A-C 2"');
  const E = raw.map(parseEdge);
  const directed = !!problem.directed;
  const weighted = problem.weighted ?? E.some((e) => e.w != null);
  if (weighted && E.some((e) => e.w == null)) throw new Error('every edge needs a weight in a weighted graph');
  for (const e of E) {
    if (e.u === e.v) throw new Error(`edge ${e.u}-${e.v}: no loops`);
    if (!weighted) e.w = 1;
  }
  let V = problem.vertices ? problem.vertices.map(String) : [...new Set(E.flatMap((e) => [e.u, e.v]))].sort(natural);
  const known = new Set(V);
  for (const e of E) for (const x of [e.u, e.v]) if (!known.has(x)) throw new Error(`edge ${e.u}-${e.v}: ${x} is not in "vertices"`);
  if (new Set(V).size !== V.length) throw new Error('the vertices must all be different');
  const index = new Map(V.map((v, i) => [v, i]));
  const seen = new Set();
  for (const e of E) {
    const key = directed ? `${e.u}>${e.v}` : [e.u, e.v].sort().join('-');
    if (seen.has(key)) throw new Error(`edge ${e.u}-${e.v} is listed twice`);
    seen.add(key);
  }
  const out = new Map(V.map((v) => [v, []]));
  for (const e of E) {
    out.get(e.u).push({ v: e.v, w: e.w });
    if (!directed) out.get(e.v).push({ v: e.u, w: e.w });
  }
  for (const list of out.values()) list.sort((a, b) => index.get(a.v) - index.get(b.v));
  return { V, E, directed, weighted, index, out };
}

/** "A" < "B" < ... < "Z", "v2" < "v10" */
function natural(a, b) { return a.localeCompare(b, undefined, { numeric: true }); }

/** Vertex positions in [0, 1]²: the problem's layout, or a circle in vertex order. */
function layout(problem, g) {
  const L = problem.layout || {};
  const n = g.V.length;
  return new Map(g.V.map((v, i) => {
    if (Array.isArray(L[v])) return [v, [Number(L[v][0]), Number(L[v][1])]];
    const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
    return [v, [0.5 + 0.42 * Math.cos(a), 0.5 + 0.42 * Math.sin(a)]];
  }));
}

/** Ties in the vertex order: "alphabetical order" when the vertices are sorted, else the list. */
function orderText(g) {
  const sorted = g.V.every((v, i) => i === 0 || natural(g.V[i - 1], v) < 0);
  return sorted ? 'alphabetical order' : `the order ${g.V.join(', ')}`;
}

const fmt = (x) => (x === INF ? '∞' : String(x));

// ---------- searches -------------------------------------------------------------------------
function bfs(g, s) {
  const d = new Map(g.V.map((v) => [v, INF]));
  const order = [s];
  const steps = [];
  d.set(s, 0);
  const q = [s];
  while (q.length) {
    const u = q.shift();
    const added = [];
    for (const { v } of g.out.get(u)) {
      if (d.get(v) === INF) { d.set(v, d.get(u) + 1); q.push(v); order.push(v); added.push(v); }
    }
    steps.push(`dequeue ${u} (d = ${d.get(u)})` + (added.length ? `: enqueue ${added.join(', ')} (d = ${d.get(u) + 1})` : ': nothing new') + ` — queue: ${q.join(' ') || 'empty'}`);
  }
  return { order, d, steps };
}

function dfs(g, s, restart = true) {
  const d = new Map(), f = new Map();
  const order = [];
  const steps = [];
  let time = 0;
  const visit = (u, depth) => {
    d.set(u, ++time); order.push(u);
    steps.push(`${'  '.repeat(depth)}discover ${u} (d = ${time})`);
    for (const { v } of g.out.get(u)) if (!d.has(v)) visit(v, depth + 1);
    f.set(u, ++time);
    steps.push(`${'  '.repeat(depth)}finish ${u} (f = ${time})`);
  };
  visit(s, 0);
  if (restart) {
    for (const v of g.V) if (!d.has(v)) { steps.push(`restart from ${v}, the first vertex not visited yet`); visit(v, 0); }
  }
  for (const v of g.V) { if (!d.has(v)) { d.set(v, INF); f.set(v, INF); } }
  return { order, d, f, steps };
}

function dijkstra(g, s) {
  if (g.E.some((e) => e.w < 0)) throw new Error("Dijkstra's algorithm needs non-negative weights");
  const d = new Map(g.V.map((v) => [v, INF]));
  const done = new Set();
  const order = [];
  const steps = [];
  d.set(s, 0);
  for (;;) {
    let u = null;
    for (const v of g.V) if (!done.has(v) && d.get(v) < INF && (u == null || d.get(v) < d.get(u))) u = v; // ties: vertex order
    if (u == null) break;
    done.add(u); order.push(u);
    const relax = [];
    for (const { v, w } of g.out.get(u)) {
      if (done.has(v)) continue;
      const nd = d.get(u) + w;
      if (nd < d.get(v)) { relax.push(`${v}: ${fmt(d.get(v))} → ${nd}`); d.set(v, nd); }
    }
    steps.push(`remove ${u} (d = ${d.get(u)})` + (relax.length ? `; relax ${relax.join(', ')}` : '; no update'));
  }
  return { order, d, steps };
}

// ---------- transitive closure (Floyd–Warshall on reachability) --------------------------------
const ek = (u, v) => `${u}>${v}`;
/** The directed edge set of the graph (both directions for an undirected graph). */
function edgeSet(g) {
  const s = new Set();
  for (const e of g.E) { s.add(ek(e.u, e.v)); if (!g.directed) s.add(ek(e.v, e.u)); }
  return s;
}
/** The new edges of iteration k (through vertex V[k-1]) given the current edge set. */
function closureStep(g, edges, k) {
  const via = g.V[k - 1];
  const add = [];
  for (const i of g.V) {
    if (i === via || !edges.has(ek(i, via))) continue;
    for (const j of g.V) {
      if (j === via || j === i || !edges.has(ek(via, j)) || edges.has(ek(i, j))) continue;
      add.push(ek(i, j));
    }
  }
  return add;
}
function closure(g, K) {
  let edges = edgeSet(g);
  const levels = [];
  for (let k = 1; k <= K; k++) {
    const add = closureStep(g, edges, k);
    levels.push(add);
    edges = new Set([...edges, ...add]);
  }
  return levels;
}

// ---------- Floyd–Warshall distances ------------------------------------------------------------
function matrix0(g) {
  const n = g.V.length;
  const D = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 0 : INF)));
  for (const e of g.E) {
    const i = g.index.get(e.u), j = g.index.get(e.v);
    D[i][j] = Math.min(D[i][j], e.w);
    if (!g.directed) D[j][i] = Math.min(D[j][i], e.w);
  }
  return D;
}
/** D(k) from D(k-1): through vertex number k (1-based). Also lists the cells that change. */
function fwStep(D, k) {
  const n = D.length, m = k - 1;
  const N = D.map((r) => r.slice());
  const changes = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const via = D[i][m] + D[m][j];
    if (via < D[i][j]) { N[i][j] = via; changes.push({ i, j, from: D[i][j], to: via, a: D[i][m], b: D[m][j] }); }
  }
  return { D: N, changes };
}

/** Reads a matrix entry typed by a student: a number, or ∞ ("∞", "inf", "oo"). null when invalid. */
function readValue(text) {
  const t = String(text ?? '').trim().toLowerCase();
  if (t === '∞' || t === 'inf' || t === 'infinity' || t === 'oo') return INF;
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  return null;
}

VE.graph = { INF, parseGraph, layout, orderText, natural, fmt, bfs, dfs, dijkstra, edgeSet, closureStep, closure, ek, matrix0, fwStep, readValue };
})(globalThis.VE = globalThis.VE || {});
