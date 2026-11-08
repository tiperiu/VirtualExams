// Grader for "asymptotic". Pure function.
// Solution format (all optional — the answers are computed with the Big-O engine):
// {
//   "scoring": "exact",   // relation: "exact" (default) or "statements" (1/3 per statement right);
//                         // rank: "pairs" (default: fraction of pairs in the right order) or "exact";
//                         // tight and witness: always all or nothing
//   "explanation": "..."
// }
// witness: the constants are checked against the definition for every n >= n0 (every integer
// near n0, a fine sweep up to 10^15, then up to 10^300, and the limit of f/g), so any valid proof
// is accepted, not only one set of constants.
(function (VE) {
'use strict';
const A = VE.asymptotic;
const B = VE.bigO || globalThis.BigO;

const round2 = (x) => Math.round(x * 100) / 100;
const join = (...parts) => parts.filter(Boolean).join('<br>');

function grade({ problem, solution, response, points }) {
  const sol = A.solve(problem);
  const s = sol.s;
  const scoring = solution.scoring;

  if (s.task === 'relation') {
    const want = sol.holds;
    const got = new Set(Array.isArray(response?.selected) ? response.selected : []);
    const list = (set) => ['O', 'Omega', 'Theta'].filter((r) => set(r)).map((r) => `f = ${A.REL[r]}(g)`).join(', ') || 'none';
    const verdict = sol.cmp === 0 ? 'f and g grow at the same rate, so all three hold: O, Ω and Θ.'
      : sol.cmp < 0 ? 'f grows slower than g: f = O(g) only (not Ω, so not Θ).'
      : 'f grows faster than g: f = Ω(g) only (not O, so not Θ).';
    const base = {
      yourAnswer: got.size ? list((r) => got.has(r)) : null,
      correctAnswer: list((r) => want[r]),
      explanation: join(solution.explanation, `${verdict} f(n)/g(n) → ${A.limitText(s.fA, s.gA)} as n → ∞ (0: O only · a constant: Θ · ∞: Ω only).`),
    };
    if (!got.size) return { ...base, status: 'unanswered', score: 0 };
    const right = ['O', 'Omega', 'Theta'].filter((r) => got.has(r) === want[r]).length;
    if (right === 3) return { ...base, status: 'correct', score: points };
    const detail = `${right} of 3 statements right`;
    if (scoring !== 'statements') return { ...base, status: 'incorrect', score: 0, detail };
    const score = round2(points * right / 3);
    return { ...base, status: score > 0 ? 'partial' : 'incorrect', score, detail };
  }

  if (s.task === 'tight') {
    const c = Number.isInteger(response?.choice) && response.choice >= 0 && response.choice < s.options.length ? response.choice : null;
    const theta = (i) => `Θ(${B.text(s.optA[i])})`;
    const base = {
      yourAnswer: c == null ? null : theta(c),
      correctAnswer: theta(sol.right),
      explanation: join(solution.explanation,
        `Drop the constant factors and the lower-order terms: f(n)/${B.text(s.optA[sol.right])} → ${A.limitText(s.fA, s.optA[sol.right])}, a constant, so f is ${theta(sol.right)}.`),
    };
    if (c == null) return { ...base, status: 'unanswered', score: 0 };
    if (c === sol.right) return { ...base, status: 'correct', score: points };
    const cmp = A.compare(s.fA, s.optA[c], s.f, s.options[c]);
    return { ...base, status: 'incorrect', score: 0,
      detail: cmp < 0 ? `${B.text(s.optA[c])} grows faster than f: f is O(${B.text(s.optA[c])}), but that bound is not tight`
        : `${B.text(s.optA[c])} grows slower than f: f is Ω(${B.text(s.optA[c])}), not Θ` };
  }

  if (s.task === 'witness') {
    const r = response || {};
    const keys = s.relation === 'Theta' ? ['c1', 'c2', 'n0'] : ['c', 'n0'];
    const typed = keys.map((k) => (r[k] == null ? '' : String(r[k]).trim()));
    const G = B.text(s.gA), F = B.text(s.fA);
    const ex = sol.example;
    const exText = ex ? (s.relation === 'Theta' ? `c₁ = ${B.fmtNum(ex.c)}, c₂ = ${B.fmtNum(ex.c2)}, n₀ = ${ex.n0}` : `c = ${B.fmtNum(ex.c)}, n₀ = ${ex.n0}`) : null;
    const base = {
      yourAnswer: typed.some(Boolean) ? keys.map((k, i) => `${k.replace('0', '₀').replace('c1', 'c₁').replace('c2', 'c₂')} = ${typed[i] || '–'}`).join(', ') : null,
      correctAnswer: exText ? `any constants that satisfy the definition, e.g. ${exText}` : 'any constants that satisfy the definition',
      explanation: join(solution.explanation,
        `The definition: ${A.DEF[s.relation]} for every n ≥ n₀.`,
        ex ? `For example, ${s.relation === 'O' ? `${F} ≤ ${B.fmtNum(ex.c)}·${G}` : s.relation === 'Omega' ? `${F} ≥ ${B.fmtNum(ex.c)}·${G}` : `${B.fmtNum(ex.c)}·${G} ≤ ${F} ≤ ${B.fmtNum(ex.c2)}·${G}`} for every n ≥ ${ex.n0}.` : null),
    };
    if (!typed.some(Boolean)) return { ...base, status: 'unanswered', score: 0 };
    const v = keys.map((k, i) => A.readConstant(typed[i]));
    if (v.some((x) => x == null)) {
      return { ...base, status: 'incorrect', score: 0, detail: 'every constant must be a positive number (fractions like 1/4 are fine)' };
    }
    const n0 = Math.max(1, Math.round(v[keys.length - 1]));
    const res = s.relation === 'Theta' ? B.check('Theta', s.fA, s.gA, v[0], n0, v[1]) : B.check(s.relation, s.fA, s.gA, v[0], n0);
    if (res.ok) return { ...base, status: 'correct', score: points, detail: `a valid proof for every n ≥ ${n0}` };
    let why;
    if (!res.bad) why = 'the inequality fails for very large n';
    else if (res.side === 'undef') why = `f or g is undefined at n = ${B.fmtN(res.bad)}`;
    else why = `at n = ${B.fmtN(res.bad)}: f(n) = ${B.fmtL(res.fv)} ${res.side === 'upper' ? `> ${B.fmtL(res.hi)}` : `< ${B.fmtL(res.lo)}`}`;
    const fix = res.side === 'lower' ? 'the lower constant is too big' : res.side === 'upper' ? 'the constant is too small' : '';
    return { ...base, status: 'incorrect', score: 0, detail: `not a proof: ${why}${fix ? ` (${fix}, or n₀ too small)` : ''}` };
  }

  // rank
  const n = s.functions.length;
  const ord = Array.isArray(response?.order) ? response.order : null;
  const valid = ord && ord.length === n && new Set(ord).size === n && ord.every((i) => Number.isInteger(i) && i >= 0 && i < n);
  const chain = (o, rel) => o.map((i, k) => (k ? ` ${rel ? rel[k - 1] : '·'} ` : '') + B.text(s.funA[i])).join('');
  const base = {
    yourAnswer: valid ? ord.map((i) => B.text(s.funA[i])).join(', ') : null,
    correctAnswer: chain(sol.order, sol.rel),
    explanation: join(solution.explanation, `From the slowest to the fastest growing: ${chain(sol.order, sol.rel)} (“=” means the same growth rate, either order is right).`),
  };
  if (!valid) return { ...base, status: 'unanswered', score: 0 };
  // a pair (a before b) is right when a does not grow faster than b
  let right = 0, total = 0;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    total++;
    if (A.compare(s.funA[ord[i]], s.funA[ord[j]], s.functions[ord[i]], s.functions[ord[j]]) <= 0) right++;
  }
  if (right === total) return { ...base, status: 'correct', score: points };
  const detail = `${right} of ${total} pairs in the right order`;
  if (scoring === 'exact') return { ...base, status: 'incorrect', score: 0, detail };
  const score = round2(points * right / total);
  return { ...base, status: score > 0 ? 'partial' : 'incorrect', score, detail };
}

VE.graders = VE.graders || {};
VE.graders.asymptotic = { grade };
})(globalThis.VE = globalThis.VE || {});
