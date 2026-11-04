// Sorting question, full trace: the student records every swap the algorithm makes.
// The first row is the initial array. Each further row starts as a copy of the row above, and
// the student makes exactly one swap in it: click a value, then another value in the same row
// (or drag one value onto the other). "Add a row" adds the next row; each row can be reset
// (↺) or removed (×). Rows are stored as the swapped positions, so changing an earlier row
// updates the rows below it.
// Response format: { "swaps": [[0, 3], [1, 4], null, ...] }   (null = a row with no swap yet)
(function (VE) {
'use strict';
const { h } = VE.util;
const { renderPrompt } = VE;
const { settings, defaultPrompt, applySwaps } = VE.sorting;
const { pseudocodeBox } = VE.sortingUI;

function isAnswered(response) {
  return !!(response && Array.isArray(response.swaps) && response.swaps.some((p) => Array.isArray(p)));
}

function render({ container, problem, response, onChange, baseUrl }) {
  const s = settings(problem);
  const n = s.data.length;
  const valid = (p) => Array.isArray(p) && p.length === 2 && p.every((x) => Number.isInteger(x) && x >= 0 && x < n) && p[0] !== p[1];
  let pairs = (response?.swaps ?? []).map((p) => (valid(p) ? [Math.min(...p), Math.max(...p)] : null));
  while (pairs.length < (problem.rows ?? 1)) pairs.push(null);
  let sel = null; // { row, col } — first value picked for a swap

  container.append(renderPrompt({ ...problem, prompt: problem.prompt ?? defaultPrompt(problem, 'trace') }, baseUrl));

  const grid = h('div', { class: 'st-grid', role: 'group', 'aria-label': 'Swap rows', style: { '--n': String(n) } });
  const addBtn = h('button', { type: 'button', class: 'btn st-add' }, '+  Add a row');
  addBtn.addEventListener('click', () => { pairs.push(null); sel = null; commit({ row: pairs.length - 1, col: 0 }); });
  const work = h('div', { class: 'sort-work' },
    h('p', { class: 'q-hint' },
      'Each row starts as a copy of the row above. Make ', h('strong', {}, 'one swap per row'),
      ': click a value, then the value to swap it with (or drag one onto the other). Add rows until the array is sorted.'),
    h('div', { class: 'st-wrap' }, grid),
    addBtn);
  container.append(h('div', { class: 'sort-layout sort-layout-trace' }, work, pseudocodeBox(problem)));

  function commit(focus = null) {
    onChange({ swaps: pairs.map((p) => (p ? p.slice() : null)) });
    draw(focus);
  }

  function setPair(row, a, b) {
    pairs[row] = [Math.min(a, b), Math.max(a, b)];
    sel = null;
    commit({ row, col: b });
  }

  function draw(focus = null) {
    // values of every row: row r is the state after the swaps of rows 0..r (empty rows copy)
    const states = [s.data.slice()];
    for (const p of pairs) {
      const prev = states[states.length - 1];
      states.push(p ? applySwaps(prev, [p])[1] : prev.slice());
    }
    grid.replaceChildren();
    grid.append(h('div', { class: 'st-row st-head', 'aria-hidden': 'true' },
      h('span', {}), s.data.map((_, i) => h('span', { class: 'st-idx' }, String(i))), h('span', {})));
    grid.append(h('div', { class: 'st-row st-start' },
      h('span', { class: 'st-label' }, 'Start'),
      states[0].map((v) => h('span', { class: 'st-cell st-static' }, String(v))),
      h('span', {})));

    pairs.forEach((p, r) => {
      const values = states[r + 1];
      const cells = values.map((v, c) => {
        const cls = ['st-cell'];
        if (p && (p[0] === c || p[1] === c)) cls.push('st-swapped');
        if (sel && sel.row === r && sel.col === c) cls.push('st-sel');
        const b = h('button', {
          type: 'button', class: cls.join(' '), 'data-row': String(r), 'data-col': String(c),
          'aria-label': `Row ${r + 1}, position ${c}: ${v}${sel && sel.row === r && sel.col === c ? ' (selected)' : ''}`,
        }, String(v));
        b.addEventListener('click', () => onCellClick(r, c));
        b.addEventListener('pointerdown', (e) => startPointer(e, r, c, v));
        return b;
      });
      const reset = h('button', { type: 'button', class: 'st-act', title: 'Undo the swap in this row', 'aria-label': `Undo the swap in row ${r + 1}`, disabled: !p }, '↺');
      reset.addEventListener('click', () => { pairs[r] = null; sel = null; commit(); });
      const remove = h('button', { type: 'button', class: 'st-act', title: 'Remove this row', 'aria-label': `Remove row ${r + 1}` }, '×');
      remove.addEventListener('click', () => { pairs.splice(r, 1); sel = null; commit(); });
      grid.append(h('div', { class: `st-row${p ? '' : ' st-empty'}` },
        h('span', { class: 'st-label' }, h('span', { class: 'st-long' }, 'Swap '), String(r + 1)),
        cells,
        h('span', { class: 'st-actions' }, reset, remove)));
    });

    const last = pairs[pairs.length - 1];
    addBtn.disabled = pairs.length > 0 && !last;
    addBtn.title = addBtn.disabled ? 'Make the swap in the last row first' : '';
    if (focus) grid.querySelector(`.st-cell[data-row="${focus.row}"][data-col="${focus.col}"]`)?.focus();
  }

  function onCellClick(r, c) {
    if (suppressClick) return;
    if (sel && sel.row === r) {
      if (sel.col === c) { sel = null; draw({ row: r, col: c }); return; }
      setPair(r, sel.col, c);
      return;
    }
    sel = { row: r, col: c };
    draw({ row: r, col: c });
  }

  // ---- drag one value onto another in the same row ------------------------------------------
  let drag = null;
  let suppressClick = false;

  function startPointer(e, row, col, value) {
    if (e.button !== 0) return;
    drag = { row, col, value, x0: e.clientX, y0: e.clientY, active: false, over: null };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', endDrag);
  }

  function targetAt(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('.st-cell[data-row]');
    if (!el || !grid.contains(el) || Number(el.dataset.row) !== drag.row || Number(el.dataset.col) === drag.col) return null;
    return el;
  }

  function onMove(e) {
    if (!drag) return;
    if (!drag.active) {
      if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 6) return;
      drag.active = true;
      drag.ghost = h('div', { class: 'tt-ghost' }, String(drag.value));
      document.body.append(drag.ghost);
      document.body.classList.add('tt-dragging');
      grid.querySelector(`.st-cell[data-row="${drag.row}"][data-col="${drag.col}"]`)?.classList.add('st-sel');
    }
    e.preventDefault();
    drag.ghost.style.left = `${e.clientX}px`;
    drag.ghost.style.top = `${e.clientY}px`;
    const t = targetAt(e);
    if (t !== drag.over) {
      drag.over?.classList.remove('st-hover');
      t?.classList.add('st-hover');
      drag.over = t;
    }
  }

  function endDrag() {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', endDrag);
    if (drag?.ghost) drag.ghost.remove();
    drag?.over?.classList.remove('st-hover');
    document.body.classList.remove('tt-dragging');
    const d = drag;
    drag = null;
    return d;
  }

  function onUp(e) {
    if (!drag) return;
    const active = drag.active;
    const t = active ? targetAt(e) : null;
    const d = endDrag();
    if (!active) return; // a plain click: handled by the click listener
    suppressClick = true;
    setTimeout(() => { suppressClick = false; }, 0);
    if (t) setPair(d.row, d.col, Number(t.dataset.col));
    else draw();
  }

  draw();
}

VE.views = VE.views || {};
VE.views['sort-trace'] = { render, isAnswered };
})(globalThis.VE = globalThis.VE || {});
