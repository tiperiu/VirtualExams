// Grader for "hash-table". Pure function.
// Solution format (all optional — the table and the count are computed by simulation):
// {
//   "scoring": "partial",     // "partial" (default): the table earns (1 − countWeight) of the points,
//                             // in proportion to the keys in the right cell; the collision count earns countWeight.
//                             // "exact": all or nothing.
//   "countWeight": 0.25,      // share of the points for the number of collisions
//   "explanation": "..."
// }
// In practice mode the cells tried for every key are added to the explanation.
(function (VE) {
'use strict';
const { settings, simulate, PROBING } = VE.hashTable;

const round2 = (x) => Math.round(x * 100) / 100;
const plural = (k, w) => `${k} ${w}${k === 1 ? '' : 's'}`;

function grade({ problem, solution, response, points }) {
  const s = settings(problem);
  const { table, collisions, steps } = simulate(problem);
  const valueOf = (id) => {
    const m = /^k(\d+)$/.exec(id ?? '');
    return m && Number(m[1]) < s.keys.length ? s.keys[Number(m[1])] : null;
  };
  const got = Array.from({ length: s.size }, (_, i) => valueOf(response?.slots?.[i]));
  const gotCount = Number.isInteger(response?.collisions) ? response.collisions : null;
  const show = (arr, count) => `[${arr.map((v) => (v == null ? '–' : v)).join(', ')}]`
    + `, ${count == null ? 'no collision count' : plural(count, 'collision')}`;

  const trace = steps.map((st) => {
    const via = st.tried.length > 1 ? `tries ${st.tried.join(' → ')}` : `h = ${st.home}`;
    const h2 = st.h2 != null ? ` (h′ = ${st.h2})` : '';
    return `${st.key}: ${st.key} mod ${s.size} = ${st.home}${h2}; ${via} → cell ${st.cell}`
      + (st.collisions ? ` (${plural(st.collisions, 'collision')})` : '');
  });
  const base = {
    yourAnswer: got.some((v) => v != null) || gotCount != null ? show(got, gotCount) : null,
    correctAnswer: show(table, collisions),
    explanation: [solution.explanation,
      `<span class="hb-steps">${trace.join('<br>')}<br>total: ${plural(collisions, 'collision')} (${PROBING[s.probing]})</span>`]
      .filter(Boolean).join('<br>'),
  };
  if (base.yourAnswer == null) return { ...base, status: 'unanswered', score: 0 };

  // every key can be used once, so the table is scored by the keys that are in their right cell
  const total = s.keys.length;
  const hits = table.filter((v, i) => v != null && v === got[i]).length;
  const countOk = gotCount === collisions;
  const detail = `table: ${hits} of ${total} keys in the right cell; collisions: ${countOk ? 'right' : 'wrong'}`;
  if (hits === total && countOk) return { ...base, status: 'correct', score: points };
  if (solution.scoring === 'exact') return { ...base, status: 'incorrect', score: 0, detail };
  const w = Math.min(1, Math.max(0, solution.countWeight ?? 0.25));
  const score = round2(points * ((1 - w) * (hits / total) + (countOk ? w : 0)));
  return { ...base, status: score > 0 ? 'partial' : 'incorrect', score, detail };
}

VE.graders = VE.graders || {};
VE.graders['hash-table'] = { grade };
})(globalThis.VE = globalThis.VE || {});
