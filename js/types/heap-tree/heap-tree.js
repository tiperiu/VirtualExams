// "heap-tree" questions: the same constructions as "heap-build" (insertions or bottom-up), but the
// student draws the heap as a tree instead of filling in the array.
// Pure (no DOM); also loaded by tools/grade.mjs. Uses VE.heapBuild for the simulation.
//
// Problem fields: as for heap-build ("data", "method", "heap"), except "slots"; the keys must all be
// different (a key is a node), and at most 31 of them (5 levels).
// For "bottom-up", the starting tree is the initial array drawn as a tree; the student rearranges it.
// Positions are paths from the root ("" root, "L", "LR", ...); the node at array index i has its
// children at 2i + 1 (L) and 2i + 2 (R).
(function (VE) {
'use strict';
const HB = VE.heapBuild;
const MAX_KEYS = 31;

/** Array index of a path ("" -> 0, "L" -> 1, "R" -> 2, "LL" -> 3, ...). */
function indexOf(path) {
  let i = 0;
  for (const c of path) i = 2 * i + (c === 'L' ? 1 : 2);
  return i;
}
/** Path of an array index (the inverse of indexOf). */
function pathOf(i) {
  let p = '';
  while (i > 0) { p = (i % 2 === 1 ? 'L' : 'R') + p; i = Math.floor((i - 1) / 2); }
  return p;
}
/** { path: key } of an array (null cells are left out). */
const toPositions = (array) => Object.fromEntries(array.map((k, i) => [pathOf(i), k]).filter(([, k]) => k != null));
/** The array of a { path: key } tree, up to its last filled index (gaps are null). */
function toArray(pos) {
  const entries = Object.entries(pos).map(([p, k]) => [indexOf(p), k]);
  const n = entries.length ? Math.max(...entries.map(([i]) => i)) + 1 : 0;
  const a = Array(n).fill(null);
  for (const [i, k] of entries) a[i] = k;
  return a;
}
/** Levels of a complete tree with n nodes. */
const levelsFor = (n) => Math.floor(Math.log2(n)) + 1;

function settings(problem) {
  const s = HB.settings(problem);
  if (new Set(s.data).size !== s.data.length) throw new Error('the keys must all be different (each key is a node of the tree)');
  if (s.data.length > MAX_KEYS) throw new Error(`at most ${MAX_KEYS} keys`);
  // the tree the student needs, plus one level to spare (so the shape is not given away)
  return { ...s, levels: levelsFor(s.data.length) + 1 };
}

/** { final: {path: key}, array, initial: {path: key}, steps } */
function solve(problem) {
  const s = settings(problem);
  const { array, steps } = HB.simulate(problem);
  return { s, array, final: toPositions(array), initial: s.method === 'bottom-up' ? toPositions(s.data) : {}, steps };
}

/** What is wrong with a tree as a heap: { complete, ordered } (ordered: every parent before its children). */
function check(pos, heap) {
  const a = toArray(pos);
  const complete = a.every((k) => k != null);
  const before = (x, y) => (heap === 'max' ? x >= y : x <= y);
  const ordered = Object.entries(pos).every(([p, k]) => p === '' || !(p.slice(0, -1) in pos) || before(pos[p.slice(0, -1)], k));
  return { complete, ordered };
}

function defaultPrompt(problem) {
  const { method, heap } = settings(problem);
  const kind = `<strong>${heap}-heap</strong>`;
  if (method === 'insert') {
    return `<p>Build a ${kind} by <strong>inserting the keys one at a time</strong>, in the order given: `
      + 'each new key is added at the next free position of the last level and moved up. '
      + '<strong>Draw the heap as a tree</strong> at the end.</p>';
  }
  return `<p>The tree below is the initial array drawn as a complete binary tree. Turn it into a ${kind} with the `
    + '<strong>bottom-up construction</strong>: from the last node that has a child, back to the root, move each key down. '
    + '<strong>Draw the resulting heap</strong>.</p>';
}

VE.heapTree = { MAX_KEYS, indexOf, pathOf, toPositions, toArray, levelsFor, settings, solve, check, defaultPrompt };
})(globalThis.VE = globalThis.VE || {});
