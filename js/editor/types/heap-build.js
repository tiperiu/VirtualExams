// Editor for "heap-build" problems.
(function (VE) {
'use strict';

VE.editors = VE.editors || {};
VE.editors['heap-build'] = {
  label: 'Heap: build from keys',
  promptNote: 'Leave the prompt empty to use the generated one, which names the method and the kind of heap.',
  blank: () => ({
    problem: {
      type: 'heap-build', title: 'Building a heap',
      data: [15, 8, 12, 3, 9, 5, 1], method: 'insert', heap: 'min',
    },
    solution: { scoring: 'positional', explanation: '' },
  }),
  form(F, ctx) {
    const p = ctx.problem, s = ctx.solution;
    return [
      F.section('Question',
        F.field('Keys', F.numbers(p, 'data', { placeholder: '15, 8, 12, 3, 9' }),
          'For insertion: the keys in insertion order. For bottom-up: the initial array.'),
        F.row(
          F.field('Method', F.select(p, 'method', [['insert', 'insert the keys one at a time'], ['bottom-up', 'bottom-up construction']])),
          F.field('Heap', F.select(p, 'heap', [['min', 'min-heap'], ['max', 'max-heap']]))),
        F.field('Array cells shown', F.num(p, 'slots', { min: 2, placeholder: 'one per key' }),
          'More cells than keys show X’s at the end; the student leaves them empty.')),
      F.section('Solution',
        F.note('The heap is computed by running the construction; every step is listed in the explanation after submitting.'),
        F.field('Scoring', F.select(s, 'scoring', [['positional', 'partial: fraction of the cells right'], ['exact', 'all or nothing']])),
        F.explanation(s)),
    ];
  },
};
})(globalThis.VE = globalThis.VE || {});
