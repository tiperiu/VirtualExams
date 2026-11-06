#!/usr/bin/env python3
"""Pack an exam folder's JSON files into <folder>/exam.bundle.js.

The exam page is opened straight from disk (file://), where browsers do not allow a page
to read JSON files. A <script> file *can* be loaded, so this tool wraps exam.json and every
problem/solution file it references into one exam.bundle.js. Re-run it after editing any
JSON file. Images are not packed: they are loaded normally from the assets/ folder.

    python3 tools/pack_exam.py                      # pack every exam under exams/
    python3 tools/pack_exam.py exams/demo-comp352   # pack one exam
    python3 tools/pack_exam.py exams/x --no-solutions   # leave the solutions out
"""
import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
KNOWN_TYPES = {"mcq", "text", "tree-traversal", "tree-array", "sort-count", "sort-trace", "heap-build", "hash-table", "radix-sort"}
SORT_ALGORITHMS = {"selection", "insertion", "quicksort-hoare", "quicksort-lomuto"}


ASSET_RE = re.compile(r"(?<![\w/.-])assets/[\w.@~%+-]+(?:/[\w.@~%+-]+)*")


def asset_refs(obj) -> set:
    """Every "assets/..." path mentioned anywhere in a problem or solution (image fields,
    <img src="assets/..."> inside prompts, ...). Paths are relative to the exam or bank folder."""
    found = set()
    def walk(x):
        if isinstance(x, str):
            found.update(m.group(0).rstrip(".") for m in ASSET_RE.finditer(x))
        elif isinstance(x, dict):
            for v in x.values(): walk(v)
        elif isinstance(x, list):
            for v in x: walk(v)
    walk(obj)
    return found


def check_heap_build(problem: dict) -> list:
    """Problems that would make a heap-build question fail to load."""
    errs = []
    data = problem.get("data")
    if not isinstance(data, list) or len(data) < 2 or not all(isinstance(x, (int, float)) and not isinstance(x, bool) for x in data):
        errs.append('"data" must be a list of at least 2 numbers')
    if problem.get("method", "insert") not in ("insert", "bottom-up"):
        errs.append('"method" must be "insert" or "bottom-up"')
    if problem.get("heap", "min") not in ("min", "max"):
        errs.append('"heap" must be "min" or "max"')
    return errs


def whole_numbers(x, minimum=1) -> bool:
    return isinstance(x, list) and len(x) >= minimum and all(isinstance(v, int) and not isinstance(v, bool) and v >= 0 for v in x)


def check_hash_table(problem: dict) -> list:
    """Problems that would make a hash-table question fail to load (the simulation itself also
    checks that every key can be placed)."""
    errs = []
    keys, size = problem.get("keys"), problem.get("size")
    if not whole_numbers(keys):
        errs.append('"keys" must be a list of non-negative whole numbers')
    elif len(set(keys)) != len(keys):
        errs.append("the keys must all be different")
    if not isinstance(size, int) or isinstance(size, bool) or size < 2:
        errs.append('"size" must be a whole number >= 2')
    elif whole_numbers(keys) and len(keys) > size:
        errs.append(f"{len(keys)} keys do not fit in a table of size {size}")
    if problem.get("probing", "linear") not in ("linear", "quadratic", "double"):
        errs.append('"probing" must be "linear", "quadratic" or "double"')
    return errs


def check_radix_sort(problem: dict) -> list:
    errs = []
    if not whole_numbers(problem.get("data"), 2):
        errs.append('"data" must be a list of at least 2 non-negative whole numbers')
    if problem.get("base", "decimal") not in ("decimal", "binary"):
        errs.append('"base" must be "decimal" or "binary"')
    passes = problem.get("passes", 4)
    if not isinstance(passes, int) or not 1 <= passes <= 20:
        errs.append('"passes" must be a whole number from 1 to 20')
    return errs


def check_sorting(problem: dict) -> list:
    """Problems that would make a sorting question fail to load."""
    errs = []
    data = problem.get("data")
    if not isinstance(data, list) or len(data) < 2 or not all(isinstance(x, (int, float)) and not isinstance(x, bool) for x in data):
        errs.append('"data" must be a list of at least 2 numbers')
    if problem.get("algorithm") not in SORT_ALGORITHMS:
        errs.append(f'"algorithm" must be one of {sorted(SORT_ALGORITHMS)}')
    if problem.get("order", "increasing") not in ("increasing", "decreasing"):
        errs.append('"order" must be "increasing" or "decreasing"')
    if problem.get("count", "swaps") not in ("swaps", "comparisons"):
        errs.append('"count" must be "swaps" or "comparisons"')
    if not errs:
        dec = problem.get("order") == "decreasing"
        if data == sorted(data, reverse=dec):
            errs.append("warning: the data is already sorted")
    return errs


def load(path: Path, what: str):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        sys.exit(f"error: {what} not found: {path}")
    except json.JSONDecodeError as e:
        sys.exit(f"error: invalid JSON in {path}: line {e.lineno}, column {e.colno}: {e.msg}")


def pack(folder: Path, with_solutions: bool) -> None:
    exam = load(folder / "exam.json", "exam.json")
    questions = exam.get("questions") or []
    if not questions:
        sys.exit(f"error: {folder / 'exam.json'} has no questions")

    files, warnings = {}, []
    for i, q in enumerate(questions, 1):
        qid = q.get("id", f"q{i}")
        if "problem" not in q:
            sys.exit(f"error: question {qid} has no \"problem\" file")
        problem = load(folder / q["problem"], f"problem file of {qid}")
        files[q["problem"]] = problem
        qtype = q.get("type") or problem.get("type")
        if qtype not in KNOWN_TYPES:
            warnings.append(f"{qid}: unknown type {qtype!r}")
        if q.get("type") and problem.get("type") and q["type"] != problem["type"]:
            warnings.append(f"{qid}: exam.json says {q['type']!r}, {q['problem']} says {problem['type']!r}")
        checks = {"sort-count": check_sorting, "sort-trace": check_sorting, "heap-build": check_heap_build,
                  "hash-table": check_hash_table, "radix-sort": check_radix_sort}
        if qtype in checks:
            for e in checks[qtype](problem):
                if e.startswith("warning: "):
                    warnings.append(f"{qid}: {e[9:]}")
                else:
                    sys.exit(f"error: {q['problem']}: {e}")
        for ref in asset_refs(problem):
            if not (folder / ref).exists():
                warnings.append(f"{qid}: asset not found: {ref}")
        if with_solutions and q.get("solution"):
            files[q["solution"]] = load(folder / q["solution"], f"solution file of {qid}")

    bundle = {
        "packedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "withSolutions": with_solutions,
        "exam": exam,
        "files": files,
    }
    out = folder / "exam.bundle.js"
    out.write_text(
        "// Generated by tools/pack_exam.py from the JSON files in this folder. Do not edit:\n"
        "// change the JSON files and run  python3 tools/pack_exam.py  again.\n"
        "VE.registerExamBundle(" + json.dumps(bundle, indent=1, ensure_ascii=False) + ");\n",
        encoding="utf-8",
    )
    sols = "with solutions" if with_solutions else "WITHOUT solutions"
    print(f"{out.relative_to(ROOT) if out.is_relative_to(ROOT) else out}: {len(questions)} questions, {sols}")
    for w in warnings:
        print(f"  warning: {w}")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("folders", nargs="*", help="exam folders (default: every folder in exams/ with an exam.json)")
    ap.add_argument("--no-solutions", action="store_true", help="do not include solution files")
    args = ap.parse_args()
    folders = [Path(f).resolve() for f in args.folders] or sorted(p.parent for p in (ROOT / "exams").glob("*/exam.json"))
    if not folders:
        sys.exit("error: no exam folders found")
    for f in folders:
        pack(f, not args.no_solutions)


if __name__ == "__main__":
    main()
