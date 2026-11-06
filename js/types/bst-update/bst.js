// Binary search trees and AVL trees, for "bst-update" questions (pure, no DOM; also loaded by
// tools/grade.mjs).
//
// Problem fields:
//   "treeType":    "bst" (default) | "avl"
//   "keys":        [50, 30, 70, 20]   distinct whole numbers; the starting tree is built by
//                                     inserting them in this order (with AVL rebalancing for "avl")
//   "operations":  [{ "insert": 25 }, { "delete": 30 }]   applied in order; the student shows the
//                                     tree after the last one
//   "replaceWith": "successor" (default) | "predecessor"   the key that replaces a deleted key
//                                     with two children: the smallest key of its right subtree, or
//                                     the largest key of its left subtree
//   "externalNodes": true (default)   draw the external nodes (empty leaves, as small squares), as in
//                                     textbooks where keys are stored only at the internal nodes of a
//                                     proper binary tree; false: draw only the nodes with keys
//
// A tree position is a path from the root: "" is the root, "L" its left child, "LR" the right
// child of that, ... A tree is stored as { path: key }.
(function (VE) {
'use strict';

const TREES = { bst: 'binary search tree', avl: 'AVL tree' };
const MAX_LEVELS = 8;

const ht = (n) => (n ? n.h : 0);
const fix = (n) => { n.h = 1 + Math.max(ht(n.left), ht(n.right)); return n; };
const leaf = (key) => fix({ key, left: null, right: null, h: 1 });
const balance = (n) => ht(n.left) - ht(n.right);

function rotateRight(z) { const y = z.left; z.left = y.right; y.right = z; fix(z); return fix(y); }
function rotateLeft(z) { const y = z.right; z.right = y.left; y.left = z; fix(z); return fix(y); }

/** AVL rebalancing of one node (after its subtrees changed). */
function rebalance(n, log) {
  fix(n);
  const b = balance(n);
  const why = `${n.key} is unbalanced (heights: left ${ht(n.left)}, right ${ht(n.right)})`;
  if (b > 1) {
    if (balance(n.left) >= 0) {
      log.push(`${why}: single right rotation, ${n.left.key} moves up`);
      return rotateRight(n);
    }
    log.push(`${why}: double rotation (left-right), ${n.left.right.key} moves up`);
    n.left = rotateLeft(n.left);
    return rotateRight(n);
  }
  if (b < -1) {
    if (balance(n.right) <= 0) {
      log.push(`${why}: single left rotation, ${n.right.key} moves up`);
      return rotateLeft(n);
    }
    log.push(`${why}: double rotation (right-left), ${n.right.left.key} moves up`);
    n.right = rotateRight(n.right);
    return rotateLeft(n);
  }
  return n;
}

function insert(n, key, avl, log, path = [], ext = false) {
  if (!n) {
    const where = ext
      ? 'it is stored in the external node reached there, which becomes an internal node with two new external children'
      : 'it becomes a new leaf';
    log.push(`insert ${key}: ` + (path.length ? `${path.join(', ')} — ${where}` : `the tree is empty — ${ext ? 'it is stored in the root' : 'it becomes the root'}`));
    return leaf(key);
  }
  if (key === n.key) throw new Error(`${key} is already in the tree`);
  if (key < n.key) {
    path.push(`${key} < ${n.key}, go left`);
    n.left = insert(n.left, key, avl, log, path, ext);
  } else {
    path.push(`${key} > ${n.key}, go right`);
    n.right = insert(n.right, key, avl, log, path, ext);
  }
  return avl ? rebalance(n, log) : fix(n);
}

function remove(n, key, avl, rule, log, what = `delete ${key}`, ext = false) {
  if (!n) throw new Error(`${key} is not in the tree`);
  if (key < n.key) n.left = remove(n.left, key, avl, rule, log, what, ext);
  else if (key > n.key) n.right = remove(n.right, key, avl, rule, log, what, ext);
  else if (!n.left || !n.right) {
    const child = n.left || n.right;
    log.push(`${what}: ` + (ext
      ? (child ? `one of its children is an external node; the subtree of ${child.key} takes its place` : 'both its children are external nodes; it is replaced by an external node')
      : (child ? `it has one child, ${child.key}, which takes its place` : 'it is a leaf, just remove it')));
    return child;
  } else if (rule === 'predecessor') {
    let p = n.left;
    while (p.right) p = p.right;
    log.push(`${what}: ${ext ? 'both its children are internal' : 'it has two children'}; replace it with its in-order predecessor ${p.key} (the largest key in its left subtree)`);
    n.key = p.key;
    n.left = remove(n.left, p.key, avl, rule, log, `remove ${p.key} from the left subtree`, ext);
  } else {
    let s = n.right;
    while (s.left) s = s.left;
    log.push(`${what}: ${ext ? 'both its children are internal' : 'it has two children'}; replace it with its in-order successor ${s.key} (the smallest key in its right subtree)`);
    n.key = s.key;
    n.right = remove(n.right, s.key, avl, rule, log, `remove ${s.key} from the right subtree`, ext);
  }
  return avl ? rebalance(n, log) : fix(n);
}

/** { path: key } of a linked tree. */
function positions(root) {
  const out = {};
  const walk = (n, p) => { if (!n) return; out[p] = n.key; walk(n.left, p + 'L'); walk(n.right, p + 'R'); };
  walk(root, '');
  return out;
}

/** Number of levels of a { path: key } tree (0 when empty). */
function levels(pos) {
  return Object.keys(pos).reduce((m, p) => Math.max(m, p.length + 1), 0);
}

/** Text form: 50(30(20, 40), 70(, 80)) — a missing left child leaves the place before the comma empty. */
function toText(pos, p = '') {
  if (!(p in pos)) return '';
  const l = toText(pos, p + 'L'), r = toText(pos, p + 'R');
  return String(pos[p]) + (l || r ? `(${l}${r ? `, ${r}` : ''})` : '');
}

function normOp(op, i) {
  const kind = op && ('insert' in op ? 'insert' : 'delete' in op ? 'delete' : null);
  if (!kind || !Number.isInteger(op[kind])) throw new Error(`operation ${i + 1} must look like {"insert": 25} or {"delete": 30}`);
  return { op: kind, key: op[kind] };
}

function settings(problem) {
  const treeType = problem.treeType ?? 'bst';
  if (!TREES[treeType]) throw new Error(`"treeType" must be "bst" or "avl", not "${treeType}"`);
  const keys = problem.keys;
  if (!Array.isArray(keys) || !keys.length || keys.some((k) => !Number.isInteger(k))) throw new Error('"keys" must be a list of whole numbers');
  if (new Set(keys).size !== keys.length) throw new Error('the keys must all be different');
  const ops = problem.operations;
  if (!Array.isArray(ops) || !ops.length) throw new Error('"operations" must list at least one {"insert": k} or {"delete": k}');
  const replaceWith = problem.replaceWith ?? 'successor';
  if (!['successor', 'predecessor'].includes(replaceWith)) throw new Error('"replaceWith" must be "successor" or "predecessor"');
  if (problem.externalNodes != null && typeof problem.externalNodes !== 'boolean') throw new Error('"externalNodes" must be true or false');
  return { treeType, avl: treeType === 'avl', keys: keys.slice(), operations: ops.map(normOp), replaceWith, external: problem.externalNodes ?? true };
}

/** { initial, final, steps, levels (tree levels the student gets), allKeys (sorted) } */
function simulate(problem) {
  const s = settings(problem);
  let root = null;
  for (const k of s.keys) root = insert(root, k, s.avl, []);
  const initial = positions(root);
  const steps = [];
  for (const { op, key } of s.operations) {
    root = op === 'insert' ? insert(root, key, s.avl, steps, [], s.external) : remove(root, key, s.avl, s.replaceWith, steps, undefined, s.external);
  }
  const final = positions(root);
  // room to work in: one level more than needed for every insertion, plus one
  const inserts = s.operations.filter((o) => o.op === 'insert').length;
  const shown = Math.max(levels(initial) + inserts + 1, levels(final));
  if (shown > MAX_LEVELS) throw new Error(`the tree is too deep to draw (it needs ${shown} levels, at most ${MAX_LEVELS})`);
  const allKeys = [...new Set([...s.keys, ...s.operations.map((o) => o.key)])].sort((a, b) => a - b);
  return { initial, final, steps, levels: shown, allKeys };
}

/** Whether a { path: key } tree is a valid search tree (connected, in-order sorted) and AVL-balanced. */
function check(pos) {
  const paths = Object.keys(pos);
  const connected = paths.every((p) => p === '' || p.slice(0, -1) in pos);
  const inorder = [];
  const height = (p) => {
    if (!(p in pos)) return 0;
    const l = height(p + 'L');
    inorder.push(pos[p]);
    const r = height(p + 'R');
    if (Math.abs(l - r) > 1) height.unbalanced = true;
    return 1 + Math.max(l, r);
  };
  height('');
  const sorted = inorder.every((k, i) => i === 0 || inorder[i - 1] < k);
  return { connected, sorted: connected && sorted, balanced: connected && !height.unbalanced };
}

function opsText(problem) {
  return settings(problem).operations.map((o, i) => `${i ? 'then ' : ''}<strong>${o.op === 'insert' ? 'inserting' : 'deleting'} ${o.key}</strong>`).join(', ');
}

function defaultPrompt(problem) {
  const s = settings(problem);
  const parts = [`<p>Show the ${TREES[s.treeType]} below after ${opsText(problem)}.`];
  if (s.external) parts.push(' The keys are stored in the internal nodes; the small squares are the external nodes, which hold no key.');
  if (s.avl) parts.push(' Rebalance it with rotations wherever the AVL property is broken.');
  if (s.operations.some((o) => o.op === 'delete')) {
    parts.push(s.replaceWith === 'predecessor'
      ? ` A deleted key ${s.external ? 'whose children are both internal' : 'with two children'} is replaced by its in-order <strong>predecessor</strong> (the largest key in its left subtree).`
      : ` A deleted key ${s.external ? 'whose children are both internal' : 'with two children'} is replaced by its in-order <strong>successor</strong> (the smallest key in its right subtree).`);
  }
  return parts.join('') + '</p>';
}

VE.bstUpdate = { TREES, settings, simulate, positions, levels, toText, check, defaultPrompt, opsText };
})(globalThis.VE = globalThis.VE || {});
