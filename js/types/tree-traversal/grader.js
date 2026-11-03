// Grader for "tree-traversal". Pure function.
// Solution format:
// {
//   "sequence": ["A", "B", ...],   // optional: if omitted it is computed from the tree and the traversal type
//   "scoring": "exact",            // "exact" (all or nothing, default) or "positional" (fraction of positions right)
//   "explanation": "..."
// }
(function (VE) {
'use strict';
const { normalizeTree, traverse, isBinary } = VE.tree;

function grade({ problem, solution, response, points }) {
  const { root, byId } = normalizeTree(problem.tree);
  const expected = solution.sequence ?? traverse(root, problem.traversal, problem.binary ?? isBinary(root));
  const seq = response?.sequence ?? [];
  const show = (ids) => ids.map((id) => byId.get(id)?.label ?? id).join(', ');
  const base = {
    yourAnswer: seq.length ? show(seq) : null,
    correctAnswer: show(expected),
    explanation: solution.explanation ?? null,
  };
  if (!seq.length) return { ...base, status: 'unanswered', score: 0 };

  const exact = seq.length === expected.length && seq.every((id, i) => id === expected[i]);
  if (exact) return { ...base, status: 'correct', score: points };
  if (solution.scoring === 'positional') {
    const hits = expected.filter((id, i) => seq[i] === id).length;
    const score = Math.round((points * hits) / expected.length * 100) / 100;
    return { ...base, status: score > 0 ? 'partial' : 'incorrect', score, detail: `${hits} of ${expected.length} positions correct` };
  }
  return { ...base, status: 'incorrect', score: 0 };
}

VE.graders = VE.graders || {};
VE.graders['tree-traversal'] = { grade };
})(globalThis.VE = globalThis.VE || {});
