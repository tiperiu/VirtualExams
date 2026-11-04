// Grader for "mcq". Pure function: no DOM, runs in the browser (practice mode) and in Node (tools/grade.mjs).
// Solution format: { "correct": ["c"], "explanation": "..." }
// The answer is correct only if the selected set equals the correct set.
(function (VE) {
'use strict';
function grade({ problem, solution, response, points }) {
  const letter = (id) => {
    const i = problem.options.findIndex((o) => o.id === id);
    return i < 0 ? id : `${String.fromCharCode(65 + i)}. ${problem.options[i].text}`;
  };
  const correct = [].concat(solution.correct ?? []);
  const selected = response?.selected ?? [];
  const base = {
    yourAnswer: selected.length ? selected.map(letter).join('; ') : null,
    correctAnswer: correct.map(letter).join('; '),
    explanation: solution.explanation ?? null,
  };
  if (!selected.length) return { ...base, status: 'unanswered', score: 0 };
  const ok = selected.length === correct.length && correct.every((c) => selected.includes(c));
  return { ...base, status: ok ? 'correct' : 'incorrect', score: ok ? points : 0 };
}

VE.graders = VE.graders || {};
VE.graders.mcq = { grade };
})(globalThis.VE = globalThis.VE || {});
