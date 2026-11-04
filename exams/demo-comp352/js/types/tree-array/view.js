// Tree → array question: a tree is drawn above a row of indexed array cells. The student drags
// nodes (and, for a heap insertion, the new key) into the cells; empty cells mean X.
// - click a node: it goes into the first empty cell
// - drag a value onto another cell: moves it there (swapping with what was there)
// - drag a value out of the array, or press ×: clears the cell
// - keyboard on a filled cell: ←/→ swap with the neighbour, Delete/Backspace clears
// Response format: { "slots": ["A", null, "B", ...] }
(function (VE) {
'use strict';
const { h } = VE.util;
const { renderPrompt, drawTree } = VE;
const { normalizeTree } = VE.tree;
const { allLabels, slotCount, pad } = VE.treeArray;

function isAnswered(response) {
  return !!(response && Array.isArray(response.slots) && response.slots.some((x) => x != null));
}

function render({ container, problem, response, onChange, baseUrl }) {
  const { root } = normalizeTree(problem.tree);
  const labels = allLabels(problem);
  const n = slotCount(problem);
  const base = problem.indexBase === 1 ? 1 : 0;
  const label = (id) => labels.get(id) ?? id;
  let slots = pad(response?.slots ?? [], n).map((id) => (id != null && labels.has(id) ? id : null));

  container.append(renderPrompt(problem, baseUrl));
  container.append(h('p', { class: 'q-hint' },
    'Drag the values into the array cells (or click a node to put it in the first empty cell). ',
    h('strong', {}, 'Cells left empty count as X.'),
    ' Drag a value to another cell to move it, or out of the array to clear the cell.'));

  // ---- tree, plus the new keys for a heap insertion ----------------------------------------
  const { element: treeEl, nodeEls } = drawTree({
    root, binary: true,
    onPointerDown: (e, id) => startPointer(e, { id, fromCell: null }),
    onClick: (id) => placeInFirstEmpty(id),
  });
  container.append(treeEl);

  const extraEls = new Map();
  if (problem.insert?.length) {
    const pool = h('div', { class: 'ta-pool' }, h('span', { class: 'ta-pool-label' }, problem.insert.length > 1 ? 'Keys to insert:' : 'Key to insert:'));
    for (const x of problem.insert) {
      const id = String(x.id);
      const el = h('button', { type: 'button', class: 'tt-node ta-extra', 'data-id': id, 'aria-label': `New key ${label(id)}` }, label(id));
      el.addEventListener('pointerdown', (e) => startPointer(e, { id, fromCell: null }));
      el.addEventListener('click', () => placeInFirstEmpty(id));
      extraEls.set(id, el);
      pool.append(el);
    }
    container.append(pool);
  }

  // ---- array cells -------------------------------------------------------------------------
  const count = h('span', { class: 'tt-count' });
  const arrayEl = h('div', { class: 'ta-array', role: 'list', 'aria-label': 'Array' });
  container.append(h('div', { class: 'tt-answer' },
    h('div', { class: 'tt-answer-head' },
      h('span', { class: 'tt-answer-title' }, problem.answerLabel || 'Array'),
      count,
      h('button', { type: 'button', class: 'link-btn', onClick: () => commit(slots.map(() => null)) }, 'Clear')),
    arrayEl));

  let cellEls = [];

  function renderArray(focusCell = null) {
    arrayEl.replaceChildren();
    cellEls = slots.map((id, i) => {
      const slot = h('div', { class: `ta-slot ${id == null ? 'ta-empty' : 'ta-filled'}`, 'data-cell': String(i) });
      if (id == null) {
        slot.append(h('span', { class: 'ta-x', 'aria-hidden': 'true' }, 'X'));
        slot.setAttribute('aria-label', `Cell ${i + base}: empty (X)`);
      } else {
        const remove = h('button', { type: 'button', class: 'ta-remove', tabindex: '-1', 'aria-label': `Clear cell ${i + base}` }, '×');
        remove.addEventListener('pointerdown', (e) => e.stopPropagation());
        remove.addEventListener('click', () => { const next = slots.slice(); next[i] = null; commit(next); });
        const val = h('div', {
          class: 'ta-val', tabindex: '0',
          'aria-label': `Cell ${i + base}: ${label(id)}. Arrow keys swap with the neighbour, Delete clears.`,
        }, h('span', {}, label(id)), remove);
        val.addEventListener('pointerdown', (e) => startPointer(e, { id, fromCell: i }));
        val.addEventListener('keydown', (e) => onCellKey(e, i));
        slot.append(val);
      }
      const cell = h('div', { class: 'ta-cell', role: 'listitem' }, h('div', { class: 'ta-index' }, String(i + base)), slot);
      arrayEl.append(cell);
      return slot;
    });
    const filled = slots.filter((x) => x != null).length;
    count.textContent = `${filled} filled · ${n - filled} X`;
    const used = new Set(slots.filter((x) => x != null));
    for (const [id, el] of [...nodeEls, ...extraEls]) {
      el.classList.toggle('used', used.has(id));
      el.setAttribute('aria-pressed', used.has(id) ? 'true' : 'false');
    }
    if (focusCell != null) cellEls[focusCell]?.querySelector('.ta-val')?.focus();
  }

  function commit(next, focusCell = null) {
    slots = next;
    onChange({ slots: slots.slice() });
    renderArray(focusCell);
  }

  function placeInFirstEmpty(id) {
    if (suppressClick || slots.includes(id)) return;
    const k = slots.indexOf(null);
    if (k < 0) return;
    const next = slots.slice();
    next[k] = id;
    commit(next);
  }

  function onCellKey(e, i) {
    const swapWith = (j) => {
      if (j < 0 || j >= n) return;
      const next = slots.slice();
      [next[i], next[j]] = [next[j], next[i]];
      commit(next, j);
    };
    if (e.key === 'ArrowLeft') { e.preventDefault(); swapWith(i - 1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); swapWith(i + 1); }
    else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      const next = slots.slice(); next[i] = null; commit(next);
    }
  }

  // ---- pointer drag and drop ---------------------------------------------------------------
  let drag = null;
  let suppressClick = false;

  function startPointer(e, source) {
    if (e.button !== 0) return;
    if (source.fromCell == null && slots.includes(source.id)) return; // already placed
    drag = { ...source, x0: e.clientX, y0: e.clientY, active: false, over: null };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
  }

  function cellAt(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const slot = el && el.closest('.ta-slot');
    return slot && arrayEl.contains(slot) ? Number(slot.dataset.cell) : null;
  }

  function onMove(e) {
    if (!drag) return;
    if (!drag.active) {
      if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 6) return;
      drag.active = true;
      drag.ghost = h('div', { class: 'tt-ghost' }, label(drag.id));
      document.body.append(drag.ghost);
      document.body.classList.add('tt-dragging');
      if (drag.fromCell != null) cellEls[drag.fromCell].classList.add('ta-source');
      else (nodeEls.get(drag.id) || extraEls.get(drag.id))?.classList.add('tt-lifted');
    }
    e.preventDefault();
    drag.ghost.style.left = `${e.clientX}px`;
    drag.ghost.style.top = `${e.clientY}px`;
    const k = cellAt(e);
    if (k !== drag.over) {
      if (drag.over != null) cellEls[drag.over]?.classList.remove('ta-hover');
      if (k != null) cellEls[k].classList.add('ta-hover');
      drag.over = k;
    }
    drag.ghost.classList.toggle('tt-ghost-remove', k == null && drag.fromCell != null);
  }

  function endDrag() {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onCancel);
    if (drag?.ghost) drag.ghost.remove();
    document.body.classList.remove('tt-dragging');
    cellEls.forEach((c) => c.classList.remove('ta-hover', 'ta-source'));
    [...nodeEls.values(), ...extraEls.values()].forEach((el) => el.classList.remove('tt-lifted'));
  }

  function onUp(e) {
    const d = drag;
    if (!d) return;
    if (!d.active) { endDrag(); drag = null; return; } // plain click: handled by click listeners
    const k = cellAt(e);
    endDrag();
    drag = null;
    suppressClick = true;
    setTimeout(() => { suppressClick = false; }, 0);
    const next = slots.slice();
    if (k == null) {
      if (d.fromCell != null) next[d.fromCell] = null; // dragged out: clear
      else return;
    } else if (d.fromCell != null) {
      [next[k], next[d.fromCell]] = [next[d.fromCell], next[k]]; // move / swap
    } else {
      next[k] = d.id; // from the tree; whatever was in the cell goes back to the tree
    }
    commit(next);
  }

  function onCancel() {
    endDrag();
    drag = null;
  }

  renderArray();
}

VE.views = VE.views || {};
VE.views['tree-array'] = { render, isAnswered };
})(globalThis.VE = globalThis.VE || {});
