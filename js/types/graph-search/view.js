// Graph search question: the graph is drawn; the student builds the order with VE.arrayFill and
// types the d (and f, for DFS) value of every vertex.
// Response format: { "order": ["A", "C", null, ...], "d": { "A": "0", ... }, "f": { "A": "12", ... } }
(function (VE) {
'use strict';
const { h } = VE.util;
const { renderPrompt, arrayFill, drawGraph } = VE;
const S = VE.graphSearch;
const G = VE.graph;

function isAnswered(r) {
  return !!(r && ((Array.isArray(r.order) && r.order.some(Boolean)) || Object.values(r.d || {}).some((x) => String(x).trim())
    || Object.values(r.f || {}).some((x) => String(x).trim())));
}

/** A small input for d / f: digits, or ∞ (typed as inf). */
function valueInput(value, label, onInput) {
  const input = h('input', { class: 'gs-val', type: 'text', autocomplete: 'off', spellcheck: 'false', 'aria-label': label, placeholder: '' });
  input.value = value ?? '';
  const check = () => {
    const v = input.value.trim();
    input.classList.toggle('as-err', v !== '' && G.readValue(v) == null);
  };
  input.addEventListener('input', () => {
    if (/^(inf|oo)$/i.test(input.value.trim())) input.value = '∞';
    check();
    onInput(input.value);
  });
  check();
  return input;
}

function render({ container, problem, response, onChange, baseUrl }) {
  const s = S.solve(problem);
  container.append(renderPrompt({ ...problem, prompt: problem.prompt ?? S.defaultPrompt(problem) }, baseUrl));
  container.append(h('div', { class: 'gd-box' }, drawGraph({ g: s.g, pos: G.layout(problem, s.g), width: problem.width || 520, height: problem.height || 300 }).svg));
  const state = {
    order: Array.isArray(response?.order) ? response.order.slice() : [],
    d: { ...(response?.d || {}) },
    f: { ...(response?.f || {}) },
  };
  const emit = () => onChange({ order: state.order.slice(), d: { ...state.d }, ...(s.withF ? { f: { ...state.f } } : {}) });
  const af = arrayFill({
    keys: s.g.V.map((v, i) => ({ id: v, index: i })),
    n: s.g.V.length,
    slots: state.order,
    text: (id) => id,
    emptyMark: '',
    poolLabel: 'Vertices',
    hint: 'Drag the vertices into the order (or click a vertex to put it in the first empty cell). Leave cells empty if some vertices are never reached.',
    answerLabel: S.orderLabel(s.algorithm),
    onChange: (slots) => { state.order = slots; emit(); },
  });
  state.order = af.getSlots();
  const head = h('tr', {}, h('th', {}, 'vertex'), s.g.V.map((v) => h('th', {}, v)));
  const row = (key, label) => h('tr', {}, h('th', {}, label), s.g.V.map((v) => h('td', {},
    valueInput(state[key][v], `${label} of ${v}`, (x) => { state[key][v] = x; emit(); }))));
  const table = h('table', { class: 'gs-table' }, head, row('d', 'd'), s.withF ? row('f', 'f') : null);
  container.append(af.element,
    h('div', { class: 'field-label' }, s.withF ? 'Discovery time d and finishing time f' : s.algorithm === 'bfs' ? 'Distance d (number of edges)' : 'Final distance d'),
    h('div', { class: 'gs-scroll' }, table),
    h('p', { class: 'q-hint' }, 'Type ∞ as inf.'));
}

VE.views = VE.views || {};
VE.views['graph-search'] = { render, isAnswered };
})(globalThis.VE = globalThis.VE || {});
