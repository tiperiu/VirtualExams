// Editor for "mcq" problems.
(function (VE) {
'use strict';
const { h } = VE.util;

function nextOptionId(options) {
  const used = new Set(options.map((o) => o.id));
  for (let i = 0; ; i++) {
    const id = i < 26 ? String.fromCharCode(97 + i) : `o${i}`;
    if (!used.has(id)) return id;
  }
}

VE.editors = VE.editors || {};
VE.editors.mcq = {
  label: 'Multiple choice',
  blank: () => ({
    problem: {
      type: 'mcq', title: 'New multiple-choice question',
      prompt: '<p>Write the question here.</p>',
      multiple: false,
      options: [{ id: 'a', text: 'First option' }, { id: 'b', text: 'Second option' }, { id: 'c', text: 'Third option' }],
    },
    solution: { correct: ['a'], explanation: '' },
  }),

  form(F, ctx) {
    const p = ctx.problem, s = ctx.solution;
    p.options = p.options || [];
    s.correct = [].concat(s.correct ?? []);
    const list = h('div', { class: 'ed-options' });

    const draw = () => {
      list.replaceChildren();
      p.options.forEach((opt, i) => {
        const mark = h('input', { type: p.multiple ? 'checkbox' : 'radio', name: 'ed-correct', title: 'Correct answer', 'aria-label': `Option ${String.fromCharCode(65 + i)} is correct` });
        mark.checked = s.correct.includes(opt.id);
        mark.addEventListener('change', () => {
          if (p.multiple) s.correct = p.options.map((o) => o.id).filter((id) => (id === opt.id ? mark.checked : s.correct.includes(id)));
          else s.correct = [opt.id];
          ctx.changed();
        });
        const text = h('input', { type: 'text', placeholder: 'Option text', 'aria-label': `Option ${String.fromCharCode(65 + i)}` });
        text.value = opt.text ?? '';
        text.addEventListener('input', () => { opt.text = text.value; ctx.changed(); });
        const btn = (label, title, fn, disabled) => {
          const b = h('button', { type: 'button', class: 'ed-icon', title, 'aria-label': title, disabled: !!disabled }, label);
          b.addEventListener('click', () => { fn(); draw(); ctx.changed(); });
          return b;
        };
        const move = (d) => { const [x] = p.options.splice(i, 1); p.options.splice(i + d, 0, x); };
        list.append(h('div', { class: 'ed-option' },
          mark, h('span', { class: 'ed-letter' }, String.fromCharCode(65 + i)), text,
          btn('↑', 'Move up', () => move(-1), i === 0),
          btn('↓', 'Move down', () => move(1), i === p.options.length - 1),
          btn('×', 'Remove option', () => { p.options.splice(i, 1); s.correct = s.correct.filter((id) => id !== opt.id); }, p.options.length <= 2)));
      });
    };
    draw();
    const add = h('button', { type: 'button', class: 'btn btn-small' }, '+ Add option');
    add.addEventListener('click', () => { p.options.push({ id: nextOptionId(p.options), text: '' }); draw(); ctx.changed(); list.querySelector('.ed-option:last-child input[type=text]')?.focus(); });

    return [
      F.section('Question',
        F.check(p, 'multiple', 'Several answers can be correct (checkboxes)', {
          onChange: (multi) => { if (!multi && s.correct.length > 1) s.correct = s.correct.slice(0, 1); draw(); },
        }),
        h('div', { class: 'ed-field' }, h('label', {}, 'Options — mark the correct one(s)'), list, add)),
      F.section('Solution', F.note('The correct option(s) are marked above and saved in the solution file.'), F.explanation(s)),
    ];
  },
};
})(globalThis.VE = globalThis.VE || {});
