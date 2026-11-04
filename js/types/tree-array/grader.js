// Grader for "tree-array". Pure function.
// Solution format:
// {
//   "slots": ["A", "B", "X", ...],   // optional: node ids, "X" or null for empty; computed if omitted
//   "scoring": "exact",              // "exact" (default) or "positional": fraction of the cells that
//                                    // are filled in the answer or the solution and match
//   "explanation": "..."
// }
(function (VE) {
'use strict';
const { allLabels, computeExpected, slotCount, pad } = VE.treeArray;

function grade({ problem, solution, response, points }) {
  const labels = allLabels(problem);
  const n = slotCount(problem);
  const expected = pad(solution.slots ?? computeExpected(problem), n);
  const got = pad(response?.slots ?? [], n);
  const show = (arr) => {
    let last = arr.length - 1;
    while (last > 0 && arr[last] == null && expected[last] == null) last--; // trim trailing X's
    return '[' + arr.slice(0, last + 1).map((id) => (id == null ? 'X' : labels.get(id) ?? id)).join(', ') + ']';
  };
  const base = {
    yourAnswer: got.some((x) => x != null) ? show(got) : null,
    correctAnswer: show(expected),
    explanation: solution.explanation ?? null,
  };
  if (!got.some((x) => x != null)) return { ...base, status: 'unanswered', score: 0 };
  if (got.every((x, i) => x === expected[i])) return { ...base, status: 'correct', score: points };
  if (solution.scoring === 'positional') {
    const relevant = expected.map((x, i) => x != null || got[i] != null);
    const total = relevant.filter(Boolean).length;
    const hits = expected.filter((x, i) => relevant[i] && x === got[i]).length;
    const score = Math.round((points * hits) / total * 100) / 100;
    return { ...base, status: score > 0 ? 'partial' : 'incorrect', score, detail: `${hits} of ${total} cells correct` };
  }
  return { ...base, status: 'incorrect', score: 0 };
}

VE.graders = VE.graders || {};
VE.graders['tree-array'] = { grade };
})(globalThis.VE = globalThis.VE || {});
