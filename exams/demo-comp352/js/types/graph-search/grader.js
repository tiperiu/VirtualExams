// Grader for "graph-search". Pure function.
// Solution format (all optional — the answer is computed by running the algorithm):
// {
//   "scoring": "partial",   // "partial" (default): the order and the d values (and the f values for
//                           // DFS) count equally, each in proportion to what is right; "exact": all or nothing
//   "explanation": "..."
// }
(function (VE) {
'use strict';
const S = VE.graphSearch;
const G = VE.graph;
const round2 = (x) => Math.round(x * 100) / 100;

function grade({ problem, solution, response, points }) {
  const s = S.solve(problem);
  const V = s.g.V;
  const r = response || {};
  const order = Array.from({ length: V.length }, (_, i) => (Array.isArray(r.order) && V.includes(r.order[i]) ? r.order[i] : null));
  const want = Array.from({ length: V.length }, (_, i) => s.order[i] ?? null);
  const vals = (m) => V.map((v) => `${v}=${G.fmt(m.get(v))}`).join(' ');
  const typed = (o) => V.map((v) => `${v}=${String(o?.[v] ?? '').trim() || '–'}`).join(' ');
  const answered = order.some(Boolean) || V.some((v) => String(r.d?.[v] ?? '').trim() || String(r.f?.[v] ?? '').trim());
  const base = {
    yourAnswer: answered ? [`order: ${order.map((x) => x ?? '–').join(' ')}`, `d: ${typed(r.d)}`, s.withF ? `f: ${typed(r.f)}` : null].filter(Boolean).join('\n') : null,
    correctAnswer: [`order: ${s.order.join(' ')}`, `d: ${vals(s.d)}`, s.withF ? `f: ${vals(s.f)}` : null].filter(Boolean).join('\n'),
    explanation: [solution.explanation, `<span class="hb-steps">${s.steps.map((x) => x.replace(/ /g, '&nbsp;')).join('<br>')}</span>`].filter(Boolean).join('<br>'),
  };
  if (!answered) return { ...base, status: 'unanswered', score: 0 };
  const cells = want.map((w, i) => [w, order[i]]).filter(([w, o]) => w != null || o != null);
  const orderRight = cells.filter(([w, o]) => w === o).length;
  const parts = [orderRight / Math.max(1, cells.length)];
  const dRight = V.filter((v) => G.readValue(r.d?.[v]) === s.d.get(v)).length;
  parts.push(dRight / V.length);
  let fRight = 0;
  if (s.withF) { fRight = V.filter((v) => G.readValue(r.f?.[v]) === s.f.get(v)).length; parts.push(fRight / V.length); }
  if (parts.every((x) => x === 1)) return { ...base, status: 'correct', score: points };
  const detail = [`order: ${orderRight} of ${cells.length} positions right`, `d: ${dRight} of ${V.length} right`, s.withF ? `f: ${fRight} of ${V.length} right` : null].filter(Boolean).join('; ');
  if (solution.scoring === 'exact') return { ...base, status: 'incorrect', score: 0, detail };
  const score = round2(points * parts.reduce((a, b) => a + b, 0) / parts.length);
  return { ...base, status: score > 0 ? 'partial' : 'incorrect', score, detail };
}

VE.graders = VE.graders || {};
VE.graders['graph-search'] = { grade };
})(globalThis.VE = globalThis.VE || {});
