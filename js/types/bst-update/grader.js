// Grader for "bst-update". Pure function.
// Solution format (all optional — the tree is computed by running the operations):
// {
//   "scoring": "positional",   // "positional" (default): in proportion to the keys in the right
//                              // place; "exact": all or nothing
//   "explanation": "..."
// }
(function (VE) {
'use strict';
const { simulate, toText, check, TREES, settings } = VE.bstUpdate;

const round2 = (x) => Math.round(x * 100) / 100;

function grade({ problem, solution, response, points }) {
  const s = settings(problem);
  const { final, steps } = simulate(problem);
  const raw = response?.positions && typeof response.positions === 'object' ? response.positions : null;
  const got = {};
  const seen = new Set();
  if (raw) {
    for (const [p, k] of Object.entries(raw)) {
      if (/^[LR]*$/.test(p) && Number.isInteger(k) && !seen.has(k)) { got[p] = k; seen.add(k); }
    }
  }
  const show = (pos) => {
    if (!Object.keys(pos).length) return '(empty tree)';
    const loose = Object.keys(pos).filter((p) => p !== '' && !(p.slice(0, -1) in pos));
    const main = '' in pos ? toText(pos) : '(no root)';
    return loose.length ? `${main}   + not attached: ${loose.map((p) => toText(pos, p)).join(', ')}` : main;
  };
  const base = {
    yourAnswer: raw ? show(got) : null,
    correctAnswer: show(final),
    explanation: [solution.explanation, `<span class="hb-steps">${steps.join('<br>')}</span>`].filter(Boolean).join('<br>'),
  };
  if (!raw) return { ...base, status: 'unanswered', score: 0 };

  const where = new Map(Object.entries(got).map(([p, k]) => [k, p]));
  const truth = new Map(Object.entries(final).map(([p, k]) => [k, p]));
  const all = new Set([...where.keys(), ...truth.keys()]);
  const hits = [...all].filter((k) => where.get(k) !== undefined && where.get(k) === truth.get(k)).length;
  if (hits === all.size) return { ...base, status: 'correct', score: points };

  const c = check(got);
  const notes = [`${hits} of ${all.size} keys in the right place`];
  if (!c.connected) notes.push('some nodes have no parent');
  else if (!c.sorted) notes.push(`your tree is not a ${TREES.bst} (its in-order traversal is not sorted)`);
  else if (s.avl && !c.balanced) notes.push('your tree is not balanced (not an AVL tree)');
  const detail = notes.join('; ');
  if (solution.scoring === 'exact') return { ...base, status: 'incorrect', score: 0, detail };
  const score = round2(points * hits / all.size);
  return { ...base, status: score > 0 ? 'partial' : 'incorrect', score, detail };
}

VE.graders = VE.graders || {};
VE.graders['bst-update'] = { grade };
})(globalThis.VE = globalThis.VE || {});
