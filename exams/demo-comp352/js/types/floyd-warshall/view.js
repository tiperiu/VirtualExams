// Floyd–Warshall question: D(0) is shown; each matrix D(k) starts as a copy of the student's D(k-1),
// and the student changes the cells that improve (changed cells are shaded).
// Response format: { "levels": [{ "1,3": "7", ... }, ...] }   ("row,column" -> value typed; ∞ allowed)
(function (VE) {
'use strict';
const { h } = VE.util;
const { renderPrompt, drawGraph } = VE;
const F = VE.floydWarshall;
const G = VE.graph;

function isAnswered(r) {
  return !!(r && Array.isArray(r.levels) && r.levels.some((l) => l && Object.keys(l).length));
}

function render({ container, problem, response, onChange, baseUrl }) {
  const s = F.solve(problem);
  const { g, K } = s;
  const n = g.V.length;
  const edits = Array.from({ length: K }, (_, k) => ({ ...(response?.levels?.[k] || {}) }));
  const emit = () => onChange({ levels: edits.map((e) => ({ ...e })) });
  const value = (k, i, j) => {              // text of cell (i, j) of D(k), k = 0..K
    if (k === 0) return G.fmt(s.D0[i][j]);
    const e = edits[k - 1][`${i},${j}`];
    return e != null ? e : value(k - 1, i, j);
  };
  container.append(renderPrompt({ ...problem, prompt: problem.prompt ?? F.defaultPrompt(problem) }, baseUrl));
  container.append(h('div', { class: 'gd-box' }, drawGraph({ g, pos: G.layout(problem, g), width: problem.width || 460, height: problem.height || 280 }).svg));
  const labels = g.V.map((v, i) => `${v}`);
  const inputs = [];
  const table = (k) => {
    const t = h('table', { class: 'fw-matrix' }, h('tr', {}, h('th', { class: 'fw-corner' }, `D(${k})`), labels.map((l) => h('th', {}, l))));
    inputs[k] = [];
    for (let i = 0; i < n; i++) {
      const tr = h('tr', {}, h('th', {}, labels[i]));
      inputs[k][i] = [];
      for (let j = 0; j < n; j++) {
        if (k === 0) { tr.append(h('td', { class: 'fw-fixed' }, value(0, i, j))); continue; }
        const input = h('input', { class: 'fw-in', type: 'text', autocomplete: 'off', spellcheck: 'false', 'aria-label': `D(${k}) row ${labels[i]} column ${labels[j]}` });
        input.value = value(k, i, j);
        input.addEventListener('input', () => {
          let v = input.value.trim();
          if (/^(inf|oo)$/i.test(v)) { v = '∞'; input.value = v; }
          const key = `${i},${j}`;
          if (v === value(k - 1, i, j)) delete edits[k - 1][key]; else edits[k - 1][key] = v;
          refresh(k);
          emit();
        });
        inputs[k][i][j] = input;
        tr.append(h('td', {}, input));
      }
      t.append(tr);
    }
    return t;
  };
  const refresh = (from) => {
    for (let k = 1; k <= K; k++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const input = inputs[k][i][j];
      const mine = edits[k - 1][`${i},${j}`] != null;
      if (k > from && !mine && document.activeElement !== input) input.value = value(k, i, j);
      input.classList.toggle('fw-changed', mine);
      input.classList.toggle('as-err', input.value.trim() !== '' && G.readValue(input.value) == null);
    }
  };
  const grid = h('div', { class: 'fw-grid' }, h('div', { class: 'fw-level' }, h('div', { class: 'tc-title' }, 'D(0): the edge weights'), table(0)));
  for (let k = 1; k <= K; k++) grid.append(h('div', { class: 'fw-level' }, h('div', { class: 'tc-title' }, `D(${k}): through ${g.V[k - 1]} (v${k})`), table(k)));
  container.append(h('p', { class: 'q-hint' }, 'Each matrix starts as a copy of the one before: change only the cells that get shorter. Type ∞ as inf.'), grid);
  refresh(0);
}

VE.views = VE.views || {};
VE.views['floyd-warshall'] = { render, isAnswered };
})(globalThis.VE = globalThis.VE || {});
