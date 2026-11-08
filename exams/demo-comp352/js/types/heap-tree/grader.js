// Grader for "heap-tree". Pure function.
// Solution format (all optional — the heap is computed by simulation):
// {
//   "scoring": "positional",   // "positional" (default): in proportion to the keys in the right
//                              // position; "exact": all or nothing
//   "explanation": "..."
// }
(function (VE) {
'use strict';
const HT = VE.heapTree;
const round2 = (x) => Math.round(x * 100) / 100;

function grade({ problem, solution, response, points }) {
  const sol = HT.solve(problem);
  const s = sol.s;
  const keys = new Set(s.data);
  const raw = response?.positions && typeof response.positions === 'object' ? response.positions : null;
  const got = {};
  const seen = new Set();
  if (raw) {
    for (const [p, k] of Object.entries(raw)) {
      if (/^[LR]*$/.test(p) && keys.has(k) && !seen.has(k)) { got[p] = k; seen.add(k); }
    }
  }
  const show = (pos) => `[${HT.toArray(pos).map((k) => (k == null ? '_' : k)).join(', ')}]`;
  const trace = `<span class="hb-steps">${sol.steps.map((st) => `${st.text}: [${st.state.join(', ')}]`).join('<br>')}</span>`;
  const base = {
    yourAnswer: Object.keys(got).length ? `${show(got)} (level by level)` : null,
    correctAnswer: `${show(sol.final)} (level by level)`,
    explanation: [solution.explanation, trace].filter(Boolean).join('<br>'),
  };
  const untouched = s.method === 'bottom-up' && Object.entries(got).length === s.data.length
    && Object.entries(sol.initial).every(([p, k]) => got[p] === k);
  if (!Object.keys(got).length || (untouched && JSON.stringify(sol.initial) !== JSON.stringify(sol.final))) {
    return { ...base, status: 'unanswered', score: 0 };
  }
  const hits = Object.entries(sol.final).filter(([p, k]) => got[p] === k).length;
  const total = s.data.length;
  if (hits === total) return { ...base, status: 'correct', score: points };

  const c = HT.check(got, s.heap);
  const notes = [`${hits} of ${total} keys in the right place`];
  if (seen.size < total) notes.push(`${total - seen.size} key${total - seen.size === 1 ? ' is' : 's are'} missing`);
  if (!c.complete) notes.push('your tree is not complete (a heap fills every level from the left)');
  else if (!c.ordered) notes.push(`some parent is ${s.heap === 'min' ? 'larger' : 'smaller'} than a child (not a ${s.heap}-heap)`);
  const detail = notes.join('; ');
  if (solution.scoring === 'exact') return { ...base, status: 'incorrect', score: 0, detail };
  const score = round2(points * hits / total);
  return { ...base, status: score > 0 ? 'partial' : 'incorrect', score, detail };
}

VE.graders = VE.graders || {};
VE.graders['heap-tree'] = { grade };
})(globalThis.VE = globalThis.VE || {});
