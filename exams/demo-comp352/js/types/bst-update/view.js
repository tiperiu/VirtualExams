// Search-tree update question: the starting tree is drawn, and the student builds the tree after
// the insertion(s)/deletion(s) with VE.treeEdit, starting from a copy of it.
// Response format: { "positions": { "": 50, "L": 30, "LR": 40, ... } }   (path from the root → key)
(function (VE) {
'use strict';
const { h } = VE.util;
const { renderPrompt, treeEdit, drawPositions } = VE;
const { settings, simulate, defaultPrompt } = VE.bstUpdate;

function isAnswered(response) {
  return !!(response && response.positions && typeof response.positions === 'object');
}

function render({ container, problem, response, onChange, baseUrl }) {
  const s = settings(problem);
  const sim = simulate(problem);
  container.append(renderPrompt({ ...problem, prompt: problem.prompt ?? defaultPrompt(problem) }, baseUrl));
  container.append(h('div', { class: 'field-label' }, s.avl ? 'The AVL tree now' : 'The tree now'),
    h('div', { class: 'bu-start' }, drawPositions(sim.initial, { external: s.external })));
  const ops = s.operations.map((o) => `${o.op} ${o.key}`).join(', then ');
  const te = treeEdit({
    keys: sim.allKeys,
    levels: sim.levels,
    external: s.external,
    initial: sim.initial,
    positions: response?.positions && typeof response.positions === 'object' ? response.positions : sim.initial,
    answerLabel: `The tree after: ${ops}`,
    onChange: (positions) => onChange({ positions }),
  });
  container.append(te.element);
}

VE.views = VE.views || {};
VE.views['bst-update'] = { render, isAnswered };
})(globalThis.VE = globalThis.VE || {});
