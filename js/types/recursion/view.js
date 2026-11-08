// Recursion question: the method is shown in the prompt; two single-answer menus ask for the running
// time and for the stack depth (space).
// Response format: { "time": 3, "space": 2 }   (indexes into the options, which are sorted by growth)
(function (VE) {
'use strict';
const { h } = VE.util;
const { renderPrompt } = VE;
const R = VE.recursion;
const B = VE.bigO || globalThis.BigO;

function isAnswered(r) {
  return !!(r && (Number.isInteger(r.time) || Number.isInteger(r.space)));
}

function render({ container, problem, response, onChange, baseUrl, questionId }) {
  const sol = R.solve(problem);
  const prompt = (problem.prompt ?? R.defaultPrompt()) + `<pre><code>${R.escapeHtml(sol.s.code)}</code></pre>`;
  container.append(renderPrompt({ ...problem, prompt }, baseUrl));
  const state = { time: Number.isInteger(response?.time) ? response.time : null, space: Number.isInteger(response?.space) ? response.space : null };
  const menu = (key, title) => {
    const labels = [];
    const list = h('div', { class: 'mcq-options as-row rc-menu', role: 'radiogroup', 'aria-label': title });
    sol.options.forEach((o, i) => {
      const input = h('input', { type: 'radio', name: `rc-${questionId}-${key}`, value: String(i) });
      input.checked = state[key] === i;
      const label = h('label', { class: `mcq-option as-opt rc-opt${state[key] === i ? ' selected' : ''}` }, input,
        h('span', { class: 'as-opt-text', html: `Θ(<span class="math">${B.html(B.parse(o))}</span>)` }));
      input.addEventListener('change', () => {
        state[key] = i;
        labels.forEach((l, k) => l.classList.toggle('selected', k === i));
        onChange({ ...state });
      });
      labels.push(label);
      list.append(label);
    });
    return h('div', { class: 'rc-part' }, h('div', { class: 'field-label' }, title), list);
  };
  container.append(menu('time', 'Running time'), menu('space', 'Stack depth (space)'));
}

VE.views = VE.views || {};
VE.views.recursion = { render, isAnswered };
})(globalThis.VE = globalThis.VE || {});
