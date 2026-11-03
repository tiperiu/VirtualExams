// Multiple-choice question: prompt, optional image, options (single or multiple answers).
// Response format: { "selected": ["b"] }   (option ids)
(function (VE) {
'use strict';
const { h } = VE.util;
const { renderPrompt } = VE;

function isAnswered(response) {
  return !!(response && Array.isArray(response.selected) && response.selected.length);
}

function render({ container, problem, response, onChange, baseUrl, questionId }) {
  const multiple = !!problem.multiple;
  let selected = new Set(response?.selected ?? []);

  container.append(renderPrompt(problem, baseUrl));
  if (multiple) container.append(h('p', { class: 'q-hint' }, 'Select all that apply.'));

  const name = `mcq-${questionId}`;
  const list = h('div', { class: 'mcq-options', role: multiple ? 'group' : 'radiogroup' });
  const labels = [];

  const refresh = () => labels.forEach(({ label, id }) => label.classList.toggle('selected', selected.has(id)));

  problem.options.forEach((opt, i) => {
    const input = h('input', { type: multiple ? 'checkbox' : 'radio', name, value: opt.id });
    input.checked = selected.has(opt.id);
    input.addEventListener('change', () => {
      if (multiple) {
        if (input.checked) selected.add(opt.id); else selected.delete(opt.id);
      } else {
        selected = new Set([opt.id]);
      }
      refresh();
      onChange({ selected: problem.options.map((o) => o.id).filter((id) => selected.has(id)) });
    });
    const label = h('label', { class: 'mcq-option' },
      input,
      h('span', { class: 'mcq-letter', 'aria-hidden': 'true' }, String.fromCharCode(65 + i)),
      h('span', { class: 'mcq-text' }, opt.text),
      opt.image ? h('img', { class: 'mcq-img', src: new URL(opt.image, baseUrl).href, alt: '' }) : null);
    labels.push({ label, id: opt.id });
    list.append(label);
  });
  container.append(list);

  container.append(h('button', {
    type: 'button', class: 'link-btn',
    onClick: () => {
      selected = new Set();
      list.querySelectorAll('input').forEach((el) => { el.checked = false; });
      refresh();
      onChange({ selected: [] });
    },
  }, 'Clear answer'));

  refresh();
}

VE.views = VE.views || {};
VE.views.mcq = { render, isAnswered };
})(globalThis.VE = globalThis.VE || {});
