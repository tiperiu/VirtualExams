// Editor forms for the graph types: graph-search (BFS, DFS, Dijkstra), transitive-closure, floyd-warshall.
(function (VE) {
'use strict';

function graphFields(F, p, { weights = true, directedDefault = false } = {}) {
  return [
    F.field('Edges, one per line', F.lines(p, 'edges', { rows: 7, placeholder: weights ? 'A-B 4\nA-C 2\nB-D 5' : 'A-B\nA-C\nB-D' }),
      `"A-B"${weights ? ' or "A-B 4" (with a weight)' : ''}; in a directed graph A-B is the edge A → B. The vertices are taken in alphabetical order unless "vertices" is set in the JSON; positions can be set with "layout" in the JSON (default: a circle).`),
    F.row(
      F.field('Directed', F.bool(p, 'directed', [[true, 'directed'], [false, 'undirected']], { fallback: directedDefault })),
      weights ? F.field('Weighted', F.bool(p, 'weighted', [[true, 'weighted'], [false, 'unweighted']], { fallback: true })) : null),
  ];
}

VE.editors = VE.editors || {};
VE.editors['graph-search'] = {
  label: 'Graph: BFS, DFS, Dijkstra',
  promptNote: 'Leave the prompt empty to use the generated one (it names the algorithm, the start vertex and the tie rule).',
  blank: () => ({
    problem: { type: 'graph-search', title: 'Breadth-first search', algorithm: 'bfs', start: 'A', directed: false, weighted: false, edges: ['A-B', 'A-C', 'B-D', 'C-D', 'D-E'] },
    solution: { scoring: 'partial', explanation: '' },
  }),
  form(F, ctx) {
    const p = ctx.problem, s = ctx.solution;
    return [
      F.section('Question',
        F.row(
          F.field('Algorithm', F.select(p, 'algorithm', [['bfs', 'BFS: queue order and d'], ['dfs', 'DFS: discovery order, d and f'], ['dijkstra', 'Dijkstra: order and distances (weighted)']])),
          F.field('Start vertex', F.text(p, 'start', { placeholder: 'A', mono: true }))),
        ...graphFields(F, p),
        F.field('DFS: when the search from the start ends', F.bool(p, 'restart', [[true, 'continue from the first unvisited vertex'], [false, 'stop']], { fallback: true }))),
      F.section('Solution',
        F.note('The order, the d values (and f for DFS) and a step-by-step log are computed.'),
        F.field('Scoring', F.select(s, 'scoring', [['partial', 'partial: the order and the values count equally'], ['exact', 'all or nothing']])),
        F.explanation(s)),
    ];
  },
};

VE.editors['transitive-closure'] = {
  label: 'Graph: transitive closure',
  promptNote: 'Leave the prompt empty to use the generated one.',
  blank: () => ({
    problem: { type: 'transitive-closure', title: 'Transitive closure', directed: true, edges: ['A-B', 'B-C', 'C-A', 'C-D'], iterations: 4 },
    solution: { scoring: 'iterations', explanation: '' },
  }),
  form(F, ctx) {
    const p = ctx.problem, s = ctx.solution;
    return [
      F.section('Question', ...graphFields(F, p, { weights: false, directedDefault: true }),
        F.field('Iterations the student shows', F.num(p, 'iterations', { min: 1, max: 12, placeholder: '4' }), 'Iteration k adds the edges through the k-th vertex.')),
      F.section('Solution',
        F.note('The new edges of every iteration are computed; each iteration is checked against the student’s own graph so far.'),
        F.field('Scoring', F.select(s, 'scoring', [['iterations', 'partial: by iterations'], ['exact', 'all or nothing']])),
        F.explanation(s)),
    ];
  },
};

VE.editors['floyd-warshall'] = {
  label: 'Graph: Floyd–Warshall',
  promptNote: 'Leave the prompt empty to use the generated one.',
  blank: () => ({
    problem: { type: 'floyd-warshall', title: 'Floyd–Warshall', directed: true, weighted: true, edges: ['A-B 3', 'B-C 2', 'C-A 5', 'A-C 9'], iterations: 3 },
    solution: { scoring: 'levels', explanation: '' },
  }),
  form(F, ctx) {
    const p = ctx.problem, s = ctx.solution;
    return [
      F.section('Question', ...graphFields(F, p, { directedDefault: true }),
        F.field('Matrices the student fills', F.num(p, 'iterations', { min: 1, max: 12, placeholder: '3' }), 'D(1) to D(k).')),
      F.section('Solution',
        F.note('Every matrix is computed; each is checked against the student’s own previous matrix.'),
        F.field('Scoring', F.select(s, 'scoring', [['levels', 'partial: by matrices'], ['exact', 'all or nothing']])),
        F.explanation(s)),
    ];
  },
};
})(globalThis.VE = globalThis.VE || {});
