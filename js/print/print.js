// Paper version of an exam: renders every question of an exam bundle for printing, either as the
// exam (empty answer areas) or as the marking scheme (answers filled in, explanation, marking rule).
// Used by tools/print_exam.py, which loads this page in headless Chrome and saves it as PDF.
// Needs the question-type scripts (models) and VE.bundle (from exam.bundle.js).
// Options (window.PRINT_OPTIONS): mode "exam" | "key", department, logo, instructions[], partA (bool)
(function (VE) {
'use strict';
const { h } = VE.util;
const O = window.PRINT_OPTIONS || {};
const KEY = O.mode === 'key';
const B = VE.bigO || globalThis.BigO;
const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

// ---------- data -------------------------------------------------------------------------------
const bundle = VE.bundle;
if (!bundle) throw new Error('exam.bundle.js was not loaded');
const exam = bundle.exam;
const questions = exam.questions.map((q, i) => {
  const problem = bundle.files[q.problem];
  return { id: q.id || `q${i + 1}`, type: q.type || problem.type, points: q.points ?? 1, problem,
    solution: q.solution ? bundle.files[q.solution] ?? null : null };
});
// Part A: questions answered by picking one letter; Part B: everything else
const isChoice = (q) => (q.type === 'mcq' && !q.problem.multiple) || (q.type === 'asymptotic' && q.problem.task === 'tight');
const usePartA = O.partA !== false && questions.some(isChoice) && questions.some((q) => !isChoice(q));
const partA = usePartA ? questions.filter(isChoice) : [];
const partB = usePartA ? questions.filter((q) => !isChoice(q)) : questions;
partA.forEach((q, i) => { q.label = `${i + 1}.`; q.short = String(i + 1); });
partB.forEach((q, i) => { q.label = usePartA ? `B.${i + 1}` : `${i + 1}.`; q.short = usePartA ? `B${i + 1}` : String(i + 1); });
const sum = (qs) => qs.reduce((s, q) => s + q.points, 0);
const fmtPts = (p) => `${+p.toFixed(2)} point${p === 1 ? '' : 's'}`;

// ---------- small building blocks ----------------------------------------------------------
const html = (s) => h('span', { html: s });
const prompt = (q, text) => VE.renderPrompt({ ...q.problem, prompt: text ?? q.problem.prompt }, document.baseURI);
const blank = (w = '9em') => h('span', { class: 'pp-blank', style: { minWidth: w } });
const filled = (text, w) => h('span', { class: 'pp-blank pp-filled', style: w ? { minWidth: w } : null }, text);
const answerLine = (label, value, w) => h('p', { class: 'pp-line' }, h('strong', {}, label), ' ', KEY && value != null ? filled(value, w) : blank(w));
const space = (heightIn, label) => h('div', { class: 'pp-space', style: { height: `${heightIn}in` } }, label ? h('span', { class: 'pp-space-label' }, label) : null);
/** Cells with indices; values (key mode) or empty; mark: Set of indexes to highlight. */
function cells(n, values, { mark, wide, indices = true, x = false } = {}) {
  return h('table', { class: `pp-cells${wide ? ' pp-wide' : ''}` },
    h('tr', {}, Array.from({ length: n }, (_, i) => h('td', { class: mark?.has(i) ? 'pp-mark' : null },
      values ? (values[i] == null ? (x ? 'X' : '') : values[i]) : ''))),
    indices ? h('tr', { class: 'pp-idx' }, Array.from({ length: n }, (_, i) => h('td', {}, String(i)))) : null);
}
const checkbox = (on) => h('span', { class: `pp-box${on ? ' on' : ''}` }, on ? '✓' : '');
const math = (src) => html(`<span class="math">${B.html(B.parse(src))}</span>`);

/** Generic answer and explanation, from the type's grader (no answer given). */
function keyInfo(q) {
  if (!q.solution) return { correctAnswer: null, explanation: null };
  try {
    return VE.graders[q.type].grade({ problem: q.problem, solution: q.solution, response: null, points: q.points });
  } catch (e) { return { correctAnswer: `(cannot be computed: ${e.message})`, explanation: null }; }
}

/** How the question is marked, in words. */
function markingRule(q) {
  const s = q.solution || {};
  const P = q.points;
  const half = +(P / 2).toFixed(2);
  switch (q.type) {
    case 'mcq': return `${fmtPts(P)} for the correct choice${q.problem.multiple ? ' (exactly the correct set of options)' : ''}; otherwise 0.`;
    case 'text': return s.accepted || s.patterns ? `${fmtPts(P)} for an equivalent answer; otherwise 0.` : 'Graded by hand.';
    case 'tree-traversal': case 'tree-array': case 'heap-build':
      return s.scoring === 'positional' ? `In proportion to the positions that are right (${fmtPts(P)} for all).` : `${fmtPts(P)} for the exact answer; otherwise 0.`;
    case 'sort-count': return `${fmtPts(P)} for the exact count; otherwise 0.`;
    case 'sort-trace': return s.scoring === 'prefix' ? `In proportion to the swaps that are right before the first mistake (${fmtPts(P)} for all).` : `${fmtPts(P)} for the exact sequence of swaps; otherwise 0.`;
    case 'hash-table': {
      if (s.scoring === 'exact') return `${fmtPts(P)} for the exact table and count; otherwise 0.`;
      const w = s.countWeight ?? 0.25;
      return `${+(P * (1 - w)).toFixed(2)} for the table, in proportion to the keys in the right cell; ${+(P * w).toFixed(2)} for the number of collisions.`;
    }
    case 'radix-sort': return s.scoring === 'exact' ? `${fmtPts(P)} for all passes right; otherwise 0.`
      : `${+(P / q.problem.passes || P / 4).toFixed(2)} per pass. Check each pass against the student's own previous row (follow-through): one mistake is not counted again.`;
    case 'bst-update': case 'heap-tree': return s.scoring === 'exact' ? `${fmtPts(P)} for the exact tree; otherwise 0.` : `In proportion to the keys in the right position (${fmtPts(P)} for all).`;
    case 'asymptotic': {
      const t = q.problem.task ?? 'relation';
      if (t === 'relation') return s.scoring === 'statements' ? `${+(P / 3).toFixed(2)} per statement correctly ticked or left empty.` : `${fmtPts(P)} if exactly the true statements are ticked; otherwise 0.`;
      if (t === 'witness') return `${fmtPts(P)} for any constants that satisfy the definition for every n ≥ n₀ (check them); otherwise 0. Different constants than below are fine.`;
      if (t === 'rank') return s.scoring === 'exact' ? `${fmtPts(P)} for a correct order; otherwise 0.` : `In proportion to the pairs in the right order (${fmtPts(P)} for all); functions with the same growth may come in either order.`;
      return `${fmtPts(P)} for the correct choice; otherwise 0.`;
    }
    case 'graph-search': return s.scoring === 'exact' ? `${fmtPts(P)} for everything right; otherwise 0.`
      : `The order and the d values${q.problem.algorithm === 'dfs' ? ' and the f values' : ''} count equally (${+(P / (q.problem.algorithm === 'dfs' ? 3 : 2)).toFixed(2)} each), each in proportion to what is right.`;
    case 'transitive-closure': return s.scoring === 'exact' ? `${fmtPts(P)} for every iteration right; otherwise 0.`
      : `${+(P / (q.problem.iterations || 4)).toFixed(2)} per iteration, in proportion to |right ∩ given| / |right ∪ given|. Check each iteration against the student's own graph so far (follow-through).`;
    case 'floyd-warshall': return s.scoring === 'exact' ? `${fmtPts(P)} for every matrix right; otherwise 0.`
      : `${+(P / (q.problem.iterations || 3)).toFixed(2)} per matrix, in proportion to the cells right among those that change. Check each matrix against the student's own previous one (follow-through).`;
    case 'recursion': return s.scoring === 'exact' ? `${fmtPts(P)} for both answers right; otherwise 0.` : `${half} for the running time, ${half} for the stack depth.`;
    default: return '';
  }
}

// ---------- the question types ---------------------------------------------------------------
const R = {};

R.mcq = (q) => {
  const p = q.problem;
  const correct = new Set(q.solution?.correct ?? []);
  const list = h('ol', { class: 'pp-options' }, p.options.map((o, i) => h('li', { class: KEY && correct.has(o.id) ? 'pp-right' : null },
    h('span', { class: 'pp-letter' }, `(${LETTERS[i]})`), ' ', html(o.html ?? escapeHtml(o.text)), KEY && correct.has(o.id) ? h('span', { class: 'pp-tick' }, ' ✓') : null)));
  const ans = p.options.map((o, i) => (correct.has(o.id) ? LETTERS[i] : null)).filter(Boolean).join(', ');
  return [prompt(q), p.multiple ? h('p', { class: 'pp-note' }, 'Select all the correct options.') : null, list,
    p.multiple ? answerLine('Answer (letters):', ans, '8em') : null];
};

R.text = (q) => {
  const p = q.problem, s = q.solution || {};
  const ans = (s.accepted && s.accepted[0]) || null;
  return [prompt(q), p.multiline ? (KEY ? answerLine('Answer:', ans ?? '(graded by hand)', '20em') : space(1.6, 'Answer'))
    : answerLine('Answer:', ans ?? '(graded by hand)', '16em'),
  KEY && s.accepted?.length > 1 ? h('p', { class: 'pp-note' }, `Also accept: ${s.accepted.slice(1).join(' · ')}`) : null];
};

function treeFigure(rawTree, binary) {
  const { root } = VE.tree.normalizeTree(rawTree);
  return h('div', { class: 'pp-tree' }, VE.drawTree({ root, binary: binary ?? VE.tree.isBinary(root) }).element);
}

R['tree-traversal'] = (q) => {
  const p = q.problem;
  const { root, byId } = VE.tree.normalizeTree(p.tree);
  const binary = p.binary ?? VE.tree.isBinary(root);
  const seq = VE.tree.traverse(root, p.traversal, binary);
  const name = (VE.tree.TRAVERSAL_NAMES || {})[p.traversal] || p.traversal;
  return [prompt(q, p.prompt ?? `<p>List the nodes of the tree below in <strong>${name}</strong> order.</p>`),
    treeFigure(p.tree, binary), h('p', { class: 'pp-line' }, h('strong', {}, 'Answer:')),
    cells(seq.length, KEY ? seq.map((id) => byId.get(id).label) : null, { indices: false })];
};

R['tree-array'] = (q) => {
  const p = q.problem;
  const n = VE.treeArray.slotCount(p);
  const labels = VE.treeArray.allLabels(p);
  const want = VE.treeArray.pad(VE.treeArray.computeExpected(p), n).map((id) => (id == null ? null : labels.get(id)));
  const extra = p.task === 'heap-insert' ? h('p', { class: 'pp-note' }, `Keys to insert, in order: ${(p.insert || []).map((x) => x.label ?? x.id).join(', ')}`) : null;
  return [prompt(q), treeFigure(p.tree, true), extra,
    h('p', { class: 'pp-line' }, h('strong', {}, 'Array'), ' (write X in a cell that stays empty):'), cells(n, KEY ? want : null, { x: true })];
};

R['sort-count'] = (q) => {
  const p = q.problem;
  const sim = VE.sorting.simulate(p);
  const what = (p.count ?? 'swaps') === 'comparisons' ? 'comparisons' : 'swaps';
  return [prompt(q, p.prompt ?? VE.sorting.defaultPrompt(p, 'count')), VE.sortingUI.arrayStrip(p.data), VE.sortingUI.pseudocodeBox(p, { markComparisons: what === 'comparisons' }),
    answerLine(`Number of ${what}:`, String(what === 'swaps' ? sim.swaps.length : sim.comparisons), '6em')];
};

R['sort-trace'] = (q) => {
  const p = q.problem;
  const sim = VE.sorting.simulate(p);
  const rows = KEY ? sim.swaps.length : sim.swaps.length + 2;
  let a = p.data.slice();
  const grid = h('div', { class: 'pp-trace' }, h('div', { class: 'pp-row-label' }, 'start'), cells(a.length, a, {}));
  for (let r = 0; r < rows; r++) {
    let vals = null, mark = null;
    if (KEY) { const [i, j] = sim.swaps[r]; a = a.slice(); [a[i], a[j]] = [a[j], a[i]]; vals = a; mark = new Set([i, j]); }
    grid.append(h('div', { class: 'pp-row-label' }, `swap ${r + 1}`), cells(a.length, vals, { mark, indices: false }));
  }
  return [prompt(q, p.prompt ?? VE.sorting.defaultPrompt(p, 'trace')), VE.sortingUI.pseudocodeBox(p),
    h('p', { class: 'pp-note' }, KEY ? 'The two swapped cells are shaded.' : 'One swap per row: write the whole array after each swap. You may not need every row.'), grid];
};

R['heap-build'] = (q) => {
  const p = q.problem;
  const sim = VE.heapBuild.simulate(p);
  const final = sim.final ?? sim.heap ?? sim.array ?? (sim.steps?.length ? sim.steps[sim.steps.length - 1].array : null);
  const n = Math.max(p.slots ?? 0, p.data.length);
  return [prompt(q, p.prompt ?? VE.heapBuild.defaultPrompt(p)), h('p', { class: 'pp-line' }, h('strong', {}, 'Keys: '), p.data.join(', ')),
    KEY ? null : space(1.8, 'Rough work (the tree)'),
    h('p', { class: 'pp-line' }, h('strong', {}, 'The heap as an array:')), cells(n, KEY && final ? final.map((x) => (x == null ? null : String(x))) : null)];
};

R['hash-table'] = (q) => {
  const p = q.problem;
  const s = VE.hashTable.settings(p);
  const sim = VE.hashTable.simulate(p);
  const keyRow = h('table', { class: 'pp-cells pp-keys' },
    h('tr', {}, h('th', {}, 'k'), s.keys.map((k) => h('td', {}, String(k)))),
    h('tr', { class: 'pp-sub' }, h('th', {}, 'h(k)'), s.keys.map((k) => h('td', {}, String(k % s.size)))),
    s.probing === 'double' ? h('tr', { class: 'pp-sub' }, h('th', {}, 'h′(k)'), s.keys.map((k) => h('td', {}, String(s.q - (k % s.q))))) : null);
  return [prompt(q, p.prompt ?? VE.hashTable.defaultPrompt(p)),
    h('div', { class: 'pp-info', html: VE.hashTable.infoHtml(p) }),
    h('p', { class: 'pp-line' }, h('strong', {}, 'Keys, in insertion order:')), keyRow,
    h('p', { class: 'pp-line' }, h('strong', {}, `The hash table (size ${s.size}):`)), cells(s.size, KEY ? sim.table.map((x) => (x == null ? null : String(x))) : null),
    answerLine('Total number of collisions:', String(sim.collisions), '5em')];
};

R['radix-sort'] = (q) => {
  const p = q.problem;
  const s = VE.radixSort.settings(p);
  const truth = VE.radixSort.simulate(p);
  const bin = s.base === 'binary';
  const show = (x) => (bin ? h('span', { class: 'pp-num' }, h('span', {}, String(x)), h('span', { class: 'pp-bits' }, VE.radixSort.digitsOf(p, x).join(''))) : VE.radixSort.digitsOf(p, x).join('').replace(/^0+(?=.)/, (z) => z));
  const row = (order) => h('table', { class: `pp-cells${bin ? ' pp-wide' : ''}` }, h('tr', {}, s.data.map((_, i) => h('td', {}, order ? show(s.data[order[i]]) : ''))));
  const out = [prompt(q, p.prompt ?? VE.radixSort.defaultPrompt(p)), h('p', { class: 'pp-line' }, h('strong', {}, 'Input:')), row(s.data.map((_, i) => i))];
  truth.forEach((t, k) => out.push(h('p', { class: 'pp-line pp-tight' }, h('strong', {}, `After pass ${k + 1}`), ` — sorted by ${VE.radixSort.digitName(p, k)}:`), row(KEY ? t.order : null)));
  return out;
};

R['heap-tree'] = (q) => {
  const p = q.problem;
  const sol = VE.heapTree.solve(p);
  const s = sol.s;
  const out = [prompt(q, p.prompt ?? VE.heapTree.defaultPrompt(p))];
  if (s.method === 'insert') out.push(h('p', { class: 'pp-line' }, h('strong', {}, 'Keys, in insertion order: '), p.data.join(', ')));
  else out.push(h('p', { class: 'pp-line' }, h('strong', {}, 'The initial array as a tree:')), h('div', { class: 'pp-tree' }, VE.drawPositions(sol.initial, { free: false })));
  out.push(h('p', { class: 'pp-line' }, h('strong', {}, `The ${s.heap}-heap:`)),
    KEY ? h('div', { class: 'pp-tree' }, VE.drawPositions(sol.final, { free: false })) : space(0.5 * (s.levels - 1) + 0.9));
  return out;
};

R['bst-update'] = (q) => {
  const p = q.problem;
  const s = VE.bstUpdate.settings(p);
  const sim = VE.bstUpdate.simulate(p);
  const ops = s.operations.map((o) => `${o.op} ${o.key}`).join(', then ');
  const levels = Math.max(VE.bstUpdate.levels(sim.final), VE.bstUpdate.levels(sim.initial));
  return [prompt(q, p.prompt ?? VE.bstUpdate.defaultPrompt(p)),
    h('p', { class: 'pp-line' }, h('strong', {}, s.avl ? 'The AVL tree now:' : 'The tree now:')),
    h('div', { class: 'pp-tree' }, VE.drawPositions(sim.initial, { external: s.external })),
    h('p', { class: 'pp-line' }, h('strong', {}, `The tree after: ${ops}`)),
    KEY ? h('div', { class: 'pp-tree' }, VE.drawPositions(sim.final, { external: s.external })) : space(0.5 * levels + 0.7)];
};

R.asymptotic = (q) => {
  const p = q.problem;
  const A = VE.asymptotic;
  const sol = A.solve(p);
  const s = sol.s;
  const text = p.prompt ?? A.defaultPrompt(p);
  if (s.task === 'relation') {
    return [prompt(q, text), h('div', { class: 'pp-math-big' }, 'f(n) = ', math(s.f), h('span', { class: 'pp-gap' }), 'g(n) = ', math(s.g)),
      h('div', { class: 'pp-choices' }, ['O', 'Omega', 'Theta'].map((r) => h('span', { class: 'pp-choice' }, checkbox(KEY && sol.holds[r]), ` f = ${A.REL[r]}(g)`)))];
  }
  if (s.task === 'tight') {
    return [prompt(q, text), h('div', { class: 'pp-math-big' }, math(s.f), ' is Θ( ? )'),
      h('ol', { class: 'pp-options pp-inline' }, s.options.map((g, i) => h('li', { class: KEY && i === sol.right ? 'pp-right' : null },
        h('span', { class: 'pp-letter' }, `(${LETTERS[i]})`), ' Θ(', math(g), ')', KEY && i === sol.right ? h('span', { class: 'pp-tick' }, ' ✓') : null)))];
  }
  if (s.task === 'witness') {
    const ex = sol.example || {};
    const keys = s.relation === 'Theta' ? [['c₁', ex.c], ['c₂', ex.c2], ['n₀', ex.n0]] : [['c', ex.c], ['n₀', ex.n0]];
    return [prompt(q, text), h('div', { class: 'pp-math-big' }, 'f(n) = ', math(s.f), h('span', { class: 'pp-gap' }), 'g(n) = ', math(s.g)),
      h('p', { class: 'pp-line pp-center' }, keys.map(([k, v]) => h('span', { class: 'pp-const' }, h('strong', {}, `${k} = `), KEY && v != null ? filled(B.fmtNum(v), '4em') : blank('5em')))),
      KEY ? null : space(1.4, 'Justification')];
  }
  // rank
  const n = s.functions.length;
  return [prompt(q, text), h('div', { class: 'pp-choices' }, s.functions.map((f) => h('span', { class: 'pp-choice' }, math(f)))),
    h('p', { class: 'pp-line' }, h('strong', {}, 'From the slowest to the fastest growing:')),
    h('ol', { class: 'pp-rank' }, Array.from({ length: n }, (_, k) => h('li', {}, KEY ? h('span', { class: 'pp-blank pp-filled' }, math(s.functions[sol.order[k]])) : blank('9em'))))];
};

R.recursion = (q) => {
  const p = q.problem;
  const sol = VE.recursion.solve(p);
  const menu = (title, right) => h('div', { class: 'pp-menu' }, h('strong', {}, title), ' ',
    h('span', { class: 'pp-choices pp-left' }, sol.options.map((o, i) => h('span', { class: 'pp-choice' }, checkbox(KEY && i === right), ' Θ(', math(o), ')'))));
  return [prompt(q, (p.prompt ?? VE.recursion.defaultPrompt()).replace('Give the tightest bounds.', 'Tick one tight bound for each.') + `<pre><code>${VE.recursion.escapeHtml(sol.s.code)}</code></pre>`),
    menu('Running time:', sol.timeIndex), menu('Stack depth (space):', sol.depthIndex)];
};

const graphFig = (problem, g, w = 460, hgt = 270) => h('div', { class: 'pp-graph' }, VE.drawGraph({ g, pos: VE.graph.layout(problem, g), width: problem.width || w, height: problem.height || hgt }).svg);

R['graph-search'] = (q) => {
  const p = q.problem;
  const S = VE.graphSearch, G = VE.graph;
  const sol = S.solve(p);
  const V = sol.g.V;
  const order = Array.from({ length: V.length }, (_, i) => sol.order[i] ?? null);
  const row = (label, m) => h('tr', {}, h('th', {}, label), V.map((v) => h('td', {}, KEY ? G.fmt(m.get(v)) : '')));
  return [prompt(q, p.prompt ?? S.defaultPrompt(p)), graphFig(p, sol.g),
    h('p', { class: 'pp-line' }, h('strong', {}, `${S.orderLabel(sol.algorithm)}:`)), cells(V.length, KEY ? order : null, { indices: false }),
    h('table', { class: 'pp-cells pp-keys' }, h('tr', {}, h('th', {}, 'vertex'), V.map((v) => h('th', {}, v))), row('d', sol.d), sol.withF ? row('f', sol.f) : null),
    h('p', { class: 'pp-note' }, 'Write ∞ for a vertex that is never reached.')];
};

R['transitive-closure'] = (q) => {
  const p = q.problem;
  const T = VE.transitiveClosure;
  const sol = T.solve(p);
  return [prompt(q, p.prompt ?? T.defaultPrompt(p)), graphFig(p, sol.g, 420, 250),
    ...sol.levels.map((l, k) => h('p', { class: 'pp-line' }, h('strong', {}, `Iteration ${k + 1} (through ${sol.g.V[k]}), new edges: `),
      KEY ? filled(l.length ? l.map(T.arrow).join(', ') : 'none', '20em') : blank('26em')))];
};

R['floyd-warshall'] = (q) => {
  const p = q.problem;
  const F = VE.floydWarshall, G = VE.graph;
  const sol = F.solve(p);
  const V = sol.g.V;
  const mat = (title, D, changed) => h('div', { class: 'pp-fw' }, h('div', { class: 'pp-fw-title' }, title),
    h('table', { class: 'pp-cells pp-keys' }, h('tr', {}, h('th', {}, ''), V.map((v) => h('th', {}, v))),
      V.map((v, i) => h('tr', {}, h('th', {}, v), V.map((_, j) => h('td', { class: changed?.has(`${i},${j}`) ? 'pp-mark' : null }, D ? G.fmt(D[i][j]) : ''))))));
  return [prompt(q, p.prompt ?? F.defaultPrompt(p)), graphFig(p, sol.g, 420, 250),
    h('div', { class: 'pp-fw-grid' }, mat('D(0)', sol.D0),
      ...sol.levels.map((l, k) => mat(`D(${k + 1}): through ${V[k]}`, KEY ? l.D : null, KEY ? new Set(l.changes.map((c) => `${c.i},${c.j}`)) : null))),
    KEY ? h('p', { class: 'pp-note' }, 'Shaded cells are the ones that change in that iteration.') : null];
};

function escapeHtml(t) { return String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

// ---------- one question ----------------------------------------------------------------------
function question(q) {
  const box = h('section', { class: `pp-q pp-${q.type}`, id: `pp-${q.id}` });
  box.append(h('h3', { class: 'pp-qhead' }, h('span', { class: 'pp-qnum' }, q.label), ' ',
    h('span', { class: 'pp-pts' }, `[${fmtPts(q.points)}]`), ' ', q.problem.title ? h('span', { class: 'pp-qtitle' }, q.problem.title) : null));
  try {
    const body = (R[q.type] || (() => [prompt(q)]))(q);
    box.append(...[].concat(body).filter(Boolean));
  } catch (e) {
    box.append(h('p', { class: 'pp-error' }, `This question cannot be printed: ${e.message}`));
  }
  if (KEY) {
    const info = keyInfo(q);
    box.append(h('div', { class: 'pp-key' },
      info.correctAnswer ? h('p', {}, h('strong', {}, 'Answer: '), h('span', { class: 'pp-answer' }, info.correctAnswer)) : null,
      h('p', {}, h('strong', {}, 'Marking: '), markingRule(q)),
      info.explanation ? h('div', { class: 'pp-expl' }, h('strong', {}, 'Solution: '), html(info.explanation)) : null));
  }
  return box;
}

// ---------- cover page ------------------------------------------------------------------------
function cover() {
  const course = exam.course || {};
  const hours = exam.durationMinutes ? (exam.durationMinutes % 60 === 0 ? `${exam.durationMinutes / 60} hour${exam.durationMinutes === 60 ? '' : 's'}` : `${exam.durationMinutes} minutes`) : null;
  const head = h('header', { class: 'pp-cover-head' },
    h('div', { class: 'pp-dept' }, O.logo ? h('img', { src: O.logo, alt: 'Concordia University' }) : null, h('div', {}, O.department || 'Department of Computer Science and Software Engineering')),
    h('div', { class: 'pp-course' }, [course.code, course.term].filter(Boolean).join(', ')),
    h('div', { class: 'pp-meta' },
      h('div', { class: 'pp-examtype' }, exam.title || exam.examType || 'Exam'),
      hours ? h('div', {}, `Time: ${hours}`) : null,
      h('div', { class: 'pp-fill' }, 'Date: ', blank('9em')),
      h('div', { class: 'pp-fill' }, 'Instructors: ', blank('14em'))));
  const minutes = exam.durationMinutes;
  const instr = O.instructions?.length ? O.instructions : [
    'Books, notes, or any electronic devices are <strong>not</strong> allowed. Closed book exam.',
    'No cell phone can be in your possession during the exam.',
    minutes ? `You have <strong>${minutes} minutes</strong> to answer <strong>all</strong> questions.` : 'Answer <strong>all</strong> questions.',
    'You <strong>must write your name and student ID</strong> on the first page of the exam.',
    'It is <em>recommended</em> to write your <strong>student ID</strong> (last 4 digits) on <strong>every</strong> page.',
    'Make sure you have <strong>{PAGES} pages</strong> including this page prior to starting your exam.',
    usePartA ? 'For <strong>Part A</strong>, write the letter of the best answer in the box next to each question; there is no negative marking. For <strong>Part B</strong>, write your answers only in the space provided below each question. Use the empty reverse sides for your rough work.'
      : 'Write your answers only in the space provided below each question. Use the empty reverse sides for your rough work.',
    'Please be <strong>brief</strong> but <strong>precise</strong> in your justifications.',
  ];
  const total = sum(questions);
  // marks table: Part A total, one column per Part B question (rows of at most 10), total
  const colsB = partB.map((q) => `${q.short}/${+q.points.toFixed(2)}`);
  const chunks = [];
  for (let i = 0; i < colsB.length; i += 10) chunks.push(colsB.slice(i, i + 10));
  const table = h('table', { class: 'pp-marks' });
  chunks.forEach((chunk, ci) => {
    const headRow = h('tr', {});
    if (ci === 0 && usePartA) headRow.append(h('th', { rowspan: String(chunks.length * 2), class: 'pp-parttot' }, `PART A / ${+sum(partA).toFixed(2)}`, h('div', { class: 'pp-markcell' })));
    chunk.forEach((c) => headRow.append(h('th', {}, c)));
    if (ci === 0) headRow.append(h('th', { rowspan: String(chunks.length * 2), class: 'pp-parttot' }, `Total / ${+total.toFixed(2)}`, h('div', { class: 'pp-markcell' })));
    table.append(headRow, h('tr', { class: 'pp-markrow' }, chunk.map(() => h('td', {}))));
  });
  return h('section', { class: 'pp-cover' }, head,
    h('ol', { class: 'pp-instr' }, instr.map((t) => h('li', { html: t }))),
    h('div', { class: 'pp-ids' },
      h('p', {}, 'Name: ', blank('28em')),
      h('p', {}, 'ID #: ', blank('14em')),
      h('p', {}, 'Section: ', blank('14em'))),
    h('p', { class: 'pp-markshead' }, 'For instructor use only. Do NOT write anything inside this table.'),
    usePartA || partB.length ? table : null);
}

function partHeader(title, qs, text) {
  return h('div', { class: 'pp-part' }, h('h2', {}, `${title} [${fmtPts(sum(qs)).replace('points', 'Points').replace('point', 'Point')}]`), text ? h('p', { html: text }) : null);
}

// ---------- assemble --------------------------------------------------------------------------
function build() {
  const root = document.getElementById('paper');
  if (KEY) {
    const course = exam.course || {};
    root.append(h('section', { class: 'pp-keycover' },
      h('h1', {}, 'Marking scheme and solutions'),
      h('p', { class: 'pp-keysub' }, [course.code, course.term, exam.title].filter(Boolean).join(' · ')),
      h('p', {}, `${questions.length} questions, ${fmtPts(sum(questions))} in total. Each question shows the correct answer, how to mark it and a worked solution. `
        + 'Answers that the exam app computes (trees, tables, sorts) were generated from the problem data, so they match the online version exactly.'),
      h('table', { class: 'pp-summary' }, h('tr', {}, h('th', {}, 'Question'), h('th', {}, 'Points'), h('th', {}, 'Answer')),
        questions.map((q) => {
          const info = keyInfo(q);
          return h('tr', {}, h('td', {}, `${q.label} ${q.problem.title || ''}`), h('td', {}, String(+q.points.toFixed(2))), h('td', {}, info.correctAnswer ?? '—'));
        }))));
  } else {
    root.append(cover());
  }
  if (usePartA) {
    root.append(partHeader('Part A', partA, KEY ? null : `There are ${partA.length} multiple-choice questions in this part. Write the letter of the best answer in the box. A wrong answer, no answer or several answers get 0 (there is no negative marking).`));
    partA.forEach((q) => {
      const el = question(q);
      if (!KEY) el.querySelector('.pp-qhead').append(h('span', { class: 'pp-ansbox' }, 'Answer:', h('span', { class: 'pp-ansfield' })));
      root.append(el);
    });
    root.append(h('div', { class: 'pp-break' }));
    root.append(partHeader('Part B', partB, KEY ? null : 'Write your answers in the space provided below each question.'));
  }
  partB.forEach((q) => root.append(question(q)));
  document.title = `${(exam.course && exam.course.code) || ''} ${exam.title || 'Exam'}${KEY ? ' — marking scheme' : ''}`.trim();
}

function pageCountPlaceholder(n) {
  for (const li of document.querySelectorAll('.pp-instr li')) li.innerHTML = li.innerHTML.replace('{PAGES}', String(n));
}

build();
pageCountPlaceholder(O.pages || '__');
// wait for images, then tell the printer we are done
Promise.all([...document.images].map((im) => (im.complete ? 0 : new Promise((r) => { im.onload = im.onerror = r; }))))
  .then(() => (document.fonts ? document.fonts.ready : 0))
  .then(() => { window.PRINT_READY = true; });
})(globalThis.VE = globalThis.VE || {});
