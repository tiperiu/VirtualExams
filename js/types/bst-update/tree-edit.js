// "Build a binary tree" component: the student moves keys between the positions of a binary tree.
// Filled positions are drawn as nodes; the free spots where a node can go (the children of every
// node, and gaps above nodes) are drawn as dashed circles. Positions are paths from the root
// ("" root, "L", "LR", ...), the tree is { path: key }.
//
// - drag a key from the pool onto a free spot (or onto a node, to replace it) to add it;
// - drag a node onto a free spot to move it, onto another node to swap them, out of the tree to
//   remove it. By default a node takes its whole subtree along (the student can switch to moving
//   only the node). A subtree may move into its own place (e.g. one level down) when there is room.
// - Delete/Backspace on a focused node removes it; "Start over" restores the starting tree.
//
//   const te = VE.treeEdit({ keys: [20, 30, 50], positions, initial, levels: 5, external: true, onChange(positions) {} });
//   VE.drawPositions(positions, { external: true })   a static drawing
(function (VE) {
'use strict';
const { h } = VE.util;

const LEVEL = 64;    // px between levels
const PAD = 30;      // px above and below
const GUTTER = 26;   // px left and right
// px per column (nodes of one level are at least two columns apart); tighter on phones
const minCol = () => (globalThis.matchMedia?.('(max-width: 600px)').matches ? 22 : 30);

/** In-order position of a path in an infinite binary tree, in (0, 1). */
const orderOf = (p) => {
  let x = 0.5, step = 0.25;
  for (const c of p) { x += c === 'L' ? -step : step; step /= 2; }
  return x;
};

/**
 * Draws a { path: key } tree. Every empty child of a key is a free spot: with external: true it is
 * drawn as an external node (a small empty square, as in proper binary trees), otherwise as a dashed
 * circle. Empty positions above keys (gaps) are dashed circles. Free spots are shown down to
 * `levels` levels; external nodes are always shown.
 *   -> { canvas, spots: Map(path -> element), xOf: Map(path -> x in (0, 1)) }
 */
function drawCanvas(pos, { levels = Infinity, external = false, onNode } = {}) {
  const filled = Object.keys(pos);
  const shown = new Set(['']);
  for (const p of filled) {
    for (let i = 0; i <= p.length; i++) shown.add(p.slice(0, i));
    if (external || p.length + 1 < levels) { shown.add(p + 'L'); shown.add(p + 'R'); }
  }
  const list = [...shown].sort((a, b) => orderOf(a) - orderOf(b));
  const cols = list.length;
  const xOf = new Map(list.map((p, i) => [p, (i + 0.5) / cols]));
  const depth = Math.max(...list.map((p) => p.length));
  const height = depth * LEVEL + 2 * PAD;
  const yOf = (p) => PAD + p.length * LEVEL;
  const left = (p) => `calc(${GUTTER}px + ${xOf.get(p)} * (100% - ${2 * GUTTER}px))`;
  // an external node: an empty child of a key (or the root of an empty tree)
  const isExternal = (p) => external && !(p in pos) && (p === '' ? !filled.length : p.slice(0, -1) in pos);

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'tt-edges');
  svg.setAttribute('viewBox', `0 0 100 ${height}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.left = `${GUTTER}px`;
  svg.style.width = `calc(100% - ${2 * GUTTER}px)`;
  for (const p of list) {
    if (p === '') continue;
    const q = p.slice(0, -1);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', xOf.get(q) * 100); line.setAttribute('y1', yOf(q));
    line.setAttribute('x2', xOf.get(p) * 100); line.setAttribute('y2', yOf(p));
    line.setAttribute('vector-effect', 'non-scaling-stroke');
    if (isExternal(p)) line.setAttribute('class', 'te-edge-ext');
    else if (!(p in pos) || !(q in pos)) line.setAttribute('class', 'te-edge-free');
    svg.append(line);
  }

  const canvas = h('div', { class: 'tt-canvas', style: { height: `${height}px`, minWidth: `${cols * minCol() + 2 * GUTTER}px` } }, svg);
  const spots = new Map();
  for (const p of list) {
    const style = { left: left(p), top: `${yOf(p)}px` };
    let el;
    if (p in pos) {
      const orphan = p !== '' && !(p.slice(0, -1) in pos);
      el = h(onNode ? 'button' : 'div', {
        type: onNode ? 'button' : null, class: `tt-node te-node${orphan ? ' te-orphan' : ''}`, 'data-path': p, style,
        'aria-label': `Node ${pos[p]}${orphan ? ' (no parent)' : ''}${onNode ? '. Delete removes it.' : ''}`,
      }, String(pos[p]));
      if (onNode) onNode(el, p);
    } else if (isExternal(p)) {
      el = h('div', { class: 'te-ext', 'data-path': p, style, 'aria-label': 'External node (no key)' });
    } else {
      el = h('div', { class: 'te-spot', 'data-path': p, style, 'aria-label': p === '' ? 'Root (empty)' : 'Free spot' });
    }
    spots.set(p, el);
    canvas.append(el);
  }
  return { canvas, spots, xOf };
}

/** A static drawing of a { path: key } tree. */
function drawPositions(pos, { external = false } = {}) {
  return h('div', { class: 'tt-tree te-static', role: 'img', 'aria-label': 'Tree' }, drawCanvas(pos, { external }).canvas);
}

function treeEdit(opts) {
  const { keys, levels, onChange } = opts;
  const external = !!opts.external;
  const initial = { ...opts.initial };
  let pos = { ...opts.positions };
  let mode = 'subtree';

  const pool = h('div', { class: 'af-pool te-pool', role: 'list', 'aria-label': 'Keys' });
  const count = h('span', { class: 'tt-count' });
  const canvasBox = h('div', { class: 'tt-tree te-tree' });
  const msg = h('p', { class: 'te-msg', 'aria-live': 'polite' });
  const radio = (value, label) => {
    const input = h('input', { type: 'radio', name: `te-mode-${Math.random().toString(36).slice(2)}`, value });
    input.checked = value === mode;
    input.addEventListener('change', () => { if (input.checked) mode = value; });
    return h('label', {}, input, ' ', label);
  };
  const r1 = radio('subtree', 'its whole subtree'), r2 = radio('node', 'only the node');
  r2.querySelector('input').name = r1.querySelector('input').name;

  const element = h('div', { class: 'te' },
    h('div', { class: 'field-label' }, opts.poolLabel || 'Keys'),
    pool,
    h('p', { class: 'q-hint' }, opts.hint || (external
      ? 'Drag the nodes to build the new tree. The small squares are the external nodes (they hold no key). '
        + 'Drag a key from the pool onto an external node to store it there, a node onto an external node to move it, '
        + 'onto another node to swap them, or out of the tree to remove it.'
      : 'Drag the nodes to build the new tree. Drag a key from the pool onto a dashed circle to add it, '
        + 'a node onto a dashed circle to move it, onto another node to swap them, or out of the tree to remove it.')),
    h('div', { class: 'tt-answer' },
      h('div', { class: 'tt-answer-head' },
        h('span', { class: 'tt-answer-title' }, opts.answerLabel || 'Your tree'),
        count,
        h('button', { type: 'button', class: 'link-btn', onClick: () => commit({ ...initial }) }, 'Start over'),
        h('button', { type: 'button', class: 'link-btn', onClick: () => commit({}) }, 'Clear')),
      h('div', { class: 'te-mode', role: 'radiogroup', 'aria-label': 'What a drag moves' },
        h('span', {}, 'Dragging a node moves:'), r1, r2),
      canvasBox,
      msg));

  let keyEls = new Map();
  let spotEls = new Map();
  let drawn = false;

  function drawPool() {
    pool.replaceChildren();
    keyEls = new Map();
    const used = new Set(Object.values(pos));
    for (const k of keys) {
      const el = h('button', { type: 'button', class: `tt-node af-key${used.has(k) ? ' used' : ''}`, 'data-key': String(k), 'aria-label': `Key ${k}` }, String(k));
      el.addEventListener('pointerdown', (e) => { if (!el.classList.contains('used')) startDrag(e, { key: k, from: null }); });
      keyEls.set(k, el);
      pool.append(h('div', { class: 'af-item', role: 'listitem' }, el));
    }
  }

  function draw() {
    const { canvas, spots, xOf } = drawCanvas(pos, { levels, external, onNode: (el, p) => {
      el.addEventListener('pointerdown', (e) => startDrag(e, { key: pos[p], from: p }));
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); drop({ key: pos[p], from: p }, null); }
      });
    } });
    spotEls = spots;
    const scroll = canvasBox.scrollLeft;
    canvasBox.replaceChildren(canvas);
    canvasBox.scrollLeft = scroll;
    if (!drawn) {
      drawn = true;
      // a tree wider than the screen: start with the root in the middle
      requestAnimationFrame(() => {
        const extra = canvas.scrollWidth - canvasBox.clientWidth;
        if (extra > 0) canvasBox.scrollLeft = GUTTER + xOf.get('') * (canvas.scrollWidth - 2 * GUTTER) - canvasBox.clientWidth / 2;
      });
    }
    const n = Object.keys(pos).length;
    count.textContent = `${n} key${n === 1 ? '' : 's'} in the tree`;
    const used = new Set(Object.values(pos));
    keyEls.forEach((el, k) => el.classList.toggle('used', used.has(k)));
  }

  function commit(next) {
    pos = next;
    msg.textContent = '';
    onChange({ ...pos });
    draw();
  }

  const subtreeOf = (p) => Object.keys(pos).filter((q) => q.startsWith(p));

  function drop(src, target) {
    if (target != null && target.length + 1 > levels && !(target in pos)) {
      msg.textContent = 'No room there: that is below the lowest level you can use.';
      return;
    }
    const next = { ...pos };
    if (src.from == null) {                       // a key from the pool
      if (target == null) return;
      next[target] = src.key;
    } else if (mode === 'node') {
      if (target === src.from) return;
      if (target == null) delete next[src.from];
      else if (target in next) [next[target], next[src.from]] = [next[src.from], next[target]];
      else { next[target] = src.key; delete next[src.from]; }
    } else {
      const sub = subtreeOf(src.from);
      if (target === src.from) return;
      sub.forEach((q) => delete next[q]);
      if (target != null) {
        if (target in next) {                     // onto a node outside the subtree: swap the two keys
          if (sub.length === 1) { next[src.from] = next[target]; next[target] = src.key; commit(next); return; }
          msg.textContent = 'No room there: drop the subtree on a free spot, or switch to moving only the node.';
          return;
        }
        const moved = sub.map((q) => [target + q.slice(src.from.length), pos[q]]);
        if (moved.some(([q]) => q.length + 1 > levels)) {
          msg.textContent = 'No room there: the subtree would go below the lowest level.';
          return;
        }
        if (moved.some(([q]) => q in next)) {
          msg.textContent = 'No room there: the subtree would cover other nodes. Move those first, or switch to moving only the node.';
          return;
        }
        moved.forEach(([q, k]) => { next[q] = k; });
      }
    }
    commit(next);
  }

  // ---- pointer drag and drop -------------------------------------------------------------------
  let drag = null;

  function startDrag(e, src) {
    if (e.button !== 0) return;
    drag = { src, x0: e.clientX, y0: e.clientY, active: false, over: null };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', endDrag);
  }

  function targetAt(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-path]');
    return el && canvasBox.contains(el) ? el.dataset.path : null;
  }

  function onMove(e) {
    if (!drag) return;
    if (!drag.active) {
      if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 6) return;
      drag.active = true;
      const many = drag.src.from != null && mode === 'subtree' ? subtreeOf(drag.src.from) : [];
      drag.ghost = h('div', { class: 'tt-ghost' }, String(drag.src.key) + (many.length > 1 ? ` +${many.length - 1}` : ''));
      document.body.append(drag.ghost);
      document.body.classList.add('tt-dragging');
      if (drag.src.from == null) keyEls.get(drag.src.key)?.classList.add('tt-lifted');
      else (many.length ? many : [drag.src.from]).forEach((q) => spotEls.get(q)?.classList.add('tt-lifted'));
    }
    e.preventDefault();
    drag.ghost.style.left = `${e.clientX}px`;
    drag.ghost.style.top = `${e.clientY}px`;
    const t = targetAt(e);
    if (t !== drag.over) {
      if (drag.over != null) spotEls.get(drag.over)?.classList.remove('te-hover');
      if (t != null) spotEls.get(t)?.classList.add('te-hover');
      drag.over = t;
    }
    drag.ghost.classList.toggle('tt-ghost-remove', t == null && drag.src.from != null);
  }

  function endDrag() {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', endDrag);
    if (drag?.ghost) drag.ghost.remove();
    document.body.classList.remove('tt-dragging');
    spotEls.forEach((el) => el.classList.remove('te-hover', 'tt-lifted'));
    keyEls.forEach((el) => el.classList.remove('tt-lifted'));
    drag = null;
  }

  function onUp(e) {
    const d = drag;
    if (!d) return;
    const t = d.active ? targetAt(e) : undefined;
    endDrag();
    if (t !== undefined) drop(d.src, t);
  }

  drawPool();
  draw();
  return { element, getPositions: () => ({ ...pos }) };
}

VE.treeEdit = treeEdit;
VE.drawPositions = drawPositions;
})(globalThis.VE = globalThis.VE || {});
