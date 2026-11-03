// Grader for "text". Pure function.
// Solution format:
// {
//   "accepted": ["O(n log n)"],          // exact matches after normalization; the first one is shown as the answer
//   "patterns": ["^o\\(nlogn\\)$"],      // optional regexes, tested against the normalized text
//   "caseSensitive": false,              // default false
//   "ignoreWhitespace": true,            // default true: all whitespace removed before comparing
//   "explanation": "..."
// }
// With neither "accepted" nor "patterns" the question is left for manual grading (status "pending").
(function (VE) {
'use strict';
function normalize(text, { caseSensitive = false, ignoreWhitespace = true } = {}) {
  let t = String(text ?? '').normalize('NFKC').trim();
  if (!caseSensitive) t = t.toLowerCase();
  t = ignoreWhitespace ? t.replace(/\s+/g, '') : t.replace(/\s+/g, ' ');
  return t;
}

function grade({ solution, response, points }) {
  const raw = response?.text ?? '';
  const accepted = solution.accepted ?? [];
  const patterns = solution.patterns ?? [];
  const base = {
    yourAnswer: raw.trim() ? raw.trim() : null,
    correctAnswer: accepted[0] ?? (patterns.length ? null : 'Graded manually'),
    explanation: solution.explanation ?? null,
  };
  if (!raw.trim()) return { ...base, status: 'unanswered', score: 0 };
  if (!accepted.length && !patterns.length) return { ...base, status: 'pending', score: 0 };

  const opts = { caseSensitive: !!solution.caseSensitive, ignoreWhitespace: solution.ignoreWhitespace !== false };
  const t = normalize(raw, opts);
  const ok =
    accepted.some((a) => normalize(a, opts) === t) ||
    patterns.some((p) => new RegExp(p, opts.caseSensitive ? 'u' : 'iu').test(t));
  return { ...base, status: ok ? 'correct' : 'incorrect', score: ok ? points : 0 };
}

VE.graders = VE.graders || {};
VE.graders.text = { grade, normalize };
})(globalThis.VE = globalThis.VE || {});
