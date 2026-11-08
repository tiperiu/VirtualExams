// Grader for "transitive-closure". Pure function.
// Solution format (all optional):
// {
//   "scoring": "iterations",   // "iterations" (default): every iteration counts equally, in proportion to
//                              // |right ∩ given| / |right ∪ given|; "exact": all or nothing
//   "explanation": "..."
// }
// Each iteration is checked against the new edges that follow from the student's own graph so far
// (follow-through), so a mistake in one iteration is not counted again in the next ones.
(function (VE) {
'use strict';
const T = VE.transitiveClosure;
const G = VE.graph;
const round2 = (x) => Math.round(x * 100) / 100;

function grade({ problem, solution, response, points }) {
  const s = T.solve(problem);
  const { g, K } = s;
  const lists = Array.from({ length: K }, (_, k) => (Array.isArray(response?.added?.[k]) ? response.added[k] : []));
  const show = (l) => (l.length ? l.map(T.arrow).join(', ') : 'none');
  const base = {
    yourAnswer: lists.some((l) => l.length) ? lists.map((l, k) => `k=${k + 1} (${g.V[k]}): ${show(l)}`).join('\n') : null,
    correctAnswer: s.levels.map((l, k) => `k=${k + 1} (${g.V[k]}): ${show(l)}`).join('\n'),
    explanation: [solution.explanation, ...s.levels.map((l, k) => `Iteration ${k + 1}, through ${g.V[k]}: ${l.length ? `add ${show(l)}` : 'no new edge'}.`)].filter(Boolean).join('<br>'),
  };
  if (!lists.some((l) => l.length)) {
    // leaving every iteration empty is right only if no iteration adds an edge
    if (s.levels.every((l) => !l.length)) return { ...base, status: 'correct', score: points };
    return { ...base, status: 'unanswered', score: 0 };
  }
  let edges = new Set(s.base);
  const scores = [];
  const notes = [];
  lists.forEach((l, k) => {
    const want = new Set(G.closureStep(g, edges, k + 1));
    const got = new Set(l.filter((e) => /^[^>]+>[^>]+$/.test(e) && !edges.has(e) && e.split('>')[0] !== e.split('>')[1] && e.split('>').every((v) => g.index.has(v))));
    const both = [...got].filter((e) => want.has(e)).length;
    const union = new Set([...got, ...want]).size;
    scores.push(union ? both / union : 1);
    const missing = want.size - both, extra = got.size - both;
    if (missing || extra) notes.push(`k=${k + 1}: ${[missing ? `${missing} missing` : null, extra ? `${extra} extra` : null].filter(Boolean).join(', ')}`);
    edges = new Set([...edges, ...got]);
  });
  if (scores.every((x) => x === 1)) return { ...base, status: 'correct', score: points };
  const detail = notes.join('; ') + ' (each iteration is checked against your own graph so far)';
  if (solution.scoring === 'exact') return { ...base, status: 'incorrect', score: 0, detail };
  const score = round2(points * scores.reduce((a, b) => a + b, 0) / K);
  return { ...base, status: score > 0 ? 'partial' : 'incorrect', score, detail };
}

VE.graders = VE.graders || {};
VE.graders['transitive-closure'] = { grade };
})(globalThis.VE = globalThis.VE || {});
