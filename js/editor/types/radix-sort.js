// Editor for "radix-sort" problems.
(function (VE) {
'use strict';

VE.editors = VE.editors || {};
VE.editors['radix-sort'] = {
  label: 'Radix sort: passes',
  promptNote: 'Leave the prompt empty to use the generated one, which names the base and the number of passes.',
  blank: () => ({
    problem: { type: 'radix-sort', title: 'Radix sort', data: [329, 457, 657, 839, 436, 720, 355], base: 'decimal', passes: 3 },
    solution: { scoring: 'passes', explanation: '' },
  }),
  form(F, ctx) {
    const p = ctx.problem, s = ctx.solution;
    return [
      F.section('Question',
        F.field('Numbers', F.numbers(p, 'data', { placeholder: '329, 457, 657, 839' }), 'Non-negative whole numbers.'),
        F.row(
          F.field('Base', F.select(p, 'base', [['decimal', 'decimal (one digit per pass)'], ['binary', 'binary (one bit per pass; shows decimal and binary)']])),
          F.field('Passes the student shows', F.num(p, 'passes', { min: 1, max: 20, placeholder: '4' })))),
      F.section('Solution',
        F.note('The passes are computed by simulation; the buckets of every pass are listed in the explanation.'),
        F.field('Scoring', F.select(s, 'scoring', [['passes', 'partial: by passes right'], ['positional', 'partial: by cells right'], ['exact', 'all or nothing']]),
          'A pass after a mistake is checked against the student’s own previous row.'),
        F.explanation(s)),
    ];
  },
};
})(globalThis.VE = globalThis.VE || {});
