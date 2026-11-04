// Draws a tree as positioned node buttons over SVG edges. Shared by the tree question types
// (tree-traversal, tree-array). Browser only.
(function (VE) {
'use strict';
const { h } = VE.util;
const { layoutTree } = VE.tree;

const LEVEL = 78;      // px between tree levels
const PAD = 34;        // px top/bottom padding in the tree area
const GUTTER = 26;     // px left/right padding, so edge nodes are never clipped
// px minimum horizontal space per layout column. In the binary (in-order) layout, nodes on the
// same level are at least two columns apart, so columns can be narrower than a node.
const MIN_COL_BINARY = 30;
const MIN_COL_GENERAL = 50;

/**
 * drawTree({ root, binary, onPointerDown(e, id), onClick(id) })
 *   -> { element, nodeEls: Map(id -> button) }
 */
function drawTree({ root, binary, onPointerDown, onClick }) {
  const { nodes, edges, cols, maxDepth } = layoutTree(root, binary);
  const height = maxDepth * LEVEL + 2 * PAD;
  const yOf = (d) => PAD + d * LEVEL;
  const pos = new Map(nodes.map((n) => [n.id, n]));

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'tt-edges');
  svg.setAttribute('viewBox', `0 0 100 ${height}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.left = `${GUTTER}px`;
  svg.style.width = `calc(100% - ${2 * GUTTER}px)`;
  for (const [a, b] of edges) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', pos.get(a).x * 100); line.setAttribute('y1', yOf(pos.get(a).depth));
    line.setAttribute('x2', pos.get(b).x * 100); line.setAttribute('y2', yOf(pos.get(b).depth));
    line.setAttribute('vector-effect', 'non-scaling-stroke');
    svg.append(line);
  }

  const canvas = h('div', {
    class: 'tt-canvas',
    style: { height: `${height}px`, minWidth: `${cols * (binary ? MIN_COL_BINARY : MIN_COL_GENERAL)}px` },
  }, svg);
  const nodeEls = new Map();
  for (const n of nodes) {
    const el = h('button', {
      type: 'button', class: 'tt-node', 'data-id': n.id,
      'aria-label': `Node ${n.label}`,
      style: { left: `calc(${GUTTER}px + ${n.x} * (100% - ${2 * GUTTER}px))`, top: `${yOf(n.depth)}px` },
    }, n.label);
    if (onPointerDown) el.addEventListener('pointerdown', (e) => onPointerDown(e, n.id));
    if (onClick) el.addEventListener('click', () => onClick(n.id));
    nodeEls.set(n.id, el);
    canvas.append(el);
  }
  const element = h('div', { class: 'tt-tree', role: 'group', 'aria-label': 'Tree' }, canvas);
  return { element, nodeEls };
}

VE.drawTree = drawTree;
})(globalThis.VE = globalThis.VE || {});
