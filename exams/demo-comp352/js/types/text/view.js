// Short / long text answer: prompt, optional image, a text box.
// Response format: { "text": "..." }
(function (VE) {
'use strict';
const { h } = VE.util;
const { renderPrompt } = VE;

function isAnswered(response) {
  return !!(response && typeof response.text === 'string' && response.text.trim());
}

function render({ container, problem, response, onChange, baseUrl, questionId, autofocus = true }) {
  container.append(renderPrompt(problem, baseUrl));
  const id = `text-${questionId}`;
  const attrs = {
    id,
    class: 'text-answer',
    placeholder: problem.placeholder || 'Type your answer here',
    maxlength: problem.maxLength || null,
    spellcheck: 'false',
    autocomplete: 'off',
  };
  const field = problem.multiline
    ? h('textarea', { ...attrs, rows: problem.rows || 6 })
    : h('input', { ...attrs, type: 'text' });
  field.value = response?.text ?? '';
  field.addEventListener('input', () => onChange({ text: field.value }));
  container.append(h('label', { class: 'field-label', for: id }, problem.answerLabel || 'Your answer'), field);
  if (autofocus) setTimeout(() => field.focus({ preventScroll: true }), 0);
}

VE.views = VE.views || {};
VE.views.text = { render, isAnswered };
})(globalThis.VE = globalThis.VE || {});
