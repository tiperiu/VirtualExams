// Grader for "recursion". Pure function.
// Solution format (all optional — both answers are computed from the recursion in the problem):
// {
//   "scoring": "partial",   // "partial" (default): half the points for each menu; "exact": all or nothing
//   "explanation": "..."
// }
(function (VE) {
'use strict';
const R = VE.recursion;
const B = VE.bigO || globalThis.BigO;

const round2 = (x) => Math.round(x * 100) / 100;

function grade({ problem, solution, response, points }) {
  const sol = R.solve(problem);
  const n = sol.options.length;
  const pick = (k) => (Number.isInteger(response?.[k]) && response[k] >= 0 && response[k] < n ? response[k] : null);
  const t = pick('time'), sp = pick('space');
  const th = (i) => (i == null ? '–' : `Θ(${B.text(B.parse(sol.options[i]))})`);
  const base = {
    yourAnswer: t == null && sp == null ? null : `time ${th(t)}, stack depth ${th(sp)}`,
    correctAnswer: `time ${th(sol.timeIndex)}, stack depth ${th(sol.depthIndex)}`,
    explanation: [solution.explanation, ...sol.explanation].filter(Boolean).join('<br>'),
  };
  if (t == null && sp == null) return { ...base, status: 'unanswered', score: 0 };
  const okT = t === sol.timeIndex, okS = sp === sol.depthIndex;
  if (okT && okS) return { ...base, status: 'correct', score: points };
  const detail = okT ? 'the running time is right, the stack depth is not' : okS ? 'the stack depth is right, the running time is not' : 'both are wrong';
  if (solution.scoring === 'exact') return { ...base, status: 'incorrect', score: 0, detail };
  const score = round2(points * ((okT ? 0.5 : 0) + (okS ? 0.5 : 0)));
  return { ...base, status: score > 0 ? 'partial' : 'incorrect', score, detail };
}

VE.graders = VE.graders || {};
VE.graders.recursion = { grade };
})(globalThis.VE = globalThis.VE || {});
