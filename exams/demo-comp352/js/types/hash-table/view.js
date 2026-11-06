// Hash table question: an information box explains h(k) = k mod m, the mod operation, the
// collision resolution and what counts as a collision. The student drags the keys (in insertion
// order) into the table's cells (VE.arrayFill) and types the number of collisions (digits only).
// Response format: { "slots": ["k2", null, "k0", ...], "collisions": 5 }   (key ids: "k<index>")
(function (VE) {
'use strict';
const { h } = VE.util;
const { renderPrompt, arrayFill } = VE;
const { settings, infoHtml, defaultPrompt } = VE.hashTable;

const keyId = (i) => `k${i}`;

function isAnswered(response) {
  return !!(response && ((Array.isArray(response.slots) && response.slots.some((x) => x != null))
    || Number.isInteger(response.collisions)));
}

function render({ container, problem, response, onChange, baseUrl, questionId }) {
  const s = settings(problem);
  const value = new Map(s.keys.map((k, i) => [keyId(i), k]));
  let state = { slots: response?.slots ?? [], collisions: Number.isInteger(response?.collisions) ? response.collisions : null };
  const emit = () => onChange({ slots: state.slots.slice(), collisions: state.collisions });

  container.append(renderPrompt({ ...problem, prompt: problem.prompt ?? defaultPrompt(problem) }, baseUrl));
  container.append(h('aside', { class: 'ht-info', 'aria-label': 'Hash function' },
    h('div', { class: 'sort-code-title' }, 'Hash function and collisions'),
    h('div', { class: 'ht-info-body', html: infoHtml(problem) })));

  const af = arrayFill({
    keys: s.keys.map((_, i) => ({ id: keyId(i), index: i })),
    n: s.size,
    slots: state.slots,
    text: (id) => String(value.get(id)),
    caption: (id) => {
      const k = value.get(id);
      return [h('span', {}, `h=${k % s.size}`), s.probing === 'double' ? h('span', {}, `h′=${s.q - (k % s.q)}`) : null];
    },
    emptyMark: '',
    poolLabel: 'Keys, in insertion order',
    hint: 'Drag each key into the cell where it ends up (or click a key to put it in the first empty cell). '
      + 'Drag a value to another cell to move it, or out of the table to clear the cell.',
    answerLabel: problem.answerLabel || `Hash table (size ${s.size})`,
    onChange: (slots) => { state.slots = slots; emit(); },
  });
  state.slots = af.getSlots();

  const id = `ht-${questionId}`;
  const input = h('input', {
    id, class: 'sc-input', type: 'text', inputmode: 'numeric', pattern: '[0-9]*',
    maxlength: '4', autocomplete: 'off', spellcheck: 'false', placeholder: '0',
  });
  input.value = state.collisions == null ? '' : String(state.collisions);
  input.addEventListener('input', () => {
    const digits = input.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 4);
    if (digits !== input.value) input.value = digits;
    state.collisions = digits === '' ? null : Number(digits);
    emit();
  });
  container.append(h('div', { class: 'ht-work' }, af.element,
    h('label', { class: 'field-label ht-count-label', for: id }, 'Total number of collisions'),
    h('div', { class: 'sc-answer' }, input, h('span', { class: 'sc-unit' }, 'collisions'))));
}

VE.views = VE.views || {};
VE.views['hash-table'] = { render, isAnswered };
})(globalThis.VE = globalThis.VE || {});
