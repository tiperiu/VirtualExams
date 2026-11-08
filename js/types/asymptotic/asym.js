// "asymptotic" questions (Big-O, Ω, Θ), built on the Big-O engine of the COMP 352 web app (bigo.js).
// Pure (no DOM); also loaded by tools/grade.mjs.
//
// Problem fields, by "task":
//   "relation": "f", "g"                  tick every statement that holds: f = O(g), Ω(g), Θ(g)
//   "tight":    "f", "options": [g, ...]  pick the simplest tight bound Θ(g); exactly one option must be Θ(f)
//   "witness":  "relation": "O" | "Omega" | "Theta", "f", "g"
//                                         prove the claim with constants c (or c1, c2) and n0
//   "rank":     "functions": [f, ...]     order them from the slowest to the fastest growing
//                                         (shown in the order given, so give them unsorted)
// Formulas are plain text: 3n^2 + 5n log n + 17, n!, 2^(n+1), sqrt n, log(n!), (log n)^2 ... with
// log = log base 2, ln, log10, sqrt, ^, ! and implicit multiplication.
(function (VE) {
'use strict';
const B = VE.bigO || globalThis.BigO;

const TASKS = { relation: 'O / Ω / Θ', tight: 'tightest bound', witness: 'find c and n₀', rank: 'rank by growth' };
const REL = { O: 'O', Omega: 'Ω', Theta: 'Θ' };
const DEF = {
  O: 'f(n) ≤ c·g(n)',
  Omega: 'f(n) ≥ c·g(n)',
  Theta: 'c₁·g(n) ≤ f(n) ≤ c₂·g(n)',
};

/** Parses a formula, with the field name in the error message. */
function formula(src, what) {
  if (typeof src !== 'string' || !src.trim()) throw new Error(`${what} must be a formula in n, e.g. "3n^2 + 5n"`);
  try { return B.parse(src); } catch (e) { throw new Error(`${what} "${src}": ${e.message}`); }
}
/** A formula as HTML (math font, superscripts). */
const math = (src) => `<span class="math">${B.html(B.parse(src))}</span>`;

/** How f and g compare as n -> infinity: -1 (f grows slower), 0 (same rate), 1 (faster). */
function compare(fA, gA, fs, gs) {
  const lim = B.limit(fA, gA);
  if (lim.kind === 'zero') return -1;
  if (lim.kind === 'inf') return 1;
  if (lim.kind === 'const') return 0;
  throw new Error(`cannot compare ${fs} and ${gs} (the limit of their ratio is not clear)`);
}
function limitText(fA, gA) {
  const L = B.limit(fA, gA);
  return L.kind === 'zero' ? '0' : L.kind === 'inf' ? '∞' : L.kind === 'const' ? B.fmtNum(L.L, 3) : '?';
}

function settings(problem) {
  const task = problem.task ?? 'relation';
  if (!TASKS[task]) throw new Error(`"task" must be one of ${Object.keys(TASKS).join(', ')}`);
  const s = { task };
  if (task === 'relation' || task === 'tight' || task === 'witness') { s.f = problem.f; s.fA = formula(problem.f, '"f"'); }
  if (task === 'relation' || task === 'witness') { s.g = problem.g; s.gA = formula(problem.g, '"g"'); }
  if (task === 'tight') {
    if (!Array.isArray(problem.options) || problem.options.length < 2) throw new Error('"options" must list at least two functions g');
    s.options = problem.options.slice();
    s.optA = s.options.map((o, i) => formula(o, `option ${i + 1}`));
  }
  if (task === 'witness') {
    s.relation = problem.relation ?? 'O';
    if (!REL[s.relation]) throw new Error('"relation" must be "O", "Omega" or "Theta"');
  }
  if (task === 'rank') {
    if (!Array.isArray(problem.functions) || problem.functions.length < 2) throw new Error('"functions" must list at least two functions');
    s.functions = problem.functions.slice();
    s.funA = s.functions.map((f, i) => formula(f, `function ${i + 1}`));
  }
  return s;
}

/** The answer, computed with the engine. */
function solve(problem) {
  const s = settings(problem);
  if (s.task === 'relation') {
    const c = compare(s.fA, s.gA, s.f, s.g);
    return { s, cmp: c, holds: { O: c <= 0, Omega: c >= 0, Theta: c === 0 } };
  }
  if (s.task === 'tight') {
    const right = s.optA.map((g, i) => i).filter((i) => compare(s.fA, s.optA[i], s.f, s.options[i]) === 0);
    if (right.length !== 1) throw new Error(right.length ? `options ${right.map((i) => i + 1).join(' and ')} are all Θ(f): keep one` : 'none of the options is Θ(f)');
    return { s, right: right[0] };
  }
  if (s.task === 'witness') {
    const c = compare(s.fA, s.gA, s.f, s.g);
    const ok = { O: c <= 0, Omega: c >= 0, Theta: c === 0 }[s.relation];
    if (!ok) throw new Error(`f(n) is not ${REL[s.relation]}(g(n)), so it cannot be proved`);
    // one set of constants, for the explanation
    let best = B.bestC(s.relation, s.fA, s.gA, 1);
    let n0 = best ? B.smallestN0(s.relation, s.fA, s.gA, best.c, best.c2 || best.c) : null;
    if (!best || n0 == null) { best = B.bestC(s.relation, s.fA, s.gA, 10); n0 = best ? B.smallestN0(s.relation, s.fA, s.gA, best.c, best.c2 || best.c) : null; }
    // prefer whole numbers when they also work (3.9 -> 4 for a lower constant, 53.2 -> 54 for an upper one)
    if (best && n0 != null) {
      const tryC = (c, c2) => B.check(s.relation, s.fA, s.gA, c, n0, c2).ok;
      if (s.relation === 'Theta') {
        const lo = Math.max(1, Math.round(best.c)), hi = Math.ceil(best.c2);
        if (lo !== best.c && tryC(lo, best.c2)) best.c = lo;
        if (hi !== best.c2 && tryC(best.c, hi)) best.c2 = hi;
      } else if (s.relation === 'Omega') {
        const lo = Math.round(best.c);
        if (lo > 0 && lo !== best.c && tryC(lo)) best.c = lo;
      } else if (Math.ceil(best.c) !== best.c && tryC(Math.ceil(best.c))) best.c = Math.ceil(best.c);
    }
    return { s, example: best && n0 != null ? { ...best, n0 } : null };
  }
  // rank: insertion sort with the limit test as comparison
  const order = [];
  for (let i = 0; i < s.functions.length; i++) {
    let k = order.length;
    while (k > 0 && compare(s.funA[order[k - 1]], s.funA[i], s.functions[order[k - 1]], s.functions[i]) > 0) k--;
    order.splice(k, 0, i);
  }
  // how each one compares with the next: '<' or '='
  const rel = order.slice(1).map((j, k) => (compare(s.funA[order[k]], s.funA[j], s.functions[order[k]], s.functions[j]) === 0 ? '=' : '<'));
  return { s, order, rel };
}

/** Reads a constant typed by the student: a positive number or fraction ("1/4", "2.5"); null otherwise. */
function readConstant(text) {
  if (text == null || String(text).trim() === '') return null;
  try {
    const a = B.parse(String(text));
    if (B.usesN(a)) return null;
    const v = B.evNum(a, 1);
    return v > 0 && Number.isFinite(v) ? v : null;
  } catch (_) { return null; }
}

function defaultPrompt(problem) {
  const s = settings(problem);
  if (s.task === 'relation') return '<p>Tick <strong>every</strong> statement that holds.</p>';
  if (s.task === 'tight') return '<p>What is the complexity of this function? Pick the <strong>simplest tight bound</strong>.</p>';
  if (s.task === 'witness') {
    return `<p>Show that <strong>f(n) is ${REL[s.relation]}(g(n))</strong>: give constants so that <strong>${DEF[s.relation]}</strong> for every n ≥ n₀.</p>`;
  }
  return '<p>Order these functions from the <strong>slowest</strong> growing (top) to the <strong>fastest</strong> growing (bottom).</p>';
}

VE.asymptotic = { TASKS, REL, DEF, settings, solve, compare, limitText, readConstant, defaultPrompt, math };
})(globalThis.VE = globalThis.VE || {});
