// "graph-search" questions: BFS, DFS or Dijkstra from a start vertex. Pure; also loaded by grade.mjs.
// Problem fields (besides the graph fields of graph.js):
//   "algorithm": "bfs" | "dfs" | "dijkstra"
//   "start":     the start vertex (default: the first vertex)
//   "restart":   DFS only: when the search from the start ends, continue from the first vertex not
//                visited yet (default true, as in CLRS); false: only the vertices reachable from start
(function (VE) {
'use strict';
const G = VE.graph;
const NAMES = { bfs: 'breadth-first search (BFS)', dfs: 'depth-first search (DFS)', dijkstra: "Dijkstra's algorithm" };

function solve(problem) {
  const algorithm = problem.algorithm ?? 'bfs';
  if (!NAMES[algorithm]) throw new Error('"algorithm" must be "bfs", "dfs" or "dijkstra"');
  const g = G.parseGraph(problem);
  if (algorithm === 'dijkstra' && !g.weighted) throw new Error("Dijkstra's algorithm needs a weighted graph");
  const start = problem.start != null ? String(problem.start) : g.V[0];
  if (!g.index.has(start)) throw new Error(`the start vertex ${start} is not in the graph`);
  const r = algorithm === 'bfs' ? G.bfs(g, start) : algorithm === 'dfs' ? G.dfs(g, start, problem.restart !== false) : G.dijkstra(g, start);
  return { algorithm, g, start, ...r, withF: algorithm === 'dfs' };
}

function orderLabel(algorithm) {
  return algorithm === 'bfs' ? 'Order in which the vertices are added to the queue'
    : algorithm === 'dfs' ? 'Order in which the vertices are discovered'
    : 'Order in which the vertices leave the priority queue (join the cloud)';
}

function defaultPrompt(problem) {
  const s = solve(problem);
  const ties = `When there is a choice, take the vertices in <strong>${G.orderText(s.g)}</strong>.`;
  if (s.algorithm === 'bfs') {
    return `<p>Run <strong>${NAMES.bfs}</strong> on the graph below, starting from <strong>${s.start}</strong>. Give the order in which the vertices are <strong>added to the queue</strong>, and the distance <strong>d</strong> of every vertex (the number of edges from ${s.start}; ∞ if it is never reached). ${ties}</p>`;
  }
  if (s.algorithm === 'dfs') {
    return `<p>Run <strong>${NAMES.dfs}</strong> on the graph below, starting from <strong>${s.start}</strong>, with a clock that starts at 1. Give the order in which the vertices are <strong>discovered</strong>, and for every vertex its discovery time <strong>d</strong> and finishing time <strong>f</strong>. ${ties}`
      + (problem.restart !== false ? ' If vertices are left when the search from the start vertex ends, continue from the first vertex not visited yet.' : '') + '</p>';
  }
  return `<p>Run <strong>${NAMES.dijkstra}</strong> on the graph below, starting from <strong>${s.start}</strong>. Give the order in which the vertices <strong>leave the priority queue</strong> (join the cloud), and the final distance <strong>d</strong> of every vertex (∞ if it cannot be reached). ${ties}</p>`;
}

VE.graphSearch = { NAMES, solve, orderLabel, defaultPrompt };
})(globalThis.VE = globalThis.VE || {});
