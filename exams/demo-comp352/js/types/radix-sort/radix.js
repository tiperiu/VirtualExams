// LSD radix sort for "radix-sort" questions (pure, no DOM; also loaded by tools/grade.mjs).
//
// Problem fields:
//   "data":   [329, 457, 657]       non-negative whole numbers
//   "base":   "decimal" (default)   digits 0–9; or "binary": bits (every number is shown in decimal
//                                   and in binary)
//   "passes": 4                     how many passes the student shows (default 4)
//
// Pass p (p = 0, 1, …) distributes the numbers by digit p, counted from the right (the units
// digit / the rightmost bit first), and collects them bucket by bucket. Every pass is stable:
// numbers with the same digit keep their order from the previous pass.
(function (VE) {
'use strict';

const DECIMAL_NAMES = ['units', 'tens', 'hundreds', 'thousands', 'ten-thousands', 'hundred-thousands'];

function settings(problem) {
  const data = problem.data;
  if (!Array.isArray(data) || data.length < 2 || data.some((x) => !Number.isInteger(x) || x < 0)) {
    throw new Error('"data" must be a list of at least 2 non-negative whole numbers');
  }
  const base = problem.base ?? 'decimal';
  if (base !== 'decimal' && base !== 'binary') throw new Error(`"base" must be "decimal" or "binary", not "${base}"`);
  const passes = problem.passes ?? 4;
  if (!Number.isInteger(passes) || passes < 1 || passes > 20) throw new Error('"passes" must be a whole number from 1 to 20');
  const B = base === 'binary' ? 2 : 10;
  const digitsOfMax = Math.max(1, ...data.map((x) => x.toString(B).length));
  return { data: data.slice(), base, B, passes, width: Math.max(passes, digitsOfMax) };
}

const digit = (x, p, B) => Math.floor(x / B ** p) % B;

/** One stable pass on an order (list of indices into data); returns { order, buckets }. */
function pass(data, order, p, B) {
  const buckets = Array.from({ length: B }, () => []);
  for (const i of order) buckets[digit(data[i], p, B)].push(i);
  return { order: buckets.flat(), buckets };
}

/** The order after every pass: [{ order, buckets }] for p = 0 .. passes−1. */
function simulate(problem) {
  const { data, B, passes } = settings(problem);
  const out = [];
  let order = data.map((_, i) => i);
  for (let p = 0; p < passes; p++) {
    const r = pass(data, order, p, B);
    out.push(r);
    order = r.order;
  }
  return out;
}

/** "the units digit", "bit 2 (third from the right)" */
function digitName(problem, p) {
  const { base } = settings(problem);
  if (base === 'binary') {
    const ord = ['rightmost', 'second from the right', 'third from the right', 'fourth from the right'][p] || `${p + 1}th from the right`;
    return `bit ${p} (the ${ord})`;
  }
  return `the ${DECIMAL_NAMES[p] || `10^${p}`} digit`;
}

/** Digits of x in the problem's base, padded to the common width, most significant first. */
function digitsOf(problem, x) {
  const { B, width } = settings(problem);
  return x.toString(B).padStart(width, '0').split('');
}

function defaultPrompt(problem) {
  const { base, passes } = settings(problem);
  const how = base === 'binary'
    ? '<strong>in binary</strong> (base 2, one bit per pass; every number is also shown in binary)'
    : 'in base 10 (one decimal digit per pass)';
  return `<p>Sort the numbers with <strong>LSD radix sort</strong> ${how}, starting from the least significant `
    + 'digit. In each pass the numbers are distributed by that digit and collected bucket by bucket, keeping the order '
    + `of numbers with the same digit (each pass is stable). Show the array after each of the first <strong>${passes}</strong> passes.</p>`;
}

VE.radixSort = { settings, simulate, pass, digit, digitName, digitsOf, defaultPrompt };
})(globalThis.VE = globalThis.VE || {});
