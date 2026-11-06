// Grader for "radix-sort". Pure function.
// Solution format (all optional — the passes are computed by simulation):
// {
//   "scoring": "passes",   // "passes" (default): points in proportion to the passes that are right;
//                          // "positional": in proportion to the cells right over all passes;
//                          // "exact": all or nothing
//   "explanation": "..."
// }
// Each pass is checked against the correct pass applied to the student's own previous row (when
// that row is complete), so one mistake is not counted again in every later pass. Numbers are
// compared by value.
(function (VE) {
'use strict';
const { settings, simulate, pass, digitName } = VE.radixSort;

const round2 = (x) => Math.round(x * 100) / 100;

function grade({ problem, solution, response, points }) {
  const s = settings(problem);
  const n = s.data.length;
  const truth = simulate(problem);
  const idx = (id) => {
    const m = /^k(\d+)$/.exec(id ?? '');
    return m && Number(m[1]) < n ? Number(m[1]) : null;
  };
  const rows = Array.from({ length: s.passes }, (_, p) => Array.from({ length: n }, (_, i) => idx(response?.stages?.[p]?.[i])));
  const complete = (row) => row.every((i) => i != null) && new Set(row).size === n;
  const vals = (order) => order.map((i) => (i == null ? null : s.data[i]));
  const fmt = (order) => `[${vals(order).map((v) => (v == null ? '–' : v)).join(', ')}]`;

  const answered = rows.some((row) => row.some((i) => i != null));
  const explanation = [solution.explanation, '<span class="hb-steps">' + truth.map((t, p) =>
    `pass ${p + 1} (${digitName(problem, p)}): ` + t.buckets.map((b, d) => (b.length ? `${d}: ${b.map((i) => s.data[i]).join(' ')}` : null)).filter(Boolean).join(' | ')
  ).join('<br>') + '</span>'].filter(Boolean).join('<br>');
  const base = {
    yourAnswer: answered ? rows.map((row, p) => `pass ${p + 1}: ${fmt(row)}`).join('\n') : null,
    correctAnswer: truth.map((t, p) => `pass ${p + 1}: ${fmt(t.order)}`).join('\n'),
    explanation,
  };
  if (!answered) return { ...base, status: 'unanswered', score: 0 };

  let prev = s.data.map((_, i) => i);
  let passesRight = 0, cellsRight = 0, followed = false;
  rows.forEach((row, p) => {
    const expected = vals(pass(s.data, prev, p, s.B).order);
    const got = vals(row);
    const hits = expected.filter((v, i) => v === got[i]).length;
    cellsRight += hits;
    if (hits === n) passesRight++;
    if (p > 0 && hits === n && vals(prev).join() !== vals(truth[p - 1].order).join()) followed = true;
    prev = complete(row) ? row : truth[p].order;
  });
  // every pass right, the first one from the initial array: by induction all rows are the true ones
  if (passesRight === s.passes) return { ...base, status: 'correct', score: points };
  const detail = `${passesRight} of ${s.passes} passes right` + (followed ? ' (a pass after a mistake was checked against your previous row)' : '');
  if (solution.scoring === 'exact') return { ...base, status: 'incorrect', score: 0, detail };
  const frac = solution.scoring === 'positional' ? cellsRight / (n * s.passes) : passesRight / s.passes;
  const score = round2(points * frac);
  return { ...base, status: score > 0 ? 'partial' : 'incorrect', score, detail };
}

VE.graders = VE.graders || {};
VE.graders['radix-sort'] = { grade };
})(globalThis.VE = globalThis.VE || {});
