// Editor for "bst-update" problems.
(function (VE) {
'use strict';

const formatOps = (ops) => (ops || []).map((o) => ('insert' in o ? `insert ${o.insert}` : `delete ${o.delete}`)).join(', ');
function parseOps(text) {
  const parts = text.split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean);
  if (!parts.length) return undefined;
  return parts.map((x) => {
    const m = /^(insert|add|delete|remove)\s+(-?\d+)$/i.exec(x);
    if (!m) throw new Error(`"${x}": write e.g. "insert 25" or "delete 30"`);
    return /^(insert|add)$/i.test(m[1]) ? { insert: Number(m[2]) } : { delete: Number(m[2]) };
  });
}

VE.editors = VE.editors || {};
VE.editors['bst-update'] = {
  label: 'Search tree: insert / delete',
  promptNote: 'Leave the prompt empty to use the generated one, which names the tree, the operations and the deletion rule.',
  blank: () => ({
    problem: { type: 'bst-update', title: 'Search tree update', treeType: 'bst', keys: [50, 30, 70, 20, 40, 60, 80], operations: [{ insert: 45 }] },
    solution: { scoring: 'positional', explanation: '' },
  }),
  form(F, ctx) {
    const p = ctx.problem, s = ctx.solution;
    return [
      F.section('Question',
        F.field('Tree', F.select(p, 'treeType', [['bst', 'binary search tree'], ['avl', 'AVL tree (rebalanced with rotations)']])),
        F.field('Starting tree: keys in insertion order', F.numbers(p, 'keys', { placeholder: '50, 30, 70, 20, 40' }),
          'The starting tree is built by inserting these keys in this order (with AVL rebalancing for an AVL tree).'),
        F.field('Operations', F.parsed(p, 'operations', { format: formatOps, parse: parseOps, placeholder: 'insert 45, delete 30', mono: false }),
          'One or more, in order, e.g. "insert 45, delete 30". The student shows the tree after the last one.'),
        F.field('Drawing', F.check(p, 'externalNodes', 'show the external nodes (empty leaves) as small squares', { fallback: true }),
          'As in textbooks where keys are stored only at the internal nodes of a proper binary tree.'),
        F.field('Deleting a key with two children', F.select(p, 'replaceWith', [['successor', 'replace it with its in-order successor'], ['predecessor', 'replace it with its in-order predecessor']]))),
      F.section('Solution',
        F.note('The tree is computed by running the operations; every step (and every rotation) is listed in the explanation.'),
        F.field('Scoring', F.select(s, 'scoring', [['positional', 'partial: keys in the right place'], ['exact', 'all or nothing']])),
        F.explanation(s)),
    ];
  },
};
})(globalThis.VE = globalThis.VE || {});
