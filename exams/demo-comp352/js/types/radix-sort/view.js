// Radix sort question: one row per pass. Each row offers the numbers in the order of the row
// above (the initial array for pass 1), with the digit of that pass highlighted, and the student
// fills the array after the pass (VE.arrayFill: click the numbers in their new order, or drag
// them into the cells). In binary, every number shows its decimal value and its bits.
// Response format: { "stages": [["k3", "k0", ...], ...] }   (one list of key ids per pass)
(function (VE) {
'use strict';
const { h } = VE.util;
const { renderPrompt, arrayFill } = VE;
const { settings, digitName, digitsOf, defaultPrompt } = VE.radixSort;

const keyId = (i) => `k${i}`;

function isAnswered(response) {
  return !!(response && Array.isArray(response.stages) && response.stages.some((row) => Array.isArray(row) && row.some((x) => x != null)));
}

function render({ container, problem, response, onChange, baseUrl }) {
  const s = settings(problem);
  const n = s.data.length;
  const value = new Map(s.data.map((v, i) => [keyId(i), v]));
  const stages = Array.from({ length: s.passes }, (_, p) => (Array.isArray(response?.stages?.[p]) ? response.stages[p].slice() : []));

  container.append(renderPrompt({ ...problem, prompt: problem.prompt ?? defaultPrompt(problem) }, baseUrl));

  /** The number, its digits (binary) with digit p highlighted. */
  const numberView = (id, p) => {
    const x = value.get(id);
    const digits = digitsOf(problem, x);
    const firstSignificant = digits.findIndex((d) => d !== '0');
    const spans = digits.map((d, j) => {
      const pos = digits.length - 1 - j; // position from the right
      const cls = [pos === p ? 'rx-hl' : '', j < firstSignificant || firstSignificant < 0 && j < digits.length - 1 ? 'rx-lead' : ''].join(' ').trim();
      return h('span', { class: cls || null }, d);
    });
    if (s.base === 'binary') {
      return h('span', { class: 'rx-num rx-bin' }, h('span', { class: 'rx-dec' }, String(x)), h('span', { class: 'rx-bits' }, spans));
    }
    return h('span', { class: 'rx-num' }, spans);
  };

  const complete = (row) => row.length === n && row.every((id) => id != null) && new Set(row).size === n;
  const keysFor = (p) => {
    const prev = p === 0 ? s.data.map((_, i) => keyId(i)) : stages[p - 1];
    const order = p === 0 || complete(prev) ? prev : s.data.map((_, i) => keyId(i));
    return order.map((id) => ({ id, index: Number(id.slice(1)) }));
  };

  const widgets = [];
  const rows = h('div', { class: 'rx-rows' });
  for (let p = 0; p < s.passes; p++) {
    const af = arrayFill({
      keys: keysFor(p),
      n,
      slots: stages[p],
      wide: s.base === 'binary',
      text: (id) => (s.base === 'binary' ? `${value.get(id)} (${value.get(id).toString(2)})` : String(value.get(id))),
      render: (id) => numberView(id, p),
      emptyMark: '',
      poolLabel: p === 0 ? 'Initial array' : `The array after pass ${p}`,
      hint: p === 0
        ? 'Click the numbers in their order after this pass (or drag them into the cells). The highlighted digit is the one this pass sorts by. '
          + 'Each row starts from the row above once that row is complete.'
        : false,
      answerLabel: `After pass ${p + 1} — by ${digitName(problem, p)}`,
      onChange: (slots) => {
        stages[p] = slots;
        onChange({ stages: stages.map((row) => row.slice()) });
        for (let q = p + 1; q < s.passes; q++) widgets[q].setKeys(keysFor(q));
      },
    });
    stages[p] = af.getSlots();
    widgets.push(af);
    rows.append(h('section', { class: 'rx-pass', 'aria-label': `Pass ${p + 1}` },
      h('div', { class: 'rx-pass-title' }, `Pass ${p + 1}`, h('span', {}, ` · ${digitName(problem, p)}`)),
      af.element));
  }
  container.append(rows);
}

VE.views = VE.views || {};
VE.views['radix-sort'] = { render, isAnswered };
})(globalThis.VE = globalThis.VE || {});
