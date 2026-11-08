// Heap construction, answered as a tree: the student drags the keys into the positions of a
// binary tree (VE.treeEdit, in "move only the node" mode, so two nodes can be swapped). Below the
// tree, the same tree is shown as an array, updated as the student works.
// Response format: { "positions": { "": 1, "L": 3, "R": 5, ... } }   (path from the root → key)
(function (VE) {
'use strict';
const { h } = VE.util;
const { renderPrompt, treeEdit } = VE;
const HT = VE.heapTree;

function isAnswered(response) {
  return !!(response && response.positions && typeof response.positions === 'object' && Object.keys(response.positions).length);
}

function render({ container, problem, response, onChange, baseUrl }) {
  const sol = HT.solve(problem);
  const s = sol.s;
  container.append(renderPrompt({ ...problem, prompt: problem.prompt ?? HT.defaultPrompt(problem) }, baseUrl));

  const arrayBox = h('div', { class: 'ht-array' });
  const showArray = (pos) => {
    const a = HT.toArray(pos);
    const n = Math.max(a.length, s.data.length);
    arrayBox.replaceChildren(h('table', { class: 'ht-cells', 'aria-label': 'Your tree as an array' },
      h('tr', {}, Array.from({ length: n }, (_, i) => h('td', { class: a[i] == null ? 'ht-gap' : null }, a[i] == null ? '' : String(a[i])))),
      h('tr', { class: 'ht-idx' }, Array.from({ length: n }, (_, i) => h('td', {}, String(i))))));
  };

  const start = response?.positions && typeof response.positions === 'object' ? response.positions : sol.initial;
  const te = treeEdit({
    keys: s.data,
    levels: s.levels,
    external: false,
    mode: 'node',
    initial: sol.initial,
    positions: start,
    poolLabel: s.method === 'insert' ? 'Keys, in insertion order' : 'Keys (all in the tree already)',
    hint: s.method === 'insert'
      ? 'Drag a key from the pool onto a dashed circle to put it in the tree. Drag a node onto another node to swap '
        + 'the two keys, onto a dashed circle to move it, or out of the tree to take it out.'
      : 'Drag a node onto another node to swap the two keys (a sift-down is a series of swaps). '
        + '“Start over” brings back the initial tree.',
    answerLabel: `The ${s.heap}-heap`,
    onChange: (positions) => { onChange({ positions }); showArray(positions); },
  });
  container.append(te.element, h('div', { class: 'field-label hb-tree-label' }, 'Your tree as an array (root at index 0)'), arrayBox);
  showArray(start);
}

VE.views = VE.views || {};
VE.views['heap-tree'] = { render, isAnswered };
})(globalThis.VE = globalThis.VE || {});
