// Heap construction question: the keys are shown as draggable values (for the bottom-up method,
// as the initial array with its indices). The student drags them into the heap's array cells
// (VE.arrayFill). Below, the array is drawn as a tree, updated as the cells are filled, so the
// student can check the heap property.
// Response format: { "slots": ["k3", "k0", null, ...] }   (ids of the given keys: "k<index in data>")
(function (VE) {
'use strict';
const { h } = VE.util;
const { renderPrompt, drawTree, arrayFill } = VE;
const { settings, defaultPrompt } = VE.heapBuild;
const { normalizeTree } = VE.tree;

const keyId = (i) => `k${i}`;

function isAnswered(response) {
  return !!(response && Array.isArray(response.slots) && response.slots.some((x) => x != null));
}

function render({ container, problem, response, onChange, baseUrl }) {
  const s = settings(problem);
  const n = s.slots;
  const value = new Map(s.data.map((v, i) => [keyId(i), v]));
  container.append(renderPrompt({ ...problem, prompt: problem.prompt ?? defaultPrompt(problem) }, baseUrl));

  const treeBox = h('div', { class: 'hb-tree' });
  const drawTreeOf = (slots) => {
    treeBox.replaceChildren();
    if (slots[0] == null) {
      treeBox.append(h('p', { class: 'hb-tree-empty' }, 'Fill index 0 to see the tree.'));
      return;
    }
    const node = (i) => {
      if (i >= n || slots[i] == null) return null;
      const kids = [node(2 * i + 1), node(2 * i + 2)];
      while (kids.length && kids[kids.length - 1] == null) kids.pop();
      return { id: `c${i}`, label: String(value.get(slots[i])), children: kids };
    };
    const { root } = normalizeTree(node(0));
    const { element } = drawTree({ root, binary: true });
    element.setAttribute('aria-label', 'Your array drawn as a tree');
    element.querySelectorAll('.tt-node').forEach((b) => { b.tabIndex = -1; });
    treeBox.append(element);
  };

  const af = arrayFill({
    keys: s.data.map((_, i) => ({ id: keyId(i), index: i })),
    n,
    slots: response?.slots,
    text: (id) => String(value.get(id)),
    showIndex: s.method === 'bottom-up',
    poolLabel: s.method === 'insert' ? 'Keys, in insertion order' : 'Initial array',
    hint: 'Drag the keys into the heap array (or click a key to put it in the first empty cell). '
      + 'Drag a value to another cell to move it, or out of the array to clear the cell.',
    answerLabel: problem.answerLabel || `The ${s.heap}-heap as an array`,
    onChange: (slots) => { onChange({ slots }); drawTreeOf(slots); },
  });
  container.append(h('div', { class: 'hb-work' }, af.element,
    h('div', { class: 'field-label hb-tree-label' }, 'Your array as a tree'), treeBox));
  drawTreeOf(af.getSlots());
}

VE.views = VE.views || {};
VE.views['heap-build'] = { render, isAnswered };
})(globalThis.VE = globalThis.VE || {});
