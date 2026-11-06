// Heap construction for "heap-build" questions (pure, no DOM; also loaded by tools/grade.mjs).
//
// Problem fields:
//   "data":   [15, 8, 12, 3]        the keys (numbers)
//   "method": "insert"              insert the keys one at a time, in the given order (sift up)
//           | "bottom-up"           the keys are the initial array; heapify it bottom-up (sift down
//                                   from the last node that has a child back to the root)
//   "heap":   "min" (default) | "max"
//   "slots":  number of array cells shown (default: one per key)
//
// A key moves only past a strictly larger key (min-heap) / strictly smaller key (max-heap).
// In a sift-down the key goes to the better child; if both children are equal, the left one.
(function (VE) {
'use strict';

const METHODS = { insert: 'inserting the keys one at a time', 'bottom-up': 'bottom-up construction' };

function settings(problem) {
  const method = problem.method ?? 'insert';
  if (!METHODS[method]) throw new Error(`"method" must be "insert" or "bottom-up", not "${method}"`);
  const heap = problem.heap ?? 'min';
  if (heap !== 'min' && heap !== 'max') throw new Error(`"heap" must be "min" or "max", not "${heap}"`);
  const data = problem.data;
  if (!Array.isArray(data) || data.length < 2 || data.some((x) => typeof x !== 'number' || !Number.isFinite(x))) {
    throw new Error('"data" must be an array of at least 2 numbers');
  }
  const slots = Math.max(problem.slots ?? data.length, data.length);
  return { method, heap, data: data.slice(), slots };
}

/** { array, steps: [{ text, state }] } — the heap array and the state after each step. */
function simulate(problem) {
  const { method, heap, data } = settings(problem);
  const before = (x, y) => (heap === 'max' ? x > y : x < y);
  const steps = [];
  let a;
  const siftDown = (i, n) => {
    for (;;) {
      let c = 2 * i + 1;
      if (c >= n) return;
      if (c + 1 < n && before(a[c + 1], a[c])) c += 1;
      if (!before(a[c], a[i])) return;
      [a[i], a[c]] = [a[c], a[i]];
      i = c;
    }
  };
  if (method === 'insert') {
    a = [];
    for (const key of data) {
      a.push(key);
      let i = a.length - 1;
      while (i > 0) {
        const p = Math.floor((i - 1) / 2);
        if (!before(a[i], a[p])) break;
        [a[i], a[p]] = [a[p], a[i]];
        i = p;
      }
      steps.push({ text: `insert ${key}`, state: a.slice() });
    }
  } else {
    a = data.slice();
    steps.push({ text: 'start', state: a.slice() });
    for (let i = Math.floor(a.length / 2) - 1; i >= 0; i--) {
      const key = a[i];
      siftDown(i, a.length);
      steps.push({ text: `sift down index ${i} (${key})`, state: a.slice() });
    }
  }
  return { array: a, steps };
}

function defaultPrompt(problem) {
  const { method, heap } = settings(problem);
  const kind = `<strong>${heap}-heap</strong>`;
  if (method === 'insert') {
    return `<p>Build a ${kind} by <strong>inserting the keys one at a time</strong>, in the order given: `
      + 'each new key is added at the end of the array and moved up. Show the array that stores the heap at the end, '
      + 'with the root at index 0.</p>';
  }
  return `<p>Turn the array below into a ${kind} with the <strong>bottom-up construction</strong>: from the last `
    + 'node that has a child, back to the root, move each key down. Show the resulting array, with the root at index 0.</p>';
}

VE.heapBuild = { METHODS, settings, simulate, defaultPrompt };
})(globalThis.VE = globalThis.VE || {});
