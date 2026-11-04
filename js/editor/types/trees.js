// Editors for the tree problems: "tree-traversal" and "tree-array".
// The tree is edited as text, e.g. A(B(D, E), C(, F)) — see js/editor/tree-text.js.
// Node ids are regenerated from the labels every time the tree changes.
(function (VE) {
'use strict';
const { format, parse, idAllocator } = VE.treeText;

const TREE_HINT = 'Children go in parentheses, separated by commas. Leave a slot empty for a missing child: '
  + 'C(, F) means C has only a right child F.';

/** The tree text field. onTree() runs after every successful change of the tree. */
function treeField(F, ctx, onTree) {
  const p = ctx.problem;
  const holder = { text: p.tree ? format(p.tree) : '' };
  return F.field('Tree', F.parsed(holder, 'text', {
    rows: 2, placeholder: 'A(B(D, E), C(, F))',
    format: (t) => t,
    parse: (t) => { p.tree = parse(t); onTree?.(); return t; },
  }), TREE_HINT);
}

function treeIds(tree) {
  const ids = [];
  (function walk(n) { if (!n) return; ids.push(n.id); (n.children ?? []).forEach(walk); })(tree);
  return ids;
}

/** Explicit answers in the solution are dropped: the editor always uses the computed one. */
function dropExplicit(solution, key) {
  if (solution && key in solution) {
    delete solution[key];
    return [`The solution file listed the answer explicitly ("${key}"); the editor uses the answer computed from the tree instead.`];
  }
  return [];
}

VE.editors = VE.editors || {};

VE.editors['tree-traversal'] = {
  label: 'Tree traversal',
  blank: () => ({
    problem: {
      type: 'tree-traversal', title: 'New traversal question',
      prompt: '<p>List the nodes of this tree in <strong>pre-order</strong>.</p>',
      traversal: 'preorder', binary: true,
      tree: parse('A(B(D, E), C(, F))'),
    },
    solution: { scoring: 'exact', explanation: '' },
  }),
  normalize(problem, solution) {
    if (problem.tree) problem.tree = parse(format(problem.tree));
    return dropExplicit(solution, 'sequence');
  },
  form(F, ctx) {
    const p = ctx.problem, s = ctx.solution;
    return [
      F.section('Question',
        F.row(
          F.field('Traversal', F.select(p, 'traversal', [['preorder', 'pre-order'], ['inorder', 'in-order'], ['postorder', 'post-order'], ['levelorder', 'level-order (breadth-first)']])),
          F.field('Kind of tree', F.bool(p, 'binary', [[true, 'binary'], [false, 'general (any number of children)']]),
            'In-order needs a binary tree.')),
        treeField(F, ctx)),
      F.section('Solution',
        F.note('The correct order is computed from the tree.'),
        F.field('Scoring', F.select(s, 'scoring', [['exact', 'all or nothing'], ['positional', 'partial: fraction of positions right']])),
        F.explanation(s)),
    ];
  },
};

VE.editors['tree-array'] = {
  label: 'Tree → array (heaps)',
  blank: () => ({
    problem: {
      type: 'tree-array', task: 'layout', title: 'New tree-to-array question',
      prompt: '<p>Store this binary tree in an array: the children of index <code>i</code> go at <code>2i + 1</code> and <code>2i + 2</code>. Empty positions stay <strong>X</strong>.</p>',
      slots: 10, tree: parse('A(B(, D), C(E))'),
    },
    solution: { scoring: 'positional', explanation: '' },
  }),
  normalize(problem, solution) {
    if (problem.tree) problem.tree = parse(format(problem.tree));
    if (Array.isArray(problem.insert)) problem.insert = insertKeys(problem.tree, problem.insert.map((x) => String(x.label ?? x.id)));
    return dropExplicit(solution, 'slots');
  },
  form(F, ctx) {
    const p = ctx.problem, s = ctx.solution;
    const keys = { text: (p.insert ?? []).map((x) => x.label ?? x.id).join(', ') };
    const syncInsert = () => {
      const labels = keys.text.split(/[\s,;]+/).filter(Boolean);
      if (p.task === 'heap-insert' && labels.length) p.insert = insertKeys(p.tree, labels);
      else delete p.insert;
    };
    // keep only the fields that belong to the chosen task
    if (p.task !== 'heap-insert') delete p.insert;
    if (p.task !== 'heap-remove') delete p.removeCount;
    if (p.task === 'layout') delete p.heap;

    const heapField = F.field('Heap', F.select(p, 'heap', [['min', 'min-heap'], ['max', 'max-heap']]));
    if (p.task === 'layout') { delete p.heap; heapField.hidden = true; }
    const insertField = F.field('Keys to insert, in order', F.parsed(keys, 'text', {
      placeholder: '4', format: (t) => t,
      parse: (t) => { keys.text = t; syncInsert(); return t; },
    }), 'Shown to the student as extra values to drag.');
    insertField.hidden = p.task !== 'heap-insert';
    const removeField = F.field('Times the root is removed', F.num(p, 'removeCount', { min: 1, placeholder: '1' }));
    removeField.hidden = p.task !== 'heap-remove';

    return [
      F.section('Question',
        F.row(
          F.field('Task', F.select(p, 'task', [['layout', 'store the tree in an array'], ['heap-insert', 'heap: array after inserting keys'], ['heap-remove', 'heap: array after removing the root']], {
            onChange: (task) => {
              if (task === 'layout') delete p.heap; else p.heap = p.heap || 'min';
              if (task === 'heap-insert' && !keys.text) keys.text = '4';
              syncInsert();
              if (task !== 'heap-remove') delete p.removeCount;
              ctx.rerender();
            },
          })),
          heapField),
        F.row(insertField, removeField),
        F.row(
          F.field('Array cells shown', F.num(p, 'slots', { min: 1, placeholder: 'just enough' }),
            'Show more cells than needed so the student must also know where the array ends.'),
          F.field('First index label', F.select({ v: p.indexBase === 1 ? '1' : '0' }, 'v', [['0', '0'], ['1', '1']], {
            onChange: (v) => { if (v === '1') p.indexBase = 1; else delete p.indexBase; ctx.changed(); },
          }))),
        treeField(F, ctx, syncInsert),
        p.task === 'layout' ? null : F.note('For a heap the tree must be complete; keys are compared as numbers.')),
      F.section('Solution',
        F.note('The correct array is computed from the tree, by simulating the heap operation for heap tasks.'),
        F.field('Scoring', F.select(s, 'scoring', [['exact', 'all or nothing'], ['positional', 'partial: fraction of the cells right']])),
        F.explanation(s)),
    ];
  },
};

/** Ids for the new heap keys, never clashing with the tree's ids. */
function insertKeys(tree, labels) {
  const alloc = idAllocator();
  treeIds(tree).forEach((id) => alloc(id));
  return labels.map((label) => { const id = alloc(`${label}`); return id === label ? { id } : { id, label }; });
}
})(globalThis.VE = globalThis.VE || {});
