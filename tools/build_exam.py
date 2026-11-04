#!/usr/bin/env python3
"""Build a self-contained exam (by default a practice exam) from problems in a problem bank.

The output folder holds everything the students need: the exam app (index.html, css/, js/),
the exam settings (exam.json), copies of the chosen problems and solutions, the images they use,
and exam.bundle.js. It does not depend on anything else in this repository: zip it, put it on
any web server, or open its index.html straight from disk.

A problem bank has, one subfolder per problem type:

    problems/<type>/<name>.json     what the student sees (written by the editor, editor.html)
    solutions/<type>/<name>.json    the answer key: same relative path, in the solutions folder
    assets/...                      images and other files, referenced as "assets/..." in problems

Examples:

    # from a spec file (folders, exam settings and the list of questions with points)
    python3 tools/build_exam.py --spec specs/demo-comp352.json --force

    # a quick practice set from the command line (folders and wildcards work too)
    python3 tools/build_exam.py --problems-dir bank/problems tree-array sort-trace/sort-trace-hoare.json \\
        --out exams/heaps --title "Heaps practice" --course-code "COMP 352" --points 2

Spec file — the folders are relative to the spec file; question paths are relative to the
problems folder, solutions are looked up at the same relative path in the solutions folder, and
"assets/x" in a problem means the file x in the assets folder:

    {
      "folders": {
        "problems":  "../bank/problems",
        "solutions": "../bank/solutions",        (default: "solutions" next to problems)
        "assets":    "../bank/assets"            (default: "assets" next to problems; a list is allowed)
      },
      "out": "../exams/comp352-quiz2",           (optional; --out wins; default exams/<examId>)
      "examId": "COMP352-F26-Q2", "course": {"code": "COMP 352", "title": "...", "term": "Fall 2026"},
      "title": "Quiz 2", "examType": "Quiz", "mode": "practice", "date": "2026-11-17",
      "startTime": "10:15", "durationMinutes": 30, "instructions": ["..."],
      "questions": ["mcq/bst-successor.json", {"problem": "sort-trace/sort-trace-hoare", "points": 3}]
    }

A question can also name a type folder ("tree-array") or a wildcard ("sort-*/*.json") to take
several problems at once; ".json" may be left out.
"""
import argparse
import glob
import json
import re
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from pack_exam import KNOWN_TYPES, ROOT, asset_refs, pack  # noqa: E402

APP_PAGE = ROOT / "index.html"   # the exam app; the files it loads are copied with it
META_KEYS = ["examId", "course", "title", "examType", "mode", "date", "startTime", "durationMinutes",
             "location", "studentIdPattern", "studentIdHint", "studentIdError", "instructions"]


def fail(msg):
    sys.exit(f"error: {msg}")


def load_json(path: Path, what: str):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        fail(f"{what} not found: {path}")
    except json.JSONDecodeError as e:
        fail(f"invalid JSON in {path}: line {e.lineno}, column {e.colno}: {e.msg}")


def expand(arg: str, base: Path) -> list:
    """A problem reference: a file (".json" optional), a folder (every *.json in it and its
    subfolders) or a wildcard pattern, relative to base."""
    p = Path(arg) if Path(arg).is_absolute() else base / arg
    if p.is_dir():
        found = sorted(p.rglob("*.json"))
        if not found:
            fail(f"no problems in {p}")
        return found
    if any(ch in arg for ch in "*?["):
        found = sorted(Path(x) for x in glob.glob(str(p)))
        if not found:
            fail(f"no files match {p}")
        return found
    if p.suffix != ".json" and not p.exists():
        p = p.with_name(p.name + ".json")
    return [p]


class Folders:
    """Where problems, solutions and assets are. Without a problems folder (command-line files
    from anywhere), each problem's bank is the folder above its problems/ folder."""

    def __init__(self, problems=None, solutions=None, assets=None):
        self.problems = problems
        self.solutions = solutions or (problems.parent / "solutions" if problems else None)
        self.assets = assets or ([problems.parent / "assets"] if problems else [])

    def relative(self, path: Path) -> Path:
        """The problem's path inside its problems folder, e.g. mcq/bst-successor.json."""
        if self.problems and path.is_relative_to(self.problems):
            return path.relative_to(self.problems)
        for parent in path.parents:
            if parent.name == "problems":
                return path.relative_to(parent)
        return Path(path.name)

    def solution_for(self, path: Path):
        rel = self.relative(path)
        cands = []
        if self.solutions:
            cands.append(self.solutions / rel)
        for parent in path.parents:
            if parent.name == "problems":
                cands.append(parent.parent / "solutions" / rel)
                break
        cands.append(path.with_name(path.stem + ".solution.json"))
        return next((c for c in cands if c.is_file()), None)

    def asset_dirs(self, path: Path) -> list:
        dirs = list(self.assets)
        for parent in path.parents:
            if parent.name == "problems":
                dirs.append(parent.parent / "assets")
                break
        return list(dict.fromkeys(dirs))


def find_asset(ref: str, dirs: list):
    rel = ref[len("assets/"):]
    return next((d / rel for d in dirs if (d / rel).is_file()), None)


def copy_app(out: Path) -> int:
    """Copies the exam app: index.html and every local file it loads (styles and scripts).
    The copy opens the exam in its own folder (data-exam=".")."""
    html = APP_PAGE.read_text(encoding="utf-8")
    refs = re.findall(r'(?:src|href)="(?![a-z][a-z0-9+.-]*:|/|#)([^"?#]+)"', html)
    count = 0
    for ref in dict.fromkeys(refs):
        src = ROOT / ref
        if not src.is_file():
            fail(f"index.html refers to {ref}, which does not exist")
        (out / ref).parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, out / ref)
        count += 1
    html, n = re.subn(r"<body[^>]*>", '<body data-exam=".">', html, count=1)
    if not n:
        fail("index.html has no <body> tag")
    (out / "index.html").write_text(html, encoding="utf-8")
    return count


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("problems", nargs="*", help="problem files, folders or wildcards (relative to --problems-dir "
                    "if given), added after the spec's questions")
    ap.add_argument("--spec", help="exam spec JSON file (folders, settings and questions)")
    ap.add_argument("-o", "--out", help="output folder (default: the spec's \"out\", else exams/<examId>)")
    ap.add_argument("--problems-dir", help="problems folder (overrides the spec's folders.problems)")
    ap.add_argument("--solutions-dir", help="solutions folder (default: \"solutions\" next to the problems folder)")
    ap.add_argument("--assets-dir", action="append", default=[], help="assets folder (repeatable; default: "
                    "\"assets\" next to the problems folder)")
    ap.add_argument("--copy-all-assets", action="store_true", help="copy whole asset folders, not only the referenced files")
    ap.add_argument("--points", type=float, default=None, help="points for questions that do not set them (default 1)")
    ap.add_argument("--mode", choices=["practice", "exam"], help="default: the spec's mode, else practice")
    ap.add_argument("--no-solutions", action="store_true", help="do not copy solutions or put them in the bundle")
    ap.add_argument("--force", action="store_true", help="replace the output folder if it already holds an exam")
    for key, flag in [("examId", "--id"), ("title", "--title"), ("examType", "--exam-type"), ("date", "--date"),
                      ("startTime", "--start-time"), ("location", "--location")]:
        ap.add_argument(flag, dest=key)
    ap.add_argument("--duration", dest="durationMinutes", type=int)
    ap.add_argument("--course-code")
    ap.add_argument("--course-title")
    ap.add_argument("--term")
    args = ap.parse_args()

    spec, spec_dir = {}, Path.cwd()
    if args.spec:
        spec_path = Path(args.spec).resolve()
        spec, spec_dir = load_json(spec_path, "spec file"), spec_path.parent

    # ---- folders ------------------------------------------------------------------------
    sf = spec.get("folders") or {}
    if not isinstance(sf, dict):
        fail('"folders" must be an object with "problems", "solutions" and "assets"')
    def spec_path_of(v):
        return (spec_dir / v).resolve() if v else None
    problems_dir = Path(args.problems_dir).resolve() if args.problems_dir else spec_path_of(sf.get("problems"))
    solutions_dir = Path(args.solutions_dir).resolve() if args.solutions_dir else spec_path_of(sf.get("solutions"))
    spec_assets = sf.get("assets")
    assets_dirs = [Path(a).resolve() for a in args.assets_dir] or [
        spec_path_of(a) for a in ([spec_assets] if isinstance(spec_assets, str) else spec_assets or [])]
    folders = Folders(problems_dir, solutions_dir, assets_dirs)
    for label, d in [("problems", folders.problems), ("solutions", folders.solutions)] + [("assets", a) for a in folders.assets]:
        if d and not d.is_dir():
            fail(f"the {label} folder {d} does not exist")

    # ---- exam settings ------------------------------------------------------------------
    exam = {k: spec[k] for k in META_KEYS if k in spec}
    for k in ["examId", "title", "examType", "date", "startTime", "location", "durationMinutes"]:
        if getattr(args, k) is not None:
            exam[k] = getattr(args, k)
    course = dict(exam.get("course") or {})
    for k, v in [("code", args.course_code), ("title", args.course_title), ("term", args.term)]:
        if v is not None:
            course[k] = v
    if course:
        exam["course"] = course
    exam["mode"] = args.mode or exam.get("mode") or "practice"

    out = Path(args.out).resolve() if args.out else spec_path_of(spec.get("out"))
    exam.setdefault("examId", out.name if out else None)
    if not exam["examId"]:
        fail("give the exam an id (--id) or an output folder (--out)")
    exam.setdefault("title", "Practice" if exam["mode"] == "practice" else "Exam")
    out = out or (ROOT / "exams" / exam["examId"])
    if out == ROOT or ROOT.is_relative_to(out):
        fail(f"refusing to build into {out}")

    # ---- questions ----------------------------------------------------------------------
    base = folders.problems or spec_dir
    entries = []
    for q in spec.get("questions", []):
        q = {"problem": q} if isinstance(q, str) else dict(q)
        if "problem" not in q:
            fail(f"a question in the spec has no \"problem\": {q}")
        for path in expand(q["problem"], base):
            entries.append({**q, "path": path.resolve()})
    for arg in args.problems:
        for path in expand(arg, folders.problems or Path.cwd()):
            entries.append({"path": path.resolve()})
    if not entries:
        fail("no problems given (list them in the spec's \"questions\", or on the command line)")

    questions, seen, copies, warnings = [], {}, {}, []
    for i, e in enumerate(entries, 1):
        path = e["path"]
        problem = load_json(path, "problem file")
        qtype = problem.get("type")
        if qtype not in KNOWN_TYPES:
            fail(f"{path}: unknown or missing \"type\" ({qtype!r})")
        name, key = path.stem, f"{qtype}/{path.stem}"
        if key in seen and seen[key] != path:
            fail(f"two {qtype} problems are called {name}: {seen[key]} and {path} (rename one)")
        seen[key] = path
        rel = folders.relative(path)
        if len(rel.parts) > 1 and rel.parts[0] != qtype:
            warnings.append(f"{name}: is in the {rel.parts[0]}/ folder but its type is {qtype}")
        sol_path = folders.solution_for(path)
        solution = load_json(sol_path, "solution file") if sol_path else None
        if solution is None:
            warnings.append(f"{key}: no solution file — this question will be marked \"graded later\"")

        dirs = folders.asset_dirs(path)
        refs = asset_refs(problem) | (asset_refs(solution) if solution else set())
        for ref in sorted(refs):
            src = find_asset(ref, dirs)
            if not src:
                fail(f"{key}: {ref} not found in " + (", ".join(str(d) for d in dirs) or "any assets folder (set folders.assets)"))
            copies[ref] = src

        q = {"id": e.get("id") or f"q{i}", "type": qtype,
             "points": e.get("points", args.points if args.points is not None else 1),
             "problem": f"problems/{key}.json", "_problem": problem}
        if solution is not None and not args.no_solutions:
            q["solution"], q["_solution"] = f"solutions/{key}.json", solution
        questions.append(q)

    # ---- write --------------------------------------------------------------------------
    if out.exists():
        if not args.force:
            fail(f"{out} already exists (use --force to replace it)")
        if any(out.iterdir()) and not (out / "exam.json").exists():
            fail(f"{out} is not empty and does not look like an exam folder; not replacing it")
        shutil.rmtree(out)
    (out / "problems").mkdir(parents=True)

    def dump(path: Path, obj):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(obj, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    for q in questions:
        dump(out / q["problem"], q.pop("_problem"))
        if "_solution" in q:
            dump(out / q["solution"], q.pop("_solution"))
    for ref, src in copies.items():
        (out / ref).parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, out / ref)
    if args.copy_all_assets:
        for d in dict.fromkeys(d for e in entries for d in folders.asset_dirs(e["path"])):
            if d.is_dir():
                shutil.copytree(d, out / "assets", dirs_exist_ok=True)
    exam["questions"] = questions
    dump(out / "exam.json", exam)
    pack(out, with_solutions=not args.no_solutions)
    app_files = copy_app(out)

    total = sum(q["points"] for q in questions)
    shown = out.relative_to(ROOT) if out.is_relative_to(ROOT) else out
    print(f"built {shown}: {len(questions)} questions, {total:g} points, {len(copies)} asset files, "
          f"{app_files} app files, mode {exam['mode']}")
    for w in warnings:
        print(f"  warning: {w}")
    print(f"open {shown / 'index.html'} — the folder is self-contained and can be published as is")


if __name__ == "__main__":
    main()
