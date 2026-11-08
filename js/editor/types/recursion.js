// Editor for "recursion" problems.
(function (VE) {
'use strict';

VE.editors = VE.editors || {};
VE.editors.recursion = {
  label: 'Recursion: time and stack depth',
  promptNote: 'Leave the prompt empty to use the generated one. The method is shown below the prompt.',
  blank: () => ({
    problem: { type: 'recursion', title: 'Recursion: time and space', calls: 1, reduction: 'n-1', work: 'constant' },
    solution: { scoring: 'partial', explanation: '' },
  }),
  form(F, ctx) {
    const p = ctx.problem, s = ctx.solution;
    return [
      F.section('The recursion (the answers are computed from it)',
        F.row(
          F.field('Recursive calls per call', F.select(p, 'calls', [['1', '1 (linear recursion)'], ['2', '2 (binary recursion)'], ['3', '3']], {
            onChange: (v) => { p.calls = Number(v); ctx.changed(); },
          })),
          F.field('Argument of each call', F.text(p, 'reduction', { placeholder: 'n-1, n-10 or n/2', mono: true, optional: false }))),
        F.field('Work in one call besides the recursion', F.select(p, 'work', [['constant', 'constant'], ['linear', 'a loop over n']])),
        F.field('Code shown to the student', F.area(p, 'code', { rows: 9, mono: true, placeholder: 'Leave empty to show a generated method f(n)' }),
          'Write your own method (e.g. sum, fast power, Hanoi) and describe its recursion above, so the answers are right.')),
      F.section('Solution',
        F.note('Both answers and the explanation (recurrence, number of calls, why the stack is that deep) are computed.'),
        F.field('Scoring', F.select(s, 'scoring', [['partial', 'partial: half the points for each answer'], ['exact', 'all or nothing']])),
        F.explanation(s)),
    ];
  },
};
})(globalThis.VE = globalThis.VE || {});
