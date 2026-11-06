// Grader for "heap-build". Pure function.
// Solution format (all optional — the heap is computed by simulation):
// {
//   "scoring": "exact",      // "exact" (default) or "positional": fraction of the cells right
//   "explanation": "..."
// }
// Keys are compared by value, so equal keys are interchangeable. In practice mode every step of
// the construction is added to the explanation.
(function (VE) {
'use strict';
const { settings, simulate } = VE.heapBuild;

function grade({ problem, solution, response, points }) {
  const s = settings(problem);
  const { array, steps } = simulate(problem);
  const valueOf = (id) => {
    const m = /^k(\d+)$/.exec(id ?? '');
    return m && Number(m[1]) < s.data.length ? s.data[Number(m[1])] : null;
  };
  const expected = Array.from({ length: s.slots }, (_, i) => (i < array.length ? array[i] : null));
  const got = Array.from({ length: s.slots }, (_, i) => valueOf(response?.slots?.[i]));
  const show = (arr) => {
    let last = arr.length - 1;
    while (last > 0 && arr[last] == null && expected[last] == null) last--;
    return `[${arr.slice(0, last + 1).map((v) => (v == null ? 'X' : v)).join(', ')}]`;
  };
  const trace = `<span class="hb-steps">${steps.map((st) => `${st.text}: [${st.state.join(', ')}]`).join('<br>')}</span>`;
  const base = {
    yourAnswer: got.some((v) => v != null) ? show(got) : null,
    correctAnswer: show(expected),
    explanation: [solution.explanation, trace].filter(Boolean).join('<br>'),
  };
  if (!got.some((v) => v != null)) return { ...base, status: 'unanswered', score: 0 };
  if (got.every((v, i) => v === expected[i])) return { ...base, status: 'correct', score: points };
  if (solution.scoring === 'positional') {
    const relevant = expected.map((v, i) => v != null || got[i] != null);
    const total = relevant.filter(Boolean).length;
    const hits = expected.filter((v, i) => relevant[i] && v === got[i]).length;
    const score = Math.round((points * hits) / total * 100) / 100;
    return { ...base, status: score > 0 ? 'partial' : 'incorrect', score, detail: `${hits} of ${total} cells correct` };
  }
  return { ...base, status: 'incorrect', score: 0 };
}

VE.graders = VE.graders || {};
VE.graders['heap-build'] = { grade };
})(globalThis.VE = globalThis.VE || {});
