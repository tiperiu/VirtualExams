// Sorting question, count only: the array and the pseudocode are shown; the student types how
// many swaps (or comparisons, with "count": "comparisons") the algorithm performs. The answer
// box accepts digits only.
// Response format: { "value": 7 }
(function (VE) {
'use strict';
const { h } = VE.util;
const { renderPrompt } = VE;
const { settings, defaultPrompt } = VE.sorting;
const { pseudocodeBox, arrayStrip } = VE.sortingUI;

function isAnswered(response) {
  return !!(response && Number.isInteger(response.value));
}

function render({ container, problem, response, onChange, baseUrl, questionId, autofocus = true }) {
  const s = settings(problem);
  container.append(renderPrompt({ ...problem, prompt: problem.prompt ?? defaultPrompt(problem, 'count') }, baseUrl));

  const id = `sc-${questionId}`;
  const unit = s.count === 'comparisons' ? 'comparisons' : 'swaps';
  const input = h('input', {
    id, class: 'sc-input', type: 'text', inputmode: 'numeric', pattern: '[0-9]*',
    maxlength: '5', autocomplete: 'off', spellcheck: 'false', placeholder: '0',
  });
  input.value = Number.isInteger(response?.value) ? String(response.value) : '';
  input.addEventListener('input', () => {
    const digits = input.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 5);
    if (digits !== input.value) input.value = digits;
    onChange({ value: digits === '' ? null : Number(digits) });
  });

  const work = h('div', { class: 'sort-work' },
    h('div', { class: 'field-label' }, 'Array'),
    arrayStrip(s.data),
    h('label', { class: 'field-label', for: id }, problem.answerLabel || `Number of ${unit}`),
    h('div', { class: 'sc-answer' }, input, h('span', { class: 'sc-unit' }, unit)),
    h('p', { class: 'q-hint' }, 'Digits only.'));
  container.append(h('div', { class: 'sort-layout' }, work, pseudocodeBox(problem, { markComparisons: s.count === 'comparisons' })));
  if (autofocus) setTimeout(() => input.focus({ preventScroll: true }), 0);
}

VE.views = VE.views || {};
VE.views['sort-count'] = { render, isAnswered };
})(globalThis.VE = globalThis.VE || {});
