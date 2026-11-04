// Editors for the sorting problems: "sort-count" and "sort-trace".
(function (VE) {
'use strict';

const ALGORITHMS = Object.entries(VE.sorting.ALGORITHMS);
const ORDERS = [['increasing', 'increasing'], ['decreasing', 'decreasing']];
const PROMPT_NOTE = 'Leave the prompt empty to use the generated one, which names the algorithm and the order.';

function common(F, p) {
  return [
    F.field('Numbers to sort', F.numbers(p, 'data'), 'Separated by commas or spaces.'),
    F.row(
      F.field('Algorithm', F.select(p, 'algorithm', ALGORITHMS)),
      F.field('Order', F.select(p, 'order', ORDERS))),
    F.check(p, 'showPseudocode', 'Show the pseudocode box', { fallback: true }),
  ];
}

VE.editors = VE.editors || {};

VE.editors['sort-count'] = {
  label: 'Sorting: count swaps',
  promptNote: PROMPT_NOTE,
  blank: () => ({
    problem: {
      type: 'sort-count', title: 'Counting swaps',
      data: [5, 2, 9, 1, 6, 3], algorithm: 'insertion', order: 'increasing', count: 'swaps',
    },
    solution: { explanation: '' },
  }),
  normalize(problem, solution) {
    if (solution && 'value' in solution) {
      delete solution.value;
      return ['The solution file gave the count explicitly ("value"); the editor uses the count computed by running the algorithm.'];
    }
    return [];
  },
  form(F, ctx) {
    const p = ctx.problem, s = ctx.solution;
    return [
      F.section('Question', ...common(F, p),
        F.field('Count', F.select(p, 'count', [['swaps', 'swaps'], ['comparisons', 'comparisons between array elements']]))),
      F.section('Solution',
        F.note('The count is computed by running the pseudocode; the list of swaps is added to the explanation automatically.'),
        F.explanation(s)),
    ];
  },
};

VE.editors['sort-trace'] = {
  label: 'Sorting: trace the swaps',
  promptNote: PROMPT_NOTE,
  blank: () => ({
    problem: {
      type: 'sort-trace', title: 'Tracing swaps',
      data: [5, 1, 8, 3, 9, 2], algorithm: 'selection', order: 'increasing', rows: 1,
    },
    solution: { scoring: 'prefix', explanation: '' },
  }),
  normalize(problem, solution) {
    if (solution && 'swaps' in solution) {
      delete solution.swaps;
      return ['The solution file listed the swaps explicitly; the editor uses the swaps computed by running the algorithm.'];
    }
    return [];
  },
  form(F, ctx) {
    const p = ctx.problem, s = ctx.solution;
    return [
      F.section('Question', ...common(F, p),
        F.field('Rows shown at the start', F.num(p, 'rows', { min: 1, max: 30, placeholder: '1' }), 'The student adds more rows as needed.')),
      F.section('Solution',
        F.note('The swaps are computed by running the pseudocode.'),
        F.field('Scoring', F.select(s, 'scoring', [['prefix', 'partial: swaps right before the first mistake'], ['exact', 'all or nothing']])),
        F.explanation(s)),
    ];
  },
};
})(globalThis.VE = globalThis.VE || {});
