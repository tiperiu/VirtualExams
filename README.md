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
`sort-count`, `sort-trace`, `heap-build`, `hash-table`, `radix-sort`). The solution is a separate file so that it never has to reach the
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

## Next steps

- Server: authentication (ID + password) and submission upload; in exam mode it must not
  serve `solutions/`.
- Server-side grading using the same graders (`js/grading/grade-exam.js` already runs in Node).
- Option shuffling / per-student question variants; enforced time limit.
