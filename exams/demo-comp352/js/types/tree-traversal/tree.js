// Tree utilities shared by the tree-traversal view and grader (pure, no DOM).
//
// Tree format in the problem JSON (nested):
//   { "id": "A", "label": "A", "children": [ {...}, {...} ] }
// - "label" is optional (defaults to id); ids must be unique, labels need not be.
// - For binary trees, use null for a missing left child: "children": [null, { "id": "F" }]
//   (a single non-null child is treated as the LEFT child).
(function (VE) {
'use strict';
function normalizeTree(raw) {
  const byId = new Map();
  const walk = (n, depth) => {
    if (n == null) return null;
    if (typeof n !== 'object' || n.id == null) throw new Error('Tree node without an "id"');
    const id = String(n.id);
    if (byId.has(id)) throw new Error(`Duplicate tree node id "${id}"`);
    const node = { id, label: String(n.label ?? n.id), depth, children: [] };
    byId.set(id, node);
    node.children = (n.children ?? []).map((c) => walk(c, depth + 1));
    return node;
  };
  const root = walk(raw, 0);
  if (!root) throw new Error('Empty tree');
  return { root, byId };
}

function isBinary(root) {
  let ok = true;
  const walk = (n) => {
    if (!n) return;
    if (n.children.length > 2) ok = false;
    n.children.forEach(walk);
  };
  walk(root);
  return ok;
}

function traverse(root, order, binary = isBinary(root)) {
  const out = [];
  const kids = (n) => n.children.filter(Boolean);
  const pre = (n) => { if (!n) return; out.push(n.id); n.children.forEach(pre); };
  const post = (n) => { if (!n) return; n.children.forEach(post); out.push(n.id); };
  const ino = (n) => {
    if (!n) return;
    if (!binary) throw new Error('In-order traversal requires a binary tree');
    ino(n.children[0]); out.push(n.id); ino(n.children[1]);
  };
  switch (order) {
    case 'preorder': pre(root); break;
    case 'postorder': post(root); break;
    case 'inorder': ino(root); break;
    case 'levelorder': {
      const q = [root];
      while (q.length) { const n = q.shift(); out.push(n.id); q.push(...kids(n)); }
      break;
    }
    default: throw new Error(`Unknown traversal "${order}"`);
  }
  return out;
}

const TRAVERSAL_NAMES = {
  preorder: 'pre-order',
  postorder: 'post-order',
  inorder: 'in-order',
  levelorder: 'level-order (breadth-first)',
};

/**
 * Computes node positions: x in [0,1] (fraction of width), depth = row.
 * Binary trees use the in-order index (classic layout, missing children leave a gap);
 * general trees place leaves left to right and centre parents over their children.
 */
function layoutTree(root, binary = isBinary(root)) {
  let col = 0;
  const nodes = [];
  const edges = [];
  if (binary) {
    const walk = (n) => {
      if (!n) { col += 0.5; return; }
      const [l, r] = n.children;
      if (l || r) walk(l);
      n.col = col++;
      if (l || r) walk(r);
    };
    walk(root);
  } else {
    const walk = (n) => {
      const kids = n.children.filter(Boolean);
      if (!kids.length) { n.col = col++; return; }
      kids.forEach(walk);
      n.col = (kids[0].col + kids[kids.length - 1].col) / 2;
    };
    walk(root);
  }
  const cols = Math.max(col, 1);
  let maxDepth = 0;
  const collect = (n) => {
    if (!n) return;
    maxDepth = Math.max(maxDepth, n.depth);
    nodes.push({ id: n.id, label: n.label, depth: n.depth, x: (n.col + 0.5) / cols });
    n.children.forEach((c) => { if (c) { edges.push([n.id, c.id]); collect(c); } });
  };
  collect(root);
  return { nodes, edges, cols, maxDepth };
}

VE.tree = { normalizeTree, isBinary, traverse, layoutTree, TRAVERSAL_NAMES };
})(globalThis.VE = globalThis.VE || {});
