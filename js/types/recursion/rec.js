// "recursion" questions: the running time and the stack depth (space) of a recursive method.
// Pure (no DOM); also loaded by tools/grade.mjs. Uses the Big-O engine (VE.bigO) to match answers
// to the options.
//
// Problem fields (they describe the recursion; the answers are computed from them):
//   "calls":     1 (linear recursion, default) or 2 (binary recursion): recursive calls per call
//   "reduction": "n-1" (default), "n-10" (any n-k) or "n/2" (any n/b): the argument of each call
//   "work":      "constant" (default) or "linear": the work in one call besides the recursion
//   "code":      the method to show (optional; generated from the fields above if missing)
//   "options":   the choices for both menus, as formulas (optional; default 1, log n, n, n log n, n², 2ⁿ,
//                plus the right answer if it is not among them)
// The prompt asks for the tightest bounds of the running time and of the stack depth.
(function (VE) {
'use strict';
const B = VE.bigO || globalThis.BigO;

const DEFAULT_OPTIONS = ['1', 'log n', 'n', 'n log n', 'n^2', '2^n'];

function parseReduction(r) {
  const s = String(r ?? 'n-1').replace(/\s+/g, '').replace(/[−–]/g, '-');
  let m = /^n-(\d+)$/.exec(s);
  if (m && +m[1] >= 1) return { kind: 'sub', k: +m[1], text: `n − ${m[1]}`, code: `n - ${m[1]}` };
  m = /^n\/(\d+)$/.exec(s);
  if (m && +m[1] >= 2) return { kind: 'div', b: +m[1], text: `n/${m[1]}`, code: `n / ${m[1]}` };
  throw new Error(`"reduction" must look like "n-1", "n-10" or "n/2", not "${r}"`);
}

function settings(problem) {
  const calls = Number(problem.calls ?? 1);
  if (![1, 2, 3].includes(calls)) throw new Error('"calls" must be 1, 2 or 3');
  const red = parseReduction(problem.reduction);
  const work = problem.work ?? 'constant';
  if (!['constant', 'linear'].includes(work)) throw new Error('"work" must be "constant" or "linear"');
  return { calls, red, work, code: problem.code ?? generatedCode(calls, red, work) };
}

/** A small Java-style method with this recursion. */
function generatedCode(calls, red, work) {
  const base = red.kind === 'div' ? '    if (n <= 1) return 1;' : '    if (n <= 0) return 1;';
  const loop = work === 'linear' ? ['    int s = 0;', '    for (int i = 0; i < n; i++)', '        s += i;'] : [];
  const call = `f(${red.code})`;
  const ret = calls === 1 ? `    return ${work === 'linear' ? 's + ' : '1 + '}${call};` : `    return ${work === 'linear' ? 's + ' : ''}${Array(calls).fill(call).join(' + ')};`;
  return ['int f(int n) {', base, ...loop, ret, '}'].join('\n');
}

/** Exact growth of the running time and of the stack depth, as formulas, with the reasoning. */
function analyse(s) {
  const { calls: a, red, work } = s;
  const d = work === 'linear' ? 1 : 0;
  const rec = `T(n) = ${a === 1 ? '' : a}T(${red.text}) + ${d ? 'O(n)' : 'O(1)'}`;
  let time, depth, callsText, depthText;
  if (red.kind === 'sub') {
    const k = red.k;
    depth = 'n';
    depthText = `n → ${red.text} → … → 0, about ${k === 1 ? 'n' : `n/${k}`} calls deep${k > 1 ? `, which is still Θ(n): dividing by ${k} is only a constant factor` : ''}`;
    if (a === 1) {
      time = d ? 'n^2' : 'n';
      callsText = `${k === 1 ? 'n' : `about n/${k}`} calls, each doing ${d ? 'O(n) work: about n²/' + (2 * k) + ' steps in total' : 'O(1) work'}`;
    } else {
      time = k === 1 ? `${a}^n` : `${a}^(n/${k})`;
      callsText = `every call makes ${a} calls, so there are about ${a}${k === 1 ? 'ⁿ' : `^(n/${k})`} calls in total (the recursion tree ${a === 2 ? 'doubles' : `grows ${a} times`} at every level)`;
    }
  } else {
    const b = red.b;
    depth = 'log n';
    depthText = `n → n/${b} → n/${b * b} → … → 1, about log${b === 2 ? '₂' : `_${b}`} n calls deep`;
    const p = Math.log(a) / Math.log(b);
    const pow = Math.abs(p - Math.round(p)) < 1e-12 ? (Math.round(p) === 1 ? 'n' : `n^${Math.round(p)}`) : `n^(log ${a}/log ${b})`;
    if (a === 1) {
      time = d ? 'n' : 'log n';
      callsText = d ? `about log n calls doing n + n/${b} + n/${b * b} + … ≤ ${b === 2 ? '2n' : `${b}n/${b - 1}`} steps in total` : 'about log n calls, each doing O(1) work';
    } else if (!d) {
      time = pow;
      callsText = `about ${a === b ? `${b === 2 ? '2' : b}n` : pow} calls in total (the recursion tree has ${a} children per call and log${b === 2 ? '₂' : `_${b}`} n levels), each doing O(1) work`;
    } else {
      time = p < 1 - 1e-12 ? 'n' : p < 1 + 1e-12 ? 'n log n' : pow;
      callsText = p < 1 + 1e-12 && p > 1 - 1e-12 ? 'every level of the recursion tree does O(n) work in total, and there are log n levels' : 'the work per level of the recursion tree changes geometrically';
    }
  }
  return {
    rec, time, depth,
    explanation: [
      `Recurrence: ${rec}.`,
      `Running time: ${callsText}, so the running time is Θ(${B.text(B.parse(time))}).`,
      `Stack depth: a call stays on the stack until its recursive calls return${a > 1 ? `, and the ${a} calls run one after the other, never at the same time` : ''}, so the depth is the longest chain of calls: ${depthText}. The space used is Θ(${B.text(B.parse(depth))}).`,
    ],
  };
}

/** The options of both menus (formulas, sorted by growth) and the index of each answer. */
function solve(problem) {
  const s = settings(problem);
  const an = analyse(s);
  const cmp = (x, y) => {
    const l = B.limit(B.parse(x), B.parse(y));
    return l.kind === 'zero' ? -1 : l.kind === 'inf' ? 1 : l.kind === 'const' ? 0 : NaN;
  };
  let options = (problem.options ?? DEFAULT_OPTIONS).slice();
  options.forEach((o) => { try { B.parse(o); } catch (e) { throw new Error(`option "${o}": ${e.message}`); } });
  for (const want of [an.time, an.depth]) if (!options.some((o) => cmp(o, want) === 0)) options.push(want);
  options = options.sort((x, y) => cmp(x, y));
  const find = (want) => {
    const hits = options.map((o, i) => (cmp(o, want) === 0 ? i : -1)).filter((i) => i >= 0);
    if (hits.length !== 1) throw new Error(`${hits.length} options have the growth of ${want}: keep exactly one`);
    return hits[0];
  };
  return { s, ...an, options, timeIndex: find(an.time), depthIndex: find(an.depth) };
}

const escapeHtml = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function defaultPrompt() {
  return '<p>Consider the recursive method below. As functions of <i>n</i>, what is its <strong>running time</strong>, '
    + 'and how deep does the <strong>call stack</strong> get (its space complexity)? Give the tightest bounds.</p>';
}

VE.recursion = { settings, analyse, solve, defaultPrompt, escapeHtml, parseReduction, DEFAULT_OPTIONS };
})(globalThis.VE = globalThis.VE || {});
