# VirtualExams

A web-based exam framework. A student enters their ID, answers the questions one page at a
time, and submits; the answers are saved as one JSON file. Each question type is a template
(a view plus a grader) and every individual question is its own JSON file.

The same exam can run in two modes:

- **practice** – the solutions are loaded in the browser; after submitting, the student sees
  which answers were right, the correct answers and explanations.
- **exam** – no feedback; the submission is saved and graded afterwards (`tools/grade.mjs`,
  later on the server). In this local-only version the files are on the student's machine,
  so it is not secure; that comes with the server.

Status: local-only version. Everything runs in the browser from the files on disk; there is
no server, no authentication and nothing is uploaded. The submission is downloaded as a file.

## Run the demo

Double-click `index.html` (or open it from the browser's File menu). That's it.

- Exam mode instead of practice: add `?mode=exam` to the address,
  e.g. `file:///…/VirtualExams/index.html?mode=exam`.
- Another exam: `index.html?exam=exams/<folder>`.

**After editing any exam JSON file, re-pack it:**

```bash
python3 tools/pack_exam.py            # packs every exam in exams/
```

Browsers do not let a page opened from disk read JSON files, so `pack_exam.py` wraps
`exam.json` and all the problem/solution files it lists into `exams/<folder>/exam.bundle.js`,
which the page loads as a script. The JSON files stay the source of truth; the bundle is
generated (but committed, so the demo opens without running anything). Images are not packed.
`--no-solutions` leaves the solutions out of the bundle.

Grading saved submissions offline (needs Node.js; optional):

```bash
node tools/grade.mjs exams/demo-comp352/exam.json ~/Downloads/COMP352-F26-DEMO_*.json
```

## Exam file (`exam.json`)

```json
{
  "examId": "COMP352-F26-DEMO",
  "course": { "code": "COMP 352", "title": "Data Structures and Algorithms", "term": "Fall 2026" },
  "title": "Demo Quiz",
  "examType": "Quiz",
  "mode": "practice",
  "date": "2026-11-10", "startTime": "10:15", "durationMinutes": 30, "location": "Online",
  "studentIdPattern": "^\\d{8}$",
  "instructions": ["...", "..."],
  "questions": [
    { "id": "q1", "type": "mcq", "points": 2,
      "problem": "problems/q1-bst-successor.json", "solution": "solutions/q1-bst-successor.json" }
  ]
}
```

Paths in `exam.json` are relative to the exam folder. Image paths inside a problem file are
relative to that problem file, so a problem can be reused by several exams. Prompts and
explanations may contain HTML (they come from the instructor, not from students).
`?mode=practice|exam` in the address overrides `mode`. If `durationMinutes` is set, a countdown is
shown (nothing is enforced yet).

## Question types

| type | problem file | response saved | solution file |
|---|---|---|---|
| `mcq` | `prompt`, `image`, `options: [{id, text}]`, `multiple` | `{"selected": ["b"]}` | `{"correct": ["b"]}` |
| `text` | `prompt`, `image`, `placeholder`, `multiline`, `maxLength` | `{"text": "O(n log n)"}` | `{"accepted": [...], "patterns": [regex...], "caseSensitive", "ignoreWhitespace"}` — neither given → graded manually |
| `tree-traversal` | `prompt`, `traversal` (`preorder`, `postorder`, `inorder`, `levelorder`), `tree`, `binary` | `{"sequence": ["A","B",...]}` | `{"sequence": [...]}` (optional, computed from the tree if missing), `"scoring": "exact"` or `"positional"` |

All solution files may also have an `explanation` shown in practice mode.

Tree format: `{"id": "A", "label": "A", "children": [ ... ]}` — `label` is optional, ids must be
unique; in a binary tree write `null` for a missing left child.

Adding a type: create `js/types/<type>/view.js` and `grader.js` (each registers itself on the
global `VE` object, see the existing types), add both `<script>` tags to `index.html`, the
grader to `GRADER_SCRIPTS` in `tools/grade.mjs`, and the type name to `KNOWN_TYPES` in
`tools/pack_exam.py`.

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
    { "questionId": "q1", "type": "mcq", "problem": "problems/q1-bst-successor.json", "response": { "selected": ["b"] } }
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
