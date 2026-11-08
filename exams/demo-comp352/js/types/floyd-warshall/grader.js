// Grader for "floyd-warshall". Pure function.
// Solution format (all optional):
// {
//   "scoring": "levels",   // "levels" (default): every matrix counts equally, in proportion to the cells
//                          // right among those that should change or that the student changed;
//                          // "exact": all or nothing
//   "explanation": "..."
// }
// Each D(k) is checked against the correct update of the student's own D(k-1) (follow-through).
(function (VE) {
'use strict';
const F = VE.floydWarshall;
const G = VE.graph;
const round2 = (x) => Math.round(x * 100) / 100;

function grade({ problem, solution, response, points }) {
  const s = F.solve(problem);
  const { g, K, D0 } = s;
  const n = g.V.length;
  const edits = Array.from({ length: K }, (_, k) => response?.levels?.[k] || {});
  const name = (i) => g.V[i];
  const matrixText = (D) => D.map((r, i) => `${name(i)}: ${r.map(G.fmt).join(' ')}`).join('\n');
  const answered = edits.some((e) => Object.keys(e).length);
  const truthText = s.levels.map((l, k) => `D(${k + 1}):\n${matrixText(l.D)}`).join('\n');
  const explanation = [solution.explanation, ...s.levels.map((l, k) => `D(${k + 1}), through ${name(k)}: `
    + (l.changes.length ? l.changes.map((c) => `${name(c.i)}→${name(c.j)}: ${G.fmt(c.from)} → ${c.to} (${G.fmt(c.a)} + ${G.fmt(c.b)})`).join(', ') : 'nothing changes') + '.')].filter(Boolean).join('<br>');
  let prev = D0.map((r) => r.slice());
  const mats = [];
  const scores = [];
  const notes = [];
  for (let k = 1; k <= K; k++) {
    const want = G.fwStep(prev, k).D;
    const mine = prev.map((r) => r.slice());
    let bad = 0;
    for (const [key, txt] of Object.entries(edits[k - 1])) {
      const [i, j] = key.split(',').map(Number);
      if (!(i >= 0 && i < n && j >= 0 && j < n)) continue;
      const v = G.readValue(txt);
      if (v == null) { bad++; mine[i][j] = NaN; } else mine[i][j] = v;
    }
    let right = 0, counted = 0;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      if (want[i][j] === prev[i][j] && !(mine[i][j] !== prev[i][j])) continue;
      counted++;
      if (mine[i][j] === want[i][j]) right++;
    }
    scores.push(counted ? right / counted : 1);
    if (right < counted) notes.push(`D(${k}): ${right} of ${counted} updated cells right`);
    mats.push(mine);
    prev = mine.map((r, i) => r.map((v, j) => (Number.isNaN(v) ? want[i][j] : v)));
  }
  const base = {
    yourAnswer: answered ? mats.map((D, k) => `D(${k + 1}):\n${D.map((r, i) => `${name(i)}: ${r.map((v) => (Number.isNaN(v) ? '?' : G.fmt(v))).join(' ')}`).join('\n')}`).join('\n') : null,
    correctAnswer: truthText,
    explanation,
  };
  if (!answered) {
    if (s.levels.every((l) => !l.changes.length)) return { ...base, status: 'correct', score: points };
    return { ...base, status: 'unanswered', score: 0 };
  }
  if (scores.every((x) => x === 1)) return { ...base, status: 'correct', score: points };
  const detail = notes.join('; ') + ' (each matrix is checked against your own previous one)';
  if (solution.scoring === 'exact') return { ...base, status: 'incorrect', score: 0, detail };
  const score = round2(points * scores.reduce((a, b) => a + b, 0) / K);
  return { ...base, status: score > 0 ? 'partial' : 'incorrect', score, detail };
}

VE.graders = VE.graders || {};
VE.graders['floyd-warshall'] = { grade };
})(globalThis.VE = globalThis.VE || {});
