// Grader for "sort-count". Pure function.
// Solution format (all optional — the answer is computed by running the algorithm):
// { "value": 7, "explanation": "..." }
// In practice mode the list of swaps the algorithm makes is added to the explanation.
(function (VE) {
'use strict';
const { settings, simulate, describeSwaps, plural } = VE.sorting;

function grade({ problem, solution, response, points }) {
  const s = settings(problem);
  const sim = simulate(problem);
  const unit = s.count === 'comparisons' ? 'comparison' : 'swap';
  const expected = solution.value ?? (s.count === 'comparisons' ? sim.comparisons : sim.swaps.length);
  const auto = sim.swaps.length
    ? `The swaps, in order: ${describeSwaps(s.data, sim.swaps)} (${plural(sim.swaps.length, 'swap')}, ${plural(sim.comparisons, 'comparison')}).`
    : `The array is already sorted: no swaps (${plural(sim.comparisons, 'comparison')}).`;
  const got = response?.value;
  const base = {
    yourAnswer: Number.isInteger(got) ? String(got) : null,
    correctAnswer: plural(expected, unit),
    explanation: [solution.explanation, auto].filter(Boolean).join('<br>'),
  };
  if (!Number.isInteger(got)) return { ...base, status: 'unanswered', score: 0 };
  return got === expected
    ? { ...base, status: 'correct', score: points }
    : { ...base, status: 'incorrect', score: 0 };
}

VE.graders = VE.graders || {};
VE.graders['sort-count'] = { grade };
})(globalThis.VE = globalThis.VE || {});
