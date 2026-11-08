# VirtualExams

A web-based exam framework. A student enters their ID, answers the questions one page at a
time, and submits; the answers are saved as one JSON file. Each question type is a template
(a view plus a grader); every individual problem is its own JSON file, kept in a **problem
bank** independent of any exam, and exams are put together from bank problems.

Exams run in two modes:

- **practice** (the default) – the solutions are loaded in the browser; after submitting, the
  student sees which answers were right, the correct answers and explanations.
- **exam** – no feedback; the submission is saved and graded afterwards (`tools/grade.mjs`,
  later on the server). In this local-only version the files are on the student's machine, so
  it is not secure yet; real exams come with the server.

Everything runs from the files on disk: no server, no authentication, nothing is uploaded.

## Workflow

1. **Write problems** with the editor: open `editor.html` (Chrome or Edge), choose
   "Open bank folder…" and pick `bank/`.
2. **Describe the exam** in a spec file (`specs/demo-comp352.json` is an example): which bank
   folders, which problems with how many points, title, dates, instructions.
3. **Build it**: `python3 tools/build_exam.py --spec specs/demo-comp352.json --force`.
4. **Publish it**: the output folder (`exams/demo-comp352/`) is self-contained — it has its own
   copy of the exam app. Students open its `index.html`; zip the folder, or put it on any web
   server (GitHub Pages, a course site, …). It does not need the rest of this repository.

## The problem bank

```
bank/
  problems/<type>/<name>.json     what the student sees
  solutions/<type>/<name>.json    the answer key — same type folder and file name
  assets/...                      images and other files used by the problems
```

There is one subfolder per question type (`mcq`, `text`, `tree-traversal`, `tree-array`,
`sort-count`, `sort-trace`, `heap-build`, `hash-table`, `radix-sort`, `bst-update`, `asymptotic`, `recursion`, `graph-search`, `transitive-closure`, `floyd-warshall`). The solution is a separate file so that it never has to reach the
students; it is found by the naming convention. Problems refer to assets by
`"assets/<file>"` (the image field, or `<img src="assets/…">` inside a prompt); the same path
works in the bank and in every exam built from it. Any folder with this layout is a bank, so
you can keep one per course.

## The editor (`editor.html`)

- **New problem** (left): one form per question type; `editor.html?type=sort-trace` starts one
  directly.
- **Open bank folder…** (top right): lists the bank's problems by type; click one to edit it.
  Saving (button or Ctrl/Cmd+S) writes `problems/<type>/<name>.json` and
  `solutions/<type>/<name>.json`. Changing the name saves a copy under the new name.
  "Reopen" comes back to the last folder after a reload.
- **Student view** (right): the problem exactly as in the exam, updated as you type. Answer it
  and press **Check my answer** to run the real grader; the **answer key** line shows the
  correct answer (computed for the tree and sorting types).
- **JSON files** tab: both files as they will be saved, editable for fields the forms do not
  cover.
- **Add image…** copies an image into the bank's `assets/` folder and uses it.
- Trees are typed as text: `A(B(D, E), C(, F))` — children in parentheses, an empty slot for a
  missing child. Node ids are generated from the labels.

Folder access needs Chrome or Edge (it also works from `file://`). In other browsers the editor
can open single files and **downloads** `<name>.json` and `<name>.solution.json` instead of
saving; `build_exam.py` also accepts a `<name>.solution.json` next to its problem.

## Building an exam (`tools/build_exam.py`)

```bash
# from a spec file
python3 tools/build_exam.py --spec specs/demo-comp352.json --force

# a quick practice set from the command line; folders and wildcards work
python3 tools/build_exam.py --problems-dir bank/problems tree-array sort-trace/sort-trace-hoare \
    --out exams/heaps --title "Heaps practice" --course-code "COMP 352" --points 2
```

The output folder (default `exams/<examId>`) gets:

```
index.html, css/, js/      the exam app (copied: exactly the files index.html loads)
exam.json                  the exam settings and question list
problems/<type>/, solutions/<type>/, assets/   copies of the problems used, their solutions and images
exam.bundle.js             all the JSON packed into one script (see below)
```

Options: `--problems-dir`, `--solutions-dir`, `--assets-dir` (instead of the spec's folders),
`--copy-all-assets` (whole asset folders, not only the files the problems mention),
`--mode exam`, `--no-solutions`, `--force` (rebuild an existing exam folder), and `--id`,
`--title`, `--course-code`, `--course-title`, `--term`, `--exam-type`, `--date`,
`--start-time`, `--duration`, `--location`. A missing solution is reported (the question shows
as "graded later"); a missing problem or asset stops the build.

Practice exams contain the solutions (that is how they give feedback), so a student who looks
at the files can find them; for practice that is fine. Real exams will need the server.

`exam.bundle.js` exists because a page opened from disk cannot read JSON files. After editing
the JSON of a built exam by hand, refresh it with `python3 tools/pack_exam.py exams/<folder>`
— but normally you change the bank or the spec and rebuild.

Grading saved submissions offline (needs Node.js; optional):

```bash
node tools/grade.mjs exams/demo-comp352/exam.json ~/Downloads/COMP352-F26-DEMO_*.json
```

## The spec file

```json
{
  "folders": {
    "problems":  "../bank/problems",
    "solutions": "../bank/solutions",
    "assets":    "../bank/assets"
  },
  "out": "../exams/demo-comp352",
  "examId": "COMP352-F26-DEMO",
  "course": { "code": "COMP 352", "title": "Data Structures and Algorithms", "term": "Fall 2026" },
  "title": "Demo Quiz", "examType": "Quiz", "mode": "practice",
  "date": "2026-11-10", "startTime": "10:15", "durationMinutes": 75, "location": "Online",
  "studentIdPattern": "^\\d{8}$",
  "instructions": ["...", "..."],
  "questions": [
    { "problem": "mcq/bst-successor.json", "points": 2 },
    { "problem": "sort-trace/sort-trace-hoare", "points": 4 }
  ]
}
```

- `folders` are relative to the spec file. `solutions` defaults to the `solutions` folder next
  to `problems`, and `assets` to the `assets` folder next to it (a list of folders is allowed).
- Each question's `problem` is relative to the problems folder (".json" optional). Its solution
  is the file with the same relative path in the solutions folder, and `"assets/x.svg"` inside a
  problem means `x.svg` in the assets folder.
- A question can also be a type folder (`"tree-array"`) or a wildcard (`"sort-*/*.json"`) to
  take several problems with the same points. `out` (relative to the spec) is where the exam is
  built.
- `mode` is `practice` (the default) or `exam`; `?mode=…` in the address overrides it. If
  `durationMinutes` is set, a countdown is shown (nothing is enforced yet).

The built `exam.json` has the same settings, with each question pointing to its copy
(`"problem": "problems/mcq/bst-successor.json"`, `"solution": …`).

## Question types

| type | problem file | response saved | solution file |
|---|---|---|---|
| `mcq` | `prompt`, `image`, `options: [{id, text}]`, `multiple` | `{"selected": ["b"]}` | `{"correct": ["b"]}` |
| `text` | `prompt`, `image`, `placeholder`, `multiline`, `maxLength` | `{"text": "O(n log n)"}` | `{"accepted": [...], "patterns": [regex...], "caseSensitive", "ignoreWhitespace"}` — neither given → graded manually |
| `tree-traversal` | `prompt`, `traversal` (`preorder`, `postorder`, `inorder`, `levelorder`), `tree`, `binary` | `{"sequence": ["A","B",...]}` | `{"sequence": [...]}` (optional, computed from the tree if missing), `"scoring": "exact"` or `"positional"` |
| `tree-array` | `task` (`layout`, `heap-insert`, `heap-remove`), `tree`, `heap` (`min`/`max`), `insert: [{id, label}]`, `slots` | `{"slots": ["A", null, ...]}` (`null` = X) | `{"slots": [...]}` (optional, computed from the tree / by simulating the heap if missing), `"scoring"` |
| `sort-count` | `data: [numbers]`, `algorithm`, `order`, `count` (`swaps`/`comparisons`) | `{"value": 7}` | `{"value": 7}` (optional, computed) |
| `sort-trace` | `data`, `algorithm`, `order`, `rows` (rows shown at the start, default 1) | `{"swaps": [[0, 4], [1, 2], null]}` | `{"swaps": [...]}` (optional, computed), `"scoring": "exact"` or `"prefix"` |
| `heap-build` | `data: [numbers]`, `method` (`insert` or `bottom-up`), `heap` (`min`/`max`), `slots` | `{"slots": ["k3", "k0", null]}` (ids of the given keys) | — (computed), `"scoring": "exact"` or `"positional"` |
| `hash-table` | `keys: [whole numbers]`, `size` (m), `probing` (`linear`, `quadratic`, `double`), `q` (double hashing) | `{"slots": ["k2", null, ...], "collisions": 6}` | — (computed), `"scoring": "partial"` or `"exact"`, `"countWeight"` (default 0.25) |
| `radix-sort` | `data: [whole numbers]`, `base` (`decimal`/`binary`), `passes` (default 4) | `{"stages": [["k6", "k0", ...], ...]}` (one row per pass) | — (computed), `"scoring": "passes"`, `"positional"` or `"exact"` |
| `bst-update` | `treeType` (`bst`/`avl`), `keys` (the starting tree, in insertion order), `operations: [{"insert": 35}, {"delete": 30}]`, `replaceWith` (`successor`/`predecessor`), `externalNodes` (default `true`) | `{"positions": {"": 50, "L": 30, "LR": 40}}` (path from the root → key) | — (computed), `"scoring": "positional"` or `"exact"` |
| `asymptotic` | `task`: `relation` (`f`, `g`), `tight` (`f`, `options`), `witness` (`relation`: `O`/`Omega`/`Theta`, `f`, `g`) or `rank` (`functions`); formulas as text, e.g. `"3n^2 + 5n log n + 17"` | `{"selected": ["Omega"]}`, `{"choice": 1}`, `{"c1": "4", "c2": "64", "n0": "1"}`, `{"order": [3, 5, 1, 2, 0, 4]}` | — (computed); relation `"exact"`/`"statements"`, rank `"pairs"`/`"exact"` |
| `recursion` | `calls` (1 or 2), `reduction` (`"n-1"`, `"n-10"`, `"n/2"` …), `work` (`constant`/`linear`), `code` (optional; generated if missing) | `{"time": 5, "space": 2}` (indexes into the options, sorted by growth) | — (computed), `"scoring": "partial"` (half per answer) or `"exact"` |
| `graph-search` | `algorithm` (`bfs`/`dfs`/`dijkstra`), `start`, `edges` (`"A-B 4, A-C 2"` or a list), `directed`, `weighted`, `restart` (DFS), `vertices`, `layout` | `{"order": ["A", "C", …], "d": {"A": "0", …}, "f": {…}}` | — (computed), `"scoring": "partial"` or `"exact"` |
| `transitive-closure` | `edges`, `directed`, `iterations` (default 4), `vertices`, `layout` | `{"added": [["C>B", "D>B"], [], …]}` (one list per iteration) | — (computed), `"scoring": "iterations"` or `"exact"` |
| `floyd-warshall` | `edges` (weighted), `directed`, `iterations` (default 3), `vertices`, `layout` | `{"levels": [{"1,3": "7"}, …]}` (changed cells per matrix) | — (computed), `"scoring": "levels"` or `"exact"` |

All solution files may also have an `explanation` shown in practice mode.

Tree format: `{"id": "A", "label": "A", "children": [ ... ]}` — `label` is optional, ids must be
unique; in a binary tree write `null` for a missing left child. A non-binary tree (`"binary": false`)
works for pre-, post- and level-order.

`tree-array`: the student drags the tree's nodes into indexed array cells; empty cells are X.
`layout` stores the tree with children of index i at 2i+1 and 2i+2. `heap-insert` and
`heap-remove` start from the level order of a complete tree (the heap) and expect the array after
inserting the `insert` keys (shown as extra draggable keys) or removing the root `removeCount`
times. `slots` sets how many cells are shown, so the student also has to decide where the array
ends. Keys are compared as numbers.

Sorting questions (`sort-count`, `sort-trace`): `algorithm` is `selection`, `insertion`,
`quicksort-hoare` or `quicksort-lomuto`; `order` is `increasing` (default) or `decreasing`. The
pseudocode box is generated from the algorithm and order (`"showPseudocode": false` hides it,
`"pseudocode": "..."` replaces it), and so is the prompt if the problem has none. The answer is
computed by running exactly that pseudocode: a swap always exchanges two different positions
(self-swaps are skipped, as the pseudocode says), and a comparison is one comparison between
array elements or with the pivot. Hoare's partition uses the first element as pivot, Lomuto's
the last. `sort-count` asks for one number (a digits-only box). `sort-trace` asks for the swaps
themselves: every row starts as a copy of the row above and the student makes one swap per
row, adding rows as needed; `"scoring": "prefix"` gives credit for the swaps that are right
before the first mistake.

`heap-build`: build a heap from the given keys, either by **inserting them one at a time** in
the given order (`"method": "insert"`) or with the **bottom-up construction** from the given
array (`"method": "bottom-up"`); the student only sees the method you chose. The student drags
the keys into numbered array cells and sees their array drawn as a tree as they go. A key moves
only past a strictly larger (min-heap) / smaller (max-heap) key; in a sift-down it goes to the
better child, the left one if both are equal. No pseudocode is shown. In practice mode the
feedback lists every step.

`hash-table`: insert the keys, in the given order, into a table of size m with h(k) = k mod m,
and give the total number of collisions. A box above the question shows the hash function, an
example of the mod operation for that m (with a number that is not one of the keys), the
collision resolution and what counts as a collision: one for every probe that finds the cell
taken. Linear probing tries h + 1, h + 2, …; quadratic h + 1, h + 4, h + 9, …; double hashing
h + j·h′(k) with h′(k) = q − (k mod q) (`q` defaults to the largest prime below m). Under every key
the student sees its h(k) in small print (and h′(k) for double hashing), so the question is about
the probing, not the arithmetic. The student drags the keys into the table and types the count
(digits only). With `"partial"` scoring the
table earns 75 % of the points, in proportion to the keys in the right cell, and the count 25 %.
The feedback traces the cells every key tried.

`radix-sort`: LSD radix sort, showing the array after each of the first `passes` passes (one
digit per pass, from the right; numbers with fewer digits get leading zeros, drawn faded). In
binary every number shows its decimal value and its bits. Each pass row offers the numbers in the
order of the row above, with that pass's digit highlighted, and the student clicks (or drags) them
into their order after the pass. A pass is checked against the correct pass applied to the
student's own previous row, so one mistake is not counted again in every later pass. The feedback
lists the buckets of every pass.

`bst-update`: the tree after one or more insertions/deletions, in a binary search tree or an AVL
tree (rebalanced with single and double rotations). The starting tree is built by inserting
`keys` in order, so it is always a valid BST/AVL tree. The student sees the starting tree and
builds the new one by dragging, starting from a copy: keys from the pool onto the dashed free
spots, nodes to other spots (by default with their whole subtree, or only the node), onto another
node to swap them, or out of the tree. A deleted key with two children is replaced by its in-order
successor (default) or predecessor; the prompt says which. With `"externalNodes": true` (the default) the trees
are drawn as proper binary trees, as in the textbook: keys only in the internal nodes, and the
external nodes as small empty squares; inserting means dropping a key on an external node. Partial credit is given for the keys in
the right place, and the feedback says when the student's tree is not a search tree or not
balanced, and lists every step and rotation.

`asymptotic`: Big-O, Ω and Θ, built on the engine of the COMP 352 web app `BigO_Quiz.html`
(copied unchanged into `js/types/asymptotic/bigo.js`): a safe formula reader (no `eval`; `log` is
base 2, also `ln`, `log10`, `sqrt`, `^`, `!`, implicit multiplication), evaluation that does not
overflow for 2ⁿ or n!, the limit of f/g, and the definitions checked for every n ≥ n₀. Four tasks:
`relation` (tick f = O(g), Ω(g), Θ(g)), `tight` (pick the simplest Θ bound among `options`; exactly
one must be right), `witness` (prove the claim with c, or c₁ and c₂, and n₀; any constants that
satisfy the definition are accepted, and a wrong proof gets the first n where it fails) and `rank`
(order `functions` by growth with ▲ ▼; functions with the same growth may come in either order).
All answers are computed, so a problem is just the formulas.

`recursion`: the running time and the stack depth (space) of a recursive method, each chosen from a
menu of tight bounds (Θ(1), Θ(log n), Θ(n), Θ(n log n), Θ(n²), Θ(2ⁿ), plus the right answer if it
is not among them; `options` replaces the list). The problem describes the recursion — the number of
recursive calls, how the argument shrinks and the work in one call — and the answers follow from the
recurrence T(n) = a·T(n − k or n/b) + O(1 or n). Show your own `code` (sum, fast power, Hanoi …) and
describe its recursion, or leave `code` out to show a generated method f(n). The feedback gives the
recurrence, the number of calls and why the stack is that deep (the calls of binary recursion run one
after the other, so the stack holds only one chain of calls).

Graphs (`graph-search`, `transitive-closure`, `floyd-warshall`): the graph is given as an edge list
(`"A-B"`, or `"A-B 4"` with a weight; in a directed graph `A-B` is A → B) and drawn from it, on a
circle or at the positions in `layout` (`{"A": [0, 0.5], …}`, in the unit square). Ties are broken
in the vertex order (alphabetical unless `vertices` is given), and the prompt says so.
`graph-search` runs BFS, DFS or Dijkstra from `start`: the student drags the vertices into the order
(added to the queue / discovered / removed from the priority queue) and types d (and f for DFS,
with a clock that starts at 1; with `restart` the search continues from the first unvisited
vertex, as in CLRS). `transitive-closure` shows one panel per iteration k (through the k-th vertex),
in which the student draws the new edges by dragging from vertex to vertex. `floyd-warshall` shows
D(0) and lets the student update the matrix for the first iterations; each matrix starts as a copy
of the previous one. Both are graded with follow-through: each iteration is checked against the
correct step applied to the student's own previous result. The feedback lists every step
(the queue, the discoveries and finishes, the relaxations, the new edges, the changed cells).

Prompts and explanations are HTML, so code can go in `<pre><code>…</code></pre>` (escape `<` as
`&lt;`).

Adding a type: create `js/types/<type>/view.js` and `grader.js` (each registers itself on the
global `VE` object, see the existing types) and an editor form in `js/editor/types/`; add the
`<script>` tags to both `index.html` and `editor.html`, the grader to `GRADER_SCRIPTS` in
`tools/grade.mjs`, and the type name to `KNOWN_TYPES` in `tools/pack_exam.py`.

## Code layout

```
index.html, js/app.js, js/exam-loader.js   the exam app (copied into every built exam;
                                           at the top it opens exams/demo-comp352)
editor.html, js/editor/                    the problem editor (bank.js: folder access;
                                           form.js: form controls; types/: one form per type)
js/types/<type>/view.js, grader.js         question types, shared by the exam and the editor
js/grading/grade-exam.js                   grades a whole submission (browser and Node)
css/exam.css, css/editor.css
tools/build_exam.py, pack_exam.py, grade.mjs
bank/, specs/, exams/
```

## Submission format

One file per student per exam, downloaded on submit as
`<examId>_<studentId>_<timestamp>.json`:

```json
{
  "format": "virtualexams.submission/v1",
  "examId": "COMP352-F26-DEMO", "course": "COMP 352", "mode": "practice",
  "student": { "id": "40123456" },
  "startedAt": "...", "submittedAt": "...",
  "answers": [
    { "questionId": "q1", "type": "mcq", "problem": "problems/mcq/bst-successor.json", "response": { "selected": ["b"] } }
  ]
}
```

Answers are also autosaved in the browser's localStorage while the exam is in progress, so a
reload does not lose them.

## Paper version: exam and marking scheme PDFs

```
python3 tools/print_exam.py exams/demo-comp352/exam.json
```

writes two PDFs to `exams/demo-comp352-print/` (a folder next to the exam, never inside it, so the
marking scheme is not published with a practice exam):

- `<examId>-exam.pdf`: the department's paper template. The cover has the logo, the course, the
  time, an empty date and instructors line, the instructions (with the number of pages), name / ID /
  section lines and a marks table. Part A holds the one-letter questions (multiple choice), with an
  answer box; Part B the others, with empty answer areas: arrays, tables, rows for the swaps, lines,
  boxes to tick and space to draw trees. Every page after the first has "Student ID (last 4 digits)"
  at the top and "Page X of N" at the bottom.
- `<examId>-marking-scheme.pdf`: a summary table of all answers, then every question with the answer
  filled in, how it is marked (points, partial credit) and a worked solution. The answers come from
  the same code as the online exam, so they always match it.

It renders the exam's own app code in headless Chrome, so it needs Playwright for Python once:
`pip3 install playwright && python3 -m playwright install chromium`. Options: `--out DIR`,
`--only exam|key`, `--instructions FILE` (one per line, HTML allowed, `{PAGES}` becomes the page
count), `--department`, `--no-logo`, `--no-parts`. The HTML pages the PDFs are printed from stay in
the output folder, so a page can also be printed from Chrome by hand.

## Next steps

- Server: authentication (ID + password) and submission upload; in exam mode it must not
  serve `solutions/`.
- Server-side grading using the same graders (`js/grading/grade-exam.js` already runs in Node).
- Option shuffling / per-student question variants; enforced time limit.
