// Editor for "heap-tree" problems.
(function (VE) {
'use strict';

VE.editors = VE.editors || {};
VE.editors['heap-tree'] = {
  label: 'Heap: build from keys (draw the tree)',
  promptNote: 'Leave the prompt empty to use the generated one, which names the method and the kind of heap.',
  blank: () => ({
    problem: {
      type: 'heap-tree', title: 'Building a heap (tree)',
      data: [15, 8, 12, 3, 9, 5, 1], method: 'insert', heap: 'min',
    },
    solution: { scoring: 'positional', explanation: '' },
  }),
  form(F, ctx) {
    const p = ctx.problem, s = ctx.solution;
    return [
      F.section('Question',
        F.field('Keys', F.numbers(p, 'data', { placeholder: '15, 8, 12, 3, 9' }),
          `For insertion: the keys in insertion order. For bottom-up: the initial array (shown as the starting tree). All different, at most ${VE.heapTree.MAX_KEYS}.`),
        F.row(
          F.field('Method', F.select(p, 'method', [['insert', 'insert the keys one at a time'], ['bottom-up', 'bottom-up construction']])),
          F.field('Heap', F.select(p, 'heap', [['min', 'min-heap'], ['max', 'max-heap']])))),
      F.section('Solution',
        F.note('The heap is computed by running the construction; every step is listed in the explanation after submitting.'),
        F.field('Scoring', F.select(s, 'scoring', [['positional', 'partial: keys in the right place'], ['exact', 'all or nothing']])),
        F.explanation(s)),
    ];
  },
};
})(globalThis.VE = globalThis.VE || {});
