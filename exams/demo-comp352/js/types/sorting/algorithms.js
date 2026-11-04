// Sorting simulator shared by the "sort-count" and "sort-trace" question types (pure, no DOM;
// also loaded by tools/grade.mjs).
//
// Problem fields used by both types:
//   "data":      [29, 10, 14, 37, 13]       the numbers to sort (2 or more)
//   "algorithm": "selection" | "insertion" | "quicksort-hoare" | "quicksort-lomuto"
//   "order":     "increasing" (default) | "decreasing"
//
// The simulation follows the pseudocode shown to the student (see pseudocode() below) exactly.
// A "swap" always exchanges two different positions: the pseudocode skips self-swaps
// (selection: m = i; Lomuto: i = j). A "comparison" is one evaluation of a comparison between
// array elements (or an element and the pivot); index tests like j > 0 do not count.
(function (VE) {
'use strict';

const ALGORITHMS = {
  selection: 'selection sort',
  insertion: 'insertion sort',
  'quicksort-hoare': 'quicksort (Hoare partition)',
  'quicksort-lomuto': 'quicksort (Lomuto partition)',
};
const ORDERS = ['increasing', 'decreasing'];
const COUNTS = ['swaps', 'comparisons'];

function settings(problem) {
  const algorithm = problem.algorithm;
  if (!ALGORITHMS[algorithm]) {
    throw new Error(`Unknown sorting algorithm "${algorithm}" (use one of: ${Object.keys(ALGORITHMS).join(', ')})`);
  }
  const order = problem.order ?? 'increasing';
  if (!ORDERS.includes(order)) throw new Error(`"order" must be "increasing" or "decreasing", not "${order}"`);
  const data = problem.data;
  if (!Array.isArray(data) || data.length < 2 || data.some((x) => typeof x !== 'number' || !Number.isFinite(x))) {
    throw new Error('"data" must be an array of at least 2 numbers');
  }
  const count = problem.count ?? 'swaps';
  if (!COUNTS.includes(count)) throw new Error(`"count" must be "swaps" or "comparisons", not "${count}"`);
  return { algorithm, order, data: data.slice(), count, name: ALGORITHMS[algorithm] };
}

/** Runs the algorithm. Returns { swaps: [[i, j], ...] (i < j), comparisons, sorted }. */
function simulate(problem) {
  const { algorithm, order, data } = settings(problem);
  const a = data.slice();
  const n = a.length;
  const swaps = [];
  let comparisons = 0;
  // before(x, y): x belongs strictly before y in the requested order (one comparison).
  const before = (x, y) => { comparisons++; return order === 'decreasing' ? x > y : x < y; };
  const swap = (i, j) => { [a[i], a[j]] = [a[j], a[i]]; swaps.push([Math.min(i, j), Math.max(i, j)]); };

  if (algorithm === 'selection') {
    for (let i = 0; i < n - 1; i++) {
      let m = i;
      for (let k = i + 1; k < n; k++) if (before(a[k], a[m])) m = k;
      if (m !== i) swap(i, m);
    }
  } else if (algorithm === 'insertion') {
    for (let i = 1; i < n; i++) {
      let j = i;
      while (j > 0 && before(a[j], a[j - 1])) { swap(j - 1, j); j--; }
    }
  } else if (algorithm === 'quicksort-lomuto') {
    const partition = (lo, hi) => {
      const pivot = a[hi];
      let i = lo - 1;
      for (let j = lo; j < hi; j++) {
        if (!before(pivot, a[j])) { i++; if (i !== j) swap(i, j); } // A[j] <= pivot
      }
      if (i + 1 !== hi) swap(i + 1, hi);
      return i + 1;
    };
    const quicksort = (lo, hi) => {
      if (lo < hi) { const p = partition(lo, hi); quicksort(lo, p - 1); quicksort(p + 1, hi); }
    };
    quicksort(0, n - 1);
  } else { // quicksort-hoare
    const partition = (lo, hi) => {
      const pivot = a[lo];
      let i = lo - 1, j = hi + 1;
      for (;;) {
        do i++; while (before(a[i], pivot));   // until A[i] >= pivot
        do j--; while (before(pivot, a[j]));   // until A[j] <= pivot
        if (i >= j) return j;
        swap(i, j);
      }
    };
    const quicksort = (lo, hi) => {
      if (lo < hi) { const p = partition(lo, hi); quicksort(lo, p); quicksort(p + 1, hi); }
    };
    quicksort(0, n - 1);
  }
  return { swaps, comparisons, sorted: a };
}

/** Applies swaps (pairs of positions; null entries are skipped) and returns every state. */
function applySwaps(data, pairs) {
  const states = [data.slice()];
  for (const p of pairs) {
    if (!p) continue;
    const next = states[states.length - 1].slice();
    [next[p[0]], next[p[1]]] = [next[p[1]], next[p[0]]];
    states.push(next);
  }
  return states;
}

/** "29↔10, 37↔13" — the values exchanged by each swap, at the time of the swap. */
function describeSwaps(data, pairs) {
  const a = data.slice();
  const parts = [];
  for (const p of pairs) {
    if (!p) continue;
    parts.push(`${a[p[0]]}↔${a[p[1]]}`);
    [a[p[0]], a[p[1]]] = [a[p[1]], a[p[0]]];
  }
  return parts.join(', ');
}

const plural = (k, word) => `${k} ${word}${k === 1 ? '' : 's'}`;

function isSorted(arr, order = 'increasing') {
  return arr.every((x, i) => i === 0 || (order === 'decreasing' ? arr[i - 1] >= x : arr[i - 1] <= x));
}

/** Pseudocode text for the problem's algorithm and order (0-based arrays). */
function pseudocode(problem, { markComparisons = false } = {}) {
  const { algorithm, order } = settings(problem);
  const dec = order === 'decreasing';
  const LT = dec ? '>' : '<', GT = dec ? '<' : '>', LE = dec ? '≥' : '≤', GE = dec ? '≤' : '≥';
  const C = markComparisons ? '   ◂ comparison' : '';
  if (algorithm === 'selection') return [
    'selectionSort(A[0..n−1])',
    '  for i ← 0 to n−2',
    '    m ← i',
    '    for k ← i+1 to n−1',
    `      if A[k] ${LT} A[m] then m ← k${C}`,
    '    if m ≠ i then swap A[i] and A[m]',
  ].join('\n');
  if (algorithm === 'insertion') return [
    'insertionSort(A[0..n−1])',
    '  for i ← 1 to n−1',
    '    j ← i',
    `    while j > 0 and A[j−1] ${GT} A[j]${C}`,
    '      swap A[j−1] and A[j]',
    '      j ← j − 1',
  ].join('\n');
  if (algorithm === 'quicksort-lomuto') return [
    '▹ first call: quicksort(A, 0, n−1)',
    'quicksort(A, lo, hi)',
    '  if lo < hi',
    '    p ← partition(A, lo, hi)',
    '    quicksort(A, lo, p−1)',
    '    quicksort(A, p+1, hi)',
    '',
    'partition(A, lo, hi)      ▹ Lomuto',
    '  pivot ← A[hi]',
    '  i ← lo − 1',
    '  for j ← lo to hi−1',
    `    if A[j] ${LE} pivot${C}`,
    '      i ← i + 1',
    '      if i ≠ j then swap A[i] and A[j]',
    '  if i+1 ≠ hi then swap A[i+1] and A[hi]',
    '  return i + 1',
  ].join('\n');
  return [
    '▹ first call: quicksort(A, 0, n−1)',
    'quicksort(A, lo, hi)',
    '  if lo < hi',
    '    p ← partition(A, lo, hi)',
    '    quicksort(A, lo, p)',
    '    quicksort(A, p+1, hi)',
    '',
    'partition(A, lo, hi)      ▹ Hoare',
    '  pivot ← A[lo]',
    '  i ← lo − 1;  j ← hi + 1',
    '  loop',
    `    repeat i ← i + 1 until A[i] ${GE} pivot${C}`,
    `    repeat j ← j − 1 until A[j] ${LE} pivot${C}`,
    '    if i ≥ j then return j',
    '    swap A[i] and A[j]',
  ].join('\n');
}

/** Prompt used when the problem file has no "prompt". kind: "count" | "trace". */
function defaultPrompt(problem, kind) {
  const { order, name, count } = settings(problem);
  const head = `<p>Sort the array into <strong>${order}</strong> order with <strong>${name}</strong>, `
    + 'following the pseudocode exactly.';
  if (kind === 'trace') {
    return head + ' Show every swap it performs, in order: <strong>one swap per row</strong>.</p>';
  }
  return head + (count === 'comparisons'
    ? ' How many <strong>comparisons</strong> between array elements (lines marked ◂) does it perform?</p>'
    : ' How many <strong>swaps</strong> does it perform?</p>');
}

VE.sorting = { ALGORITHMS, settings, simulate, applySwaps, describeSwaps, plural, isSorted, pseudocode, defaultPrompt };
})(globalThis.VE = globalThis.VE || {});
