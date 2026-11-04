// Text notation for trees in the editor:   A(B(D, E), C(, F(G)))
// - a node is its label, optionally followed by its children in parentheses, separated by commas
// - an empty slot is a missing child: C(, F) has no left child and F as its right child
// - labels cannot contain ( ) or , — spaces around them are ignored
// Node ids are generated from the labels (a repeated label gets a suffix: 5, 5#2, ...).
(function (VE) {
'use strict';

function idAllocator() {
  const used = new Set();
  return (label) => {
    let id = label, k = 2;
    while (used.has(id)) id = `${label}#${k++}`;
    used.add(id);
    return id;
  };
}

function format(node) {
  if (!node) return '';
  const label = String(node.label ?? node.id);
  const kids = node.children ?? [];
  return kids.length ? `${label}(${kids.map(format).join(', ')})` : label;
}

function parse(text, alloc = idAllocator()) {
  const s = String(text);
  let i = 0;
  const ws = () => { while (i < s.length && /\s/.test(s[i])) i++; };
  const where = () => (i < s.length ? `"${s[i]}" at position ${i + 1}` : 'the end');
  const node = () => {
    ws();
    const start = i;
    while (i < s.length && !'(),'.includes(s[i])) i++;
    const label = s.slice(start, i).trim();
    ws();
    if (!label) {
      if (s[i] === '(') throw new Error(`missing label before "(" at position ${i + 1}`);
      return null;
    }
    const n = { id: alloc(label) };
    if (n.id !== label) n.label = label;
    if (s[i] === '(') {
      i++;
      const kids = [];
      for (;;) {
        kids.push(node());
        ws();
        if (s[i] === ',') { i++; continue; }
        if (s[i] === ')') { i++; break; }
        throw new Error(`expected "," or ")" but found ${where()}`);
      }
      while (kids.length && kids[kids.length - 1] === null) kids.pop();
      if (!kids.length) throw new Error(`"${label}( )" has no children — leave out the parentheses`);
      n.children = kids;
    }
    return n;
  };
  const root = node();
  ws();
  if (!root) throw new Error('the tree is empty');
  if (i < s.length) throw new Error(`unexpected ${where()}`);
  return root;
}

VE.treeText = { format, parse, idAllocator };
})(globalThis.VE = globalThis.VE || {});
