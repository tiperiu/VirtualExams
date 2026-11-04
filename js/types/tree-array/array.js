// Pure helpers for "tree-array" questions (no DOM; also loaded by tools/grade.mjs).
//
// Problem format:
// {
//   "type": "tree-array",
//   "task": "layout" | "heap-insert" | "heap-remove",
//   "tree": { ...binary tree, same format as tree-traversal... },
//   "heap": "min" | "max",               // heap tasks only, default "min"; keys compared as numbers
//   "insert": [ { "id": "k4", "label": "4" } ],   // heap-insert: the new key(s), inserted in order
//   "removeCount": 1,                     // heap-remove: how many times the root is removed (default 1)
//   "slots": 12,                          // number of array cells shown (default: just enough)
//   "indexBase": 0                        // 0 (default) or 1, only changes the index labels
// }
// layout:  node at index i has children at 2i+1 and 2i+2 (shifted when indexBase is 1); empty
//          positions are X.
// heap-*:  the tree must be complete; its level order is the initial array.
// Response format: { "slots": ["A", null, "B", ...] }   (node ids; null = X)
(function (VE) {
'use strict';
const { normalizeTree, traverse } = VE.tree;

function allLabels(problem) {
  const { byId } = normalizeTree(problem.tree);
  const labels = new Map([...byId].map(([id, n]) => [id, n.label]));
  for (const x of problem.insert ?? []) labels.set(String(x.id), String(x.label ?? x.id));
  return labels;
}

function layoutSlots(root) {
  const out = [];
  const walk = (n, i) => {
    if (!n) return;
    out[i] = n.id;
    walk(n.children[0], 2 * i + 1);
    walk(n.children[1], 2 * i + 2);
  };
  walk(root, 0);
  return Array.from({ length: out.length }, (_, i) => out[i] ?? null);
}

function simulateHeap(problem, root, labels) {
  const start = layoutSlots(root);
  if (start.includes(null)) throw new Error('A heap must be a complete binary tree');
  const a = start.slice();
  const key = (id) => { const l = labels.get(id); const x = Number(l); return Number.isNaN(x) ? l : x; };
  const max = problem.heap === 'max';
  const before = (i, j) => (max ? key(a[i]) > key(a[j]) : key(a[i]) < key(a[j]));
  const swap = (i, j) => { [a[i], a[j]] = [a[j], a[i]]; };
  const siftUp = (i) => {
    while (i > 0) {
      const p = Math.floor((i - 1) / 2);
      if (!before(i, p)) break;
      swap(i, p); i = p;
    }
  };
  const siftDown = (i) => {
    for (;;) {
      const l = 2 * i + 1, r = l + 1;
      let best = i;
      if (l < a.length && before(l, best)) best = l;
      if (r < a.length && before(r, best)) best = r;
      if (best === i) break;
      swap(i, best); i = best;
    }
  };
  if (problem.task === 'heap-insert') {
    for (const x of problem.insert ?? []) { a.push(String(x.id)); siftUp(a.length - 1); }
  } else if (problem.task === 'heap-remove') {
    for (let k = 0; k < (problem.removeCount ?? 1) && a.length; k++) {
      const last = a.pop();
      if (a.length) { a[0] = last; siftDown(0); }
    }
  }
  return a;
}

/** The correct array (without padding), as node ids with null for X. */
function computeExpected(problem) {
  const { root } = normalizeTree(problem.tree);
  if (!problem.task || problem.task === 'layout') return layoutSlots(root);
  if (problem.task === 'heap-insert' || problem.task === 'heap-remove') return simulateHeap(problem, root, allLabels(problem));
  throw new Error(`Unknown tree-array task "${problem.task}"`);
}

function slotCount(problem) {
  return Math.max(problem.slots ?? 0, computeExpected(problem).length);
}

function pad(arr, n) {
  return Array.from({ length: n }, (_, i) => (arr[i] == null || arr[i] === 'X' ? null : String(arr[i])));
}

VE.treeArray = { allLabels, layoutSlots, computeExpected, slotCount, pad };
})(globalThis.VE = globalThis.VE || {});
