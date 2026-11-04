// Tree traversal question: a tree is drawn; the student drags nodes (or clicks them) into the
// answer strip at the bottom, in the requested traversal order. Chips in the strip can be
// reordered by dragging, removed with × (or by dragging them out), or moved with the keyboard
// (←/→ to move, Delete/Backspace to remove).
// Response format: { "sequence": ["A", "B", ...] }   (node ids, in order)
(function (VE) {
'use strict';
const { h } = VE.util;
const { renderPrompt } = VE;
const { normalizeTree, isBinary, TRAVERSAL_NAMES } = VE.tree;
const { drawTree } = VE;

function isAnswered(response) {
  return !!(response && Array.isArray(response.sequence) && response.sequence.length);
}

function render({ container, problem, response, onChange, baseUrl }) {
  const { root, byId } = normalizeTree(problem.tree);
  const binary = problem.binary ?? isBinary(root);
  const orderName = TRAVERSAL_NAMES[problem.traversal] || problem.traversal;
  const label = (id) => byId.get(id)?.label ?? id;

  let seq = (response?.sequence ?? []).filter((id) => byId.has(id));
  const allowRepeat = false;

  container.append(renderPrompt(problem, baseUrl));
  container.append(h('p', { class: 'q-hint' },
    'Drag the nodes into the answer box below (or click them) to list them in ',
    h('strong', {}, orderName), '. Drag a chip to reorder it, or drag it out of the box to remove it.'));

  // ---- tree area -------------------------------------------------------------------------
  const { element: treeEl, nodeEls } = drawTree({
    root, binary,
    onPointerDown: (e, id) => startPointer(e, { id, fromIndex: null }),
    onClick: (id) => {
      if (suppressClick) return;
      if (!allowRepeat && seq.includes(id)) return;
      commit([...seq, id]);
    },
  });
  container.append(treeEl);

  // ---- answer strip ----------------------------------------------------------------------
  const count = h('span', { class: 'tt-count' });
  const tray = h('ol', { class: 'tt-tray', 'aria-label': `Your ${orderName} sequence` });
  const marker = h('div', { class: 'tt-marker', 'aria-hidden': 'true' });
  const trayWrap = h('div', { class: 'tt-tray-wrap' }, tray, marker);
  container.append(h('div', { class: 'tt-answer' },
    h('div', { class: 'tt-answer-head' },
      h('span', { class: 'tt-answer-title' }, `Your ${orderName} sequence`),
      count,
      h('button', { type: 'button', class: 'link-btn', onClick: () => commit([]) }, 'Clear')),
    trayWrap));

  let chipEls = [];

  function renderTray(focusIndex = null) {
    tray.replaceChildren();
    chipEls = seq.map((id, i) => {
      const remove = h('button', { type: 'button', class: 'tt-remove', 'aria-label': `Remove ${label(id)}`, tabindex: '-1' }, '×');
      remove.addEventListener('pointerdown', (e) => e.stopPropagation());
      remove.addEventListener('click', () => commit(seq.filter((_, k) => k !== i), Math.min(i, seq.length - 2)));
      const chip = h('li', {
        class: 'tt-chip', tabindex: '0', 'data-id': id,
        'aria-label': `${i + 1}: ${label(id)}. Arrow keys move, Delete removes.`,
      }, h('span', { class: 'tt-chip-label' }, label(id)), remove);
      chip.addEventListener('pointerdown', (e) => startPointer(e, { id, fromIndex: i }));
      chip.addEventListener('keydown', (e) => onChipKey(e, i));
      tray.append(chip);
      return chip;
    });
    if (!seq.length) tray.append(h('li', { class: 'tt-empty' }, 'Drop nodes here, in order'));
    count.textContent = `${seq.length} / ${byId.size}`;
    for (const [id, el] of nodeEls) {
      const used = seq.includes(id);
      el.classList.toggle('used', used);
      el.setAttribute('aria-pressed', used ? 'true' : 'false');
    }
    if (focusIndex != null && chipEls[focusIndex]) chipEls[focusIndex].focus();
  }

  function commit(next, focusIndex = null) {
    seq = next;
    onChange({ sequence: seq.slice() });
    renderTray(focusIndex);
  }

  function onChipKey(e, i) {
    const move = (to) => {
      if (to < 0 || to >= seq.length) return;
      const next = seq.slice();
      const [x] = next.splice(i, 1);
      next.splice(to, 0, x);
      commit(next, to);
    };
    if (e.key === 'ArrowLeft') { e.preventDefault(); move(i - 1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); move(i + 1); }
    else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      commit(seq.filter((_, k) => k !== i), Math.min(i, seq.length - 2));
    }
  }

  // ---- pointer-based drag and drop (mouse, pen and touch) ------------------------------------
  let drag = null;
  let suppressClick = false;

  function startPointer(e, source) {
    if (e.button !== 0) return;
    if (source.fromIndex == null && !allowRepeat && seq.includes(source.id)) return;
    drag = { ...source, x0: e.clientX, y0: e.clientY, active: false };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
  }

  function overTray(e) {
    const r = trayWrap.getBoundingClientRect();
    const m = 12; // forgiving margin
    return e.clientX >= r.left - m && e.clientX <= r.right + m && e.clientY >= r.top - m && e.clientY <= r.bottom + m;
  }

  // Index (in the sequence without the dragged chip) where a drop would insert.
  function insertionIndex(e) {
    const list = chipEls.filter((_, i) => i !== drag.fromIndex);
    for (let k = 0; k < list.length; k++) {
      const r = list[k].getBoundingClientRect();
      if (e.clientY < r.top) return k;
      if (e.clientY <= r.bottom && e.clientX < r.left + r.width / 2) return k;
    }
    return list.length;
  }

  function placeMarker(k) {
    if (k == null) { marker.style.display = 'none'; return; }
    const list = chipEls.filter((_, i) => i !== drag.fromIndex);
    const wr = trayWrap.getBoundingClientRect();
    let x, top, hgt;
    if (!list.length) {
      const tr = tray.getBoundingClientRect();
      x = tr.left - wr.left + 10; top = tr.top - wr.top + 8; hgt = 36;
    } else if (k < list.length) {
      const r = list[k].getBoundingClientRect();
      x = r.left - wr.left - 5; top = r.top - wr.top; hgt = r.height;
    } else {
      const r = list[list.length - 1].getBoundingClientRect();
      x = r.right - wr.left + 4; top = r.top - wr.top; hgt = r.height;
    }
    Object.assign(marker.style, { display: 'block', left: `${x}px`, top: `${top}px`, height: `${hgt}px` });
  }

  function onMove(e) {
    if (!drag) return;
    if (!drag.active) {
      if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 6) return;
      drag.active = true;
      drag.ghost = h('div', { class: 'tt-ghost' }, label(drag.id));
      document.body.append(drag.ghost);
      document.body.classList.add('tt-dragging');
      if (drag.fromIndex != null) chipEls[drag.fromIndex].classList.add('tt-hidden');
      else nodeEls.get(drag.id).classList.add('tt-lifted');
    }
    e.preventDefault();
    drag.ghost.style.left = `${e.clientX}px`;
    drag.ghost.style.top = `${e.clientY}px`;
    const over = overTray(e);
    trayWrap.classList.toggle('tt-over', over);
    drag.ghost.classList.toggle('tt-ghost-remove', !over && drag.fromIndex != null);
    placeMarker(over ? insertionIndex(e) : null);
  }

  function endDrag() {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onCancel);
    if (drag?.ghost) drag.ghost.remove();
    document.body.classList.remove('tt-dragging');
    trayWrap.classList.remove('tt-over');
    marker.style.display = 'none';
    nodeEls.forEach((el) => el.classList.remove('tt-lifted'));
  }

  function onUp(e) {
    const d = drag;
    if (!d) return;
    if (!d.active) { endDrag(); drag = null; return; } // a plain click: handled by the click listener
    const over = overTray(e);
    const k = over ? insertionIndex(e) : null;
    endDrag();
    drag = null;
    suppressClick = true;
    setTimeout(() => { suppressClick = false; }, 0);
    const next = seq.slice();
    if (d.fromIndex != null) next.splice(d.fromIndex, 1);
    if (over) next.splice(k, 0, d.id);
    commit(next);
  }

  function onCancel() {
    endDrag();
    drag = null;
    renderTray();
  }

  renderTray();
}

VE.views = VE.views || {};
VE.views['tree-traversal'] = { render, isAnswered };
})(globalThis.VE = globalThis.VE || {});
