// Editor for "asymptotic" problems (Big-O, Ω, Θ).
(function (VE) {
'use strict';

VE.editors = VE.editors || {};
VE.editors.asymptotic = {
  label: 'Big-O: O, Ω, Θ',
  promptNote: 'Leave the prompt empty to use the generated one for the chosen task.',
  blank: () => ({
    problem: { type: 'asymptotic', title: 'Prove a Big-O bound', task: 'witness', relation: 'O', f: '3n^2 + 5n + 17', g: 'n^2' },
    solution: { explanation: '' },
  }),
  form(F, ctx) {
    const p = ctx.problem, s = ctx.solution;
    const t = p.task || 'relation';
    const formulaHint = 'Plain text: 3n^2 + 5n log n + 17, n!, 2^(n+1), sqrt n, (log n)^2, log(n!) … log is base 2; ln, log10 also work.';
    const task = F.select(p, 'task', [['relation', 'O / Ω / Θ: tick the statements that hold'], ['tight', 'tightest bound: pick Θ(g)'],
      ['witness', 'find c and n₀: prove the bound'], ['rank', 'rank functions by growth']], {
      onChange: (v) => {
        // keep only the fields of the chosen task in the JSON
        const keep = { relation: ['f', 'g'], tight: ['f', 'options'], witness: ['f', 'g', 'relation'], rank: ['functions'] }[v];
        for (const k of ['f', 'g', 'relation', 'options', 'functions']) if (!keep.includes(k)) delete p[k];
        delete s.scoring;
        ctx.changed();
        ctx.rerender();
      },
    });
    const q = [F.field('Task', task)];
    if (t !== 'rank') q.push(F.field('f(n)', F.text(p, 'f', { placeholder: '3n^2 + 5n log n + 17', mono: true }), formulaHint));
    if (t === 'relation' || t === 'witness') q.push(F.field('g(n)', F.text(p, 'g', { placeholder: 'n^2', mono: true })));
    if (t === 'witness') q.push(F.field('Prove that f is', F.select(p, 'relation', [['O', 'O(g)'], ['Omega', 'Ω(g)'], ['Theta', 'Θ(g)']])));
    if (t === 'tight') q.push(F.field('Bounds to choose from, one per line', F.lines(p, 'options', { rows: 4, placeholder: 'n^2\nn^3\nn^3 log n\n2^n' }),
      'Exactly one of them must be Θ(f); the others are near misses.'));
    if (t === 'rank') q.push(F.field('Functions, one per line', F.lines(p, 'functions', { rows: 6, placeholder: 'n^2\nlog n\n2^n\nn log n' }),
      'Shown in this order, so do not list them sorted. Formulas: ' + formulaHint));
    const sol = [F.note('The answer is computed with the Big-O engine (the limit of f/g; for a proof the definition is checked for every n ≥ n₀), so any valid constants are accepted.')];
    if (t === 'relation') sol.push(F.field('Scoring', F.select(s, 'scoring', [['exact', 'all or nothing'], ['statements', 'partial: 1/3 per statement right']])));
    if (t === 'rank') sol.push(F.field('Scoring', F.select(s, 'scoring', [['pairs', 'partial: pairs in the right order'], ['exact', 'all or nothing']])));
    sol.push(F.explanation(s));
    return [F.section('Question', ...q), F.section('Solution', ...sol)];
  },
};
})(globalThis.VE = globalThis.VE || {});
