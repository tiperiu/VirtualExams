// Editor for "hash-table" problems.
(function (VE) {
'use strict';

VE.editors = VE.editors || {};
VE.editors['hash-table'] = {
  label: 'Hash table: insert keys',
  promptNote: 'Leave the prompt empty to use the generated one. The box explaining h(k) = k mod m, the probing and the collisions is always shown.',
  blank: () => ({
    problem: { type: 'hash-table', title: 'Hashing with linear probing', keys: [27, 53, 13, 10, 38, 49, 24, 35], size: 11, probing: 'linear' },
    solution: { scoring: 'partial', explanation: '' },
  }),
  form(F, ctx) {
    const p = ctx.problem, s = ctx.solution;
    const qField = F.field('q for h′(k) = q − (k mod q)', F.num(p, 'q', { min: 1, placeholder: 'largest prime below m' }));
    qField.hidden = p.probing !== 'double';
    return [
      F.section('Question',
        F.field('Keys, in insertion order', F.numbers(p, 'keys', { placeholder: '27, 53, 13, 10' }),
          'Different non-negative whole numbers.'),
        F.row(
          F.field('Table size m (h(k) = k mod m)', F.num(p, 'size', { min: 2, placeholder: '11' })),
          F.field('Collision resolution', F.select(p, 'probing', [['linear', 'linear probing'], ['quadratic', 'quadratic probing'], ['double', 'double hashing']], {
            onChange: (v) => { qField.hidden = v !== 'double'; if (v !== 'double') { delete p.q; } },
          }))),
        qField),
      F.section('Solution',
        F.note('The table and the number of collisions are computed by simulation; the cells tried for every key are listed in the explanation.'),
        F.field('Scoring', F.select(s, 'scoring', [['partial', 'partial: 75% for the table (by cells), 25% for the count'], ['exact', 'all or nothing']])),
        F.explanation(s)),
    ];
  },
};
})(globalThis.VE = globalThis.VE || {});
