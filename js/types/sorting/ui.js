// DOM helpers shared by the sorting question types.
(function (VE) {
'use strict';
const { h } = VE.util;
const { settings, pseudocode } = VE.sorting;

/** Small box with the algorithm's pseudocode. Problem options: "showPseudocode": false hides it;
 *  "pseudocode": "..." replaces the generated text. */
function pseudocodeBox(problem, opts = {}) {
  if (problem.showPseudocode === false) return null;
  const { name, order } = settings(problem);
  return h('aside', { class: 'sort-code', 'aria-label': 'Pseudocode' },
    h('div', { class: 'sort-code-title' }, `Pseudocode · ${name} · ${order}`),
    h('pre', {}, problem.pseudocode ?? pseudocode(problem, opts)));
}

/** Read-only array with index labels. */
function arrayStrip(values) {
  return h('div', { class: 'sa-strip', role: 'list', 'aria-label': `Array: ${values.join(', ')}` },
    values.map((v, i) => h('div', { class: 'sa-cell', role: 'listitem' },
      h('span', { class: 'sa-idx' }, String(i)),
      h('span', { class: 'sa-val' }, String(v)))));
}

VE.sortingUI = { pseudocodeBox, arrayStrip };
})(globalThis.VE = globalThis.VE || {});
