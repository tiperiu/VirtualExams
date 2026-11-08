// "transitive-closure" questions: the Floyd–Warshall transitive closure, one iteration at a time.
// Iteration k adds an edge i → j whenever i → v_k and v_k → j are edges and i → j is not (i ≠ j).
// Problem fields: the graph fields of graph.js ("directed": true is the usual case) and
//   "iterations": how many iterations the student shows (default: min(4, number of vertices))
(function (VE) {
'use strict';
const G = VE.graph;

function solve(problem) {
  const g = G.parseGraph(problem);
  const K = problem.iterations ?? Math.min(4, g.V.length);
  if (!Number.isInteger(K) || K < 1 || K > g.V.length) throw new Error(`"iterations" must be a whole number from 1 to ${g.V.length}`);
  return { g, K, levels: G.closure(g, K), base: G.edgeSet(g) };
}

const arrow = (e) => e.replace('>', ' → ');

function defaultPrompt(problem) {
  const { g, K } = solve(problem);
  return `<p>Compute the <strong>transitive closure</strong> of the ${g.directed ? 'directed ' : ''}graph below with the Floyd–Warshall algorithm, with the vertices numbered in the order <strong>${g.V.map((v, i) => `${v} = v${i + 1}`).join(', ')}</strong>. `
    + `For each of the first <strong>${K}</strong> iterations, add the <strong>new edges</strong> of that iteration: in iteration k, add the edge i → j when there are edges i → v<sub>k</sub> and v<sub>k</sub> → j but no edge i → j yet.</p>`;
}

VE.transitiveClosure = { solve, arrow, defaultPrompt };
})(globalThis.VE = globalThis.VE || {});
