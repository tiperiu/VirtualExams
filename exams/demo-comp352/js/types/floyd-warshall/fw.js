// "floyd-warshall" questions: the distance matrix after each of the first iterations.
// Problem fields: the graph fields of graph.js (weighted; "directed": true is the usual case) and
//   "iterations": how many matrices D(1) ... D(k) the student fills (default: min(3, number of vertices))
(function (VE) {
'use strict';
const G = VE.graph;

function solve(problem) {
  const g = G.parseGraph(problem);
  if (!g.weighted) throw new Error('Floyd–Warshall needs a weighted graph');
  const K = problem.iterations ?? Math.min(3, g.V.length);
  if (!Number.isInteger(K) || K < 1 || K > g.V.length) throw new Error(`"iterations" must be a whole number from 1 to ${g.V.length}`);
  const D0 = G.matrix0(g);
  const levels = [];
  let D = D0;
  for (let k = 1; k <= K; k++) { const r = G.fwStep(D, k); levels.push(r); D = r.D; }
  return { g, K, D0, levels };
}

function defaultPrompt(problem) {
  const { g, K } = solve(problem);
  return `<p>Run the <strong>Floyd–Warshall</strong> algorithm on the ${g.directed ? 'directed ' : ''}weighted graph below, with the vertices numbered in the order <strong>${g.V.map((v, i) => `${v} = v${i + 1}`).join(', ')}</strong>. `
    + `D<sup>(0)</sup> is the matrix of edge weights (∞: no edge). Show the matrices <strong>D<sup>(1)</sup> to D<sup>(${K})</sup></strong>: D<sup>(k)</sup>[i][j] = min(D<sup>(k−1)</sup>[i][j], D<sup>(k−1)</sup>[i][k] + D<sup>(k−1)</sup>[k][j]).</p>`;
}

VE.floydWarshall = { solve, defaultPrompt };
})(globalThis.VE = globalThis.VE || {});
