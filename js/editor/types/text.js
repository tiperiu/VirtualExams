// Editor for "text" problems.
(function (VE) {
'use strict';

VE.editors = VE.editors || {};
VE.editors.text = {
  label: 'Text answer',
  blank: () => ({
    problem: { type: 'text', title: 'New text question', prompt: '<p>Write the question here.</p>', placeholder: '', multiline: false },
    solution: { accepted: ['answer'], caseSensitive: false, ignoreWhitespace: true, explanation: '' },
  }),

  form(F, ctx) {
    const p = ctx.problem, s = ctx.solution;
    const rows = F.field('Rows', F.num(p, 'rows', { min: 2, max: 30, placeholder: '6' }));
    rows.hidden = !p.multiline;
    return [
      F.section('Question',
        F.row(
          F.field('Answer box label', F.text(p, 'answerLabel', { placeholder: 'Your answer' })),
          F.field('Placeholder', F.text(p, 'placeholder', { placeholder: 'e.g. O(...)' }))),
        F.row(
          F.field('Maximum length', F.num(p, 'maxLength', { min: 1, placeholder: 'none' })),
          rows),
        F.check(p, 'multiline', 'Several lines (text area, monospaced)', { onChange: (on) => { rows.hidden = !on; } })),
      F.section('Solution',
        F.field('Accepted answers, one per line', F.lines(s, 'accepted', { rows: 3, placeholder: 'O(n log n)' }),
          'The first one is shown as "the correct answer". Leave both lists empty to grade by hand.'),
        F.field('Accepted patterns (regular expressions), one per line', F.lines(s, 'patterns', {
          rows: 2, placeholder: '^o\\(nlogn\\)$',
          validate: (x, i) => { try { new RegExp(x, 'u'); } catch (e) { throw new Error(`line ${i + 1}: ${e.message}`); } },
        }), 'Tested against the answer after it is normalized (see below).'),
        F.check(s, 'caseSensitive', 'Case sensitive'),
        F.check(s, 'ignoreWhitespace', 'Ignore all spaces and line breaks', { fallback: true }),
        F.explanation(s)),
    ];
  },
};
})(globalThis.VE = globalThis.VE || {});
