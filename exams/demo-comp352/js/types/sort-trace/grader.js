// Grader for "sort-trace". Pure function.
// Solution format (all optional — the swaps are computed by running the algorithm):
// {
//   "swaps": [[0, 3], [1, 4]],   // positions swapped, in order
//   "scoring": "exact",          // "exact" (default) or "prefix": partial credit for the number
//                                // of swaps that are right before the first mistake
//   "explanation": "..."
// }
// Rows where the student made no swap are ignored.
(function (VE) {
'use strict';
const { settings, simulate, describeSwaps, plural } = VE.sorting;

const norm = (p) => [Math.min(p[0], p[1]), Math.max(p[0], p[1])];

function grade({ problem, solution, response, points }) {
  const s = settings(problem);
  const expected = (solution.swaps ?? simulate(problem).swaps).map(norm);
  const got = (response?.swaps ?? []).filter((p) => Array.isArray(p) && p[0] !== p[1]).map(norm);
  const show = (pairs) => (pairs.length ? `${describeSwaps(s.data, pairs)} (${plural(pairs.length, 'swap')})` : 'no swaps');
  const base = {
    yourAnswer: got.length ? show(got) : null,
    correctAnswer: show(expected),
    explanation: solution.explanation ?? null,
  };
  if (!got.length) return { ...base, status: 'unanswered', score: 0 };
  const same = (p, q) => p && q && p[0] === q[0] && p[1] === q[1];
  if (got.length === expected.length && got.every((p, i) => same(p, expected[i]))) {
    return { ...base, status: 'correct', score: points };
  }
  if (solution.scoring === 'prefix') {
    let k = 0;
    while (k < got.length && k < expected.length && same(got[k], expected[k])) k++;
    const total = Math.max(expected.length, got.length);
    const score = Math.round((points * k) / total * 100) / 100;
    return {
      ...base, status: score > 0 ? 'partial' : 'incorrect', score,
      detail: `the first ${plural(k, 'swap')} of ${expected.length} correct${got.length > expected.length ? `, ${got.length - expected.length} extra` : ''}`,
    };
  }
  return { ...base, status: 'incorrect', score: 0 };
}

VE.graders = VE.graders || {};
VE.graders['sort-trace'] = { grade };
})(globalThis.VE = globalThis.VE || {});
