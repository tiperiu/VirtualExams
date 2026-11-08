// Asymptotic-notation question (task in the problem: relation, tight, witness or rank).
// Response formats:
//   relation  { "selected": ["O", "Theta"] }
//   tight     { "choice": 2 }                           (index into "options")
//   witness   { "c": "25", "n0": "1" }  or  { "c1": "1/4", "c2": "3", "n0": "10" }   (as typed)
//   rank      { "order": [3, 0, 2, 1] }                 (indexes into "functions", slowest first)
(function (VE) {
'use strict';
const { h } = VE.util;
const { renderPrompt } = VE;
const A = VE.asymptotic;

function isAnswered(r) {
  if (!r) return false;
  if (Array.isArray(r.selected)) return r.selected.length > 0;
  if (Number.isInteger(r.choice)) return true;
  if (Array.isArray(r.order)) return true;
  return ['c', 'c1', 'c2', 'n0'].some((k) => r[k] != null && String(r[k]).trim() !== '');
}

const big = (...parts) => h('div', { class: 'as-big', html: parts.join('<span class="as-gap"></span>') });

function render({ container, problem, response, onChange, baseUrl, questionId }) {
  const s = A.settings(problem);
  container.append(renderPrompt({ ...problem, prompt: problem.prompt ?? A.defaultPrompt(problem) }, baseUrl));

  if (s.task === 'relation') {
    container.append(big(`f(n) = ${A.math(s.f)}`, `g(n) = ${A.math(s.g)}`));
    const sel = new Set(response?.selected ?? []);
    const list = h('div', { class: 'mcq-options as-row', role: 'group', 'aria-label': 'Statements' });
    for (const r of ['O', 'Omega', 'Theta']) {
      const input = h('input', { type: 'checkbox', value: r });
      input.checked = sel.has(r);
      const label = h('label', { class: `mcq-option as-opt${sel.has(r) ? ' selected' : ''}` }, input,
        h('span', { class: 'as-opt-text', html: `f = ${A.REL[r]}(g)` }));
      input.addEventListener('change', () => {
        if (input.checked) sel.add(r); else sel.delete(r);
        label.classList.toggle('selected', input.checked);
        onChange({ selected: ['O', 'Omega', 'Theta'].filter((x) => sel.has(x)) });
      });
      list.append(label);
    }
    container.append(list, h('p', { class: 'q-hint' }, 'Tick every statement that is true; leave the others empty.'));
    return;
  }

  if (s.task === 'tight') {
    container.append(big(`${A.math(s.f)} &nbsp;is&nbsp; Θ( ? )`));
    let choice = Number.isInteger(response?.choice) ? response.choice : null;
    const name = `as-${questionId}`;
    const labels = [];
    const list = h('div', { class: 'mcq-options as-row', role: 'radiogroup', 'aria-label': 'Bounds' });
    s.options.forEach((g, i) => {
      const input = h('input', { type: 'radio', name, value: String(i) });
      input.checked = choice === i;
      const label = h('label', { class: `mcq-option as-opt${choice === i ? ' selected' : ''}` }, input,
        h('span', { class: 'as-opt-text', html: `Θ(${A.math(g)})` }));
      input.addEventListener('change', () => {
        choice = i;
        labels.forEach((l, k) => l.classList.toggle('selected', k === i));
        onChange({ choice: i });
      });
      labels.push(label);
      list.append(label);
    });
    container.append(list);
    return;
  }

  if (s.task === 'witness') {
    container.append(big(`f(n) = ${A.math(s.f)}`, `g(n) = ${A.math(s.g)}`));
    const keys = s.relation === 'Theta' ? [['c1', 'c₁'], ['c2', 'c₂'], ['n0', 'n₀']] : [['c', 'c'], ['n0', 'n₀']];
    const state = {};
    keys.forEach(([k]) => { if (response?.[k] != null) state[k] = String(response[k]); });
    const row = h('div', { class: 'as-wit' });
    for (const [k, label] of keys) {
      const id = `as-${questionId}-${k}`;
      const input = h('input', { id, class: 'as-wit-input', type: 'text', inputmode: 'decimal', autocomplete: 'off', spellcheck: 'false', placeholder: k === 'n0' ? '1' : 'e.g. 4 or 1/4' });
      input.value = state[k] ?? '';
      const check = () => {
        const v = input.value.trim();
        const ok = v === '' || A.readConstant(v) != null;
        input.classList.toggle('as-err', !ok);
        input.setAttribute('aria-invalid', String(!ok));
      };
      input.addEventListener('input', () => {
        state[k] = input.value;
        check();
        onChange({ ...state });
      });
      check();
      row.append(h('label', { class: 'as-wit-field', for: id }, h('span', { class: 'math' }, `${label} =`), input));
    }
    container.append(h('div', { class: 'as-def', html: `Definition: <strong>${A.DEF[s.relation]}</strong> for every n ≥ n₀, with constants &gt; 0.` }),
      row,
      h('p', { class: 'q-hint' }, 'Tip: make the constant big enough to swallow the smaller terms, e.g. 3n² + 5n + 17 ≤ 3n² + 5n² + 17n² = 25n² for n ≥ 1. Fractions like 1/4 are fine.'));
    return;
  }

  // rank
  let order = Array.isArray(response?.order) && response.order.length === s.functions.length ? response.order.slice() : s.functions.map((_, i) => i);
  const list = h('ol', { class: 'as-rank', 'aria-label': 'Functions, slowest growing first' });
  const draw = (focus) => {
    list.replaceChildren();
    order.forEach((fi, pos) => {
      const up = h('button', { type: 'button', class: 'as-move', 'aria-label': 'Move up', disabled: pos === 0 ? '' : null }, '▲');
      const down = h('button', { type: 'button', class: 'as-move', 'aria-label': 'Move down', disabled: pos === order.length - 1 ? '' : null }, '▼');
      up.addEventListener('click', () => move(pos, -1));
      down.addEventListener('click', () => move(pos, 1));
      list.append(h('li', { class: 'as-rank-item', 'data-i': String(fi) }, h('span', { class: 'as-rank-pos' }, String(pos + 1)),
        h('span', { class: 'as-rank-f', html: A.math(s.functions[fi]) }), up, down));
    });
    if (focus) list.children[focus.pos]?.querySelectorAll('.as-move')[focus.dir < 0 ? 0 : 1]?.focus();
  };
  const move = (pos, d) => {
    const j = pos + d;
    if (j < 0 || j >= order.length) return;
    [order[pos], order[j]] = [order[j], order[pos]];
    onChange({ order: order.slice() });
    draw({ pos: j, dir: d });
  };
  draw();
  container.append(h('div', { class: 'as-rank-end' }, 'slowest growing'), list, h('div', { class: 'as-rank-end' }, 'fastest growing'),
    h('div', { class: 'as-rank-actions' },
      h('span', { class: 'q-hint' }, 'Move the functions with ▲ ▼.'),
      h('button', { type: 'button', class: 'link-btn', onClick: () => onChange({ order: order.slice() }) }, 'Keep this order as my answer')));
}

VE.views = VE.views || {};
VE.views.asymptotic = { render, isAnswered };
})(globalThis.VE = globalThis.VE || {});
