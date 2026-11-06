// "Fill an array" component shared by question types (heap-build, hash-table, radix-sort):
// a pool of keys and a row of indexed array cells. The student drags keys into cells (or clicks
// a key to put it in the first empty cell); drags a value to another cell to move it (swapping)
// or out of the array to clear it. Keyboard on a filled cell: ←/→ swap with the neighbour,
// Delete/Backspace clears. Every key can be used once.
//
//   const af = VE.arrayFill({
//     keys: [{ id: 'k0', index: 0 }, ...],   // pool order; "index" is shown above the key if showIndex
//     n: 8,                                   // number of cells
//     slots: ['k3', null, ...],               // initial content (ids or null)
//     onChange: (slots) => { ... },
//     text: (id) => '13',                     // plain text of a key (labels, drag ghost)
//     render: (id, where) => node | string,   // optional: what is shown ('key' or 'cell'); default text(id)
//     caption: (id) => node | string,          // optional: small text under the key in the pool
//     poolLabel, hint, answerLabel, emptyMark: 'X', showIndex: false, wide: false,
//   });
//   container.append(af.element);   af.setKeys(newKeys) re-orders the pool.
(function (VE) {
'use strict';
const { h } = VE.util;

function arrayFill(opts) {
  const { n, onChange, text } = opts;
  const render = opts.render || ((id) => text(id));
  const emptyMark = opts.emptyMark ?? 'X';
  let keys = opts.keys.slice();
  const known = new Set(keys.map((k) => k.id));
  let slots = Array.from({ length: n }, (_, i) => {
    const id = opts.slots?.[i];
    return id != null && known.has(id) ? id : null;
  });
  slots = slots.map((id, i) => (id && slots.indexOf(id) === i ? id : null)); // each key at most once

  const pool = h('div', { class: `af-pool${opts.wide ? ' af-wide' : ''}`, role: 'list' });
  const count = h('span', { class: 'tt-count' });
  const arrayEl = h('div', { class: `ta-array${opts.wide ? ' af-wide' : ''}`, role: 'list', 'aria-label': opts.answerLabel || 'Array' });
  const element = h('div', { class: 'af' },
    opts.poolLabel ? h('div', { class: 'field-label' }, opts.poolLabel) : null,
    pool,
    opts.hint === false ? null : h('p', { class: 'q-hint' }, opts.hint
      || 'Drag the keys into the array (or click a key to put it in the first empty cell). Drag a value to another cell to move it, or out of the array to clear the cell.'),
    h('div', { class: 'tt-answer' },
      h('div', { class: 'tt-answer-head' },
        h('span', { class: 'tt-answer-title' }, opts.answerLabel || 'Array'),
        count,
        h('button', { type: 'button', class: 'link-btn', onClick: () => commit(slots.map(() => null)) }, 'Clear')),
      arrayEl));

  let keyEls = new Map();
  let cellEls = [];

  function drawPool() {
    pool.replaceChildren();
    keyEls = new Map();
    for (const k of keys) {
      const el = h('button', { type: 'button', class: 'tt-node af-key', 'data-id': k.id, 'aria-label': `Key ${text(k.id)}` }, render(k.id, 'key'));
      el.addEventListener('pointerdown', (e) => startPointer(e, { id: k.id, fromCell: null }));
      el.addEventListener('click', () => placeInFirstEmpty(k.id));
      keyEls.set(k.id, el);
      pool.append(h('div', { class: 'af-item', role: 'listitem' },
        opts.showIndex ? h('span', { class: 'af-idx' }, String(k.index)) : null, el,
        opts.caption ? h('span', { class: 'af-cap' }, opts.caption(k.id)) : null));
    }
    markUsed();
  }

  function markUsed() {
    const used = new Set(slots.filter((x) => x != null));
    for (const [id, el] of keyEls) {
      el.classList.toggle('used', used.has(id));
      el.setAttribute('aria-pressed', used.has(id) ? 'true' : 'false');
    }
  }

  function draw(focusCell = null) {
    arrayEl.replaceChildren();
    cellEls = slots.map((id, i) => {
      const slot = h('div', { class: `ta-slot ${id == null ? 'ta-empty' : 'ta-filled'}`, 'data-cell': String(i) });
      if (id == null) {
        slot.append(h('span', { class: 'ta-x', 'aria-hidden': 'true' }, emptyMark));
        slot.setAttribute('aria-label', `Cell ${i}: empty`);
      } else {
        const remove = h('button', { type: 'button', class: 'ta-remove', tabindex: '-1', 'aria-label': `Clear cell ${i}` }, '×');
        remove.addEventListener('pointerdown', (e) => e.stopPropagation());
        remove.addEventListener('click', () => { const next = slots.slice(); next[i] = null; commit(next); });
        const val = h('div', {
          class: 'ta-val', tabindex: '0', 'data-id': id,
          'aria-label': `Cell ${i}: ${text(id)}. Arrow keys swap with the neighbour, Delete clears.`,
        }, h('span', { class: 'af-cell-text' }, render(id, 'cell')), remove);
        val.addEventListener('pointerdown', (e) => startPointer(e, { id, fromCell: i }));
        val.addEventListener('keydown', (e) => onCellKey(e, i));
        slot.append(val);
      }
      arrayEl.append(h('div', { class: 'ta-cell', role: 'listitem' }, h('div', { class: 'ta-index' }, String(i)), slot));
      return slot;
    });
    const filled = slots.filter((x) => x != null).length;
    count.textContent = `${filled} of ${keys.length} placed`;
    markUsed();
    if (focusCell != null) cellEls[focusCell]?.querySelector('.ta-val')?.focus();
  }

  function commit(next, focusCell = null) {
    slots = next;
    onChange(slots.slice());
    draw(focusCell);
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

  // ---- pointer drag and drop -------------------------------------------------------------------
  let drag = null;
  let suppressClick = false;

  function startPointer(e, source) {
    if (e.button !== 0) return;
    if (source.fromCell == null && slots.includes(source.id)) return;
    drag = { ...source, x0: e.clientX, y0: e.clientY, active: false, over: null };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
  }

  function cellAt(e) {
    const slot = document.elementFromPoint(e.clientX, e.clientY)?.closest('.ta-slot');
    return slot && arrayEl.contains(slot) ? Number(slot.dataset.cell) : null;
  }

  function onMove(e) {
    if (!drag) return;
    if (!drag.active) {
      if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 6) return;
      drag.active = true;
      drag.ghost = h('div', { class: 'tt-ghost' }, text(drag.id));
      document.body.append(drag.ghost);
      document.body.classList.add('tt-dragging');
      if (drag.fromCell != null) cellEls[drag.fromCell].classList.add('ta-source');
      else keyEls.get(drag.id)?.classList.add('tt-lifted');
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
    keyEls.forEach((el) => el.classList.remove('tt-lifted'));
  }

  function onUp(e) {
    const d = drag;
    if (!d) return;
    if (!d.active) { endDrag(); drag = null; return; } // a plain click: handled by the click listeners
    const k = cellAt(e);
    endDrag();
    drag = null;
    suppressClick = true;
    setTimeout(() => { suppressClick = false; }, 0);
    const next = slots.slice();
    if (k == null) {
      if (d.fromCell == null) return;
      next[d.fromCell] = null;
    } else if (d.fromCell != null) {
      [next[k], next[d.fromCell]] = [next[d.fromCell], next[k]];
    } else {
      next[k] = d.id;
    }
    commit(next);
  }

  function onCancel() { endDrag(); drag = null; }

  drawPool();
  draw();
  return {
    element,
    getSlots: () => slots.slice(),
    setKeys(newKeys) {
      const sameOrder = newKeys.length === keys.length && newKeys.every((k, i) => k.id === keys[i].id);
      keys = newKeys.slice();
      if (!sameOrder) drawPool();
    },
  };
}

VE.arrayFill = arrayFill;
})(globalThis.VE = globalThis.VE || {});
