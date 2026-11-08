#!/usr/bin/env python3
"""Make the paper version of a built exam: two PDFs, the exam and the marking scheme.

    python3 tools/print_exam.py exams/demo-comp352/exam.json
    python3 tools/print_exam.py exams/demo-comp352 --out ~/Desktop/final-print

The exam PDF follows the department's paper template: a cover page (logo, course, time, blank
date and instructors, instructions, name / ID / section, a marks table), Part A with the
one-letter questions (multiple choice), Part B with the others, "Student ID" at the top of every
page after the first and "Page X of N" at the bottom. Answer areas are left empty: blank arrays,
tables, lines, boxes to tick and space to draw trees.

The marking scheme has the same questions with the answers filled in, how each question is marked
(points, partial credit) and a worked solution. The answers are computed by the same code as the
online exam (simulations of the sorts, heaps, hash tables, trees, ...), so they always match.

The PDFs are written to a separate folder (default: <exam folder>-print next to the exam), so that
the marking scheme is never published with a practice exam. The HTML pages they are printed from
stay there too: open them in Chrome to look at them, or print them from there.

Needs Playwright for Python and its Chromium (once):
    pip3 install playwright && python3 -m playwright install chromium
"""
import argparse
import html
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SKIP_SCRIPTS = {"js/exam-loader.js", "js/app.js"}


def fail(msg):
    sys.exit(f"error: {msg}")


def exam_folder(arg: str) -> Path:
    p = Path(arg).expanduser().resolve()
    folder = p.parent if p.is_file() else p
    if not (folder / "exam.json").exists():
        fail(f"no exam.json in {folder} (give a built exam folder or its exam.json)")
    return folder


def app_scripts(folder: Path) -> list:
    """The scripts the exam page loads, without the online app itself."""
    page = (folder / "index.html").read_text(encoding="utf-8")
    srcs = re.findall(r'<script\s+src="([^"]+)"', page)
    return [s for s in srcs if s not in SKIP_SCRIPTS and not s.endswith("exam.bundle.js")]


def page_html(mode: str, scripts: list, options: dict, footer: str) -> str:
    key_head = ' @page { @top-right { content: "Marking scheme \\2014  not for distribution"; } }' if mode == "key" else ""
    tags = "\n".join(f'  <script src="{html.escape(s)}"></script>' for s in scripts)
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>{'Marking scheme' if mode == 'key' else 'Exam'}</title>
  <link rel="stylesheet" href="css/exam.css">
  <link rel="stylesheet" href="css/print.css">
  <style>@page {{ @bottom-right {{ content: "{css_string(footer)}" "\\A Page " counter(page) " of " counter(pages); }} }}{key_head}</style>
</head>
<body class="paper{' key-mode' if mode == 'key' else ''}">
  <main id="paper"></main>
  <script>window.VE = window.VE || {{}}; VE.registerExamBundle = function (b) {{ VE.bundle = b; }};</script>
{tags}
  <script src="exam.bundle.js"></script>
  <script>window.PRINT_OPTIONS = {json.dumps(options, ensure_ascii=False)};</script>
  <script src="js/print/print.js"></script>
</body>
</html>
"""


def css_string(s: str) -> str:
    """Text for a CSS string: quotes and backslashes escaped, non-ASCII as CSS escapes (\\2013 )."""
    return "".join(f"\\{ord(c):x} " if ord(c) > 126 else ("\\" + c if c in '"\\' else c) for c in s)


def count_pages(pdf: bytes) -> int:
    return len(re.findall(rb"/Type\s*/Page(?!s)", pdf))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("exam", help="a built exam folder, or its exam.json")
    ap.add_argument("--out", help="output folder (default: <exam folder>-print)")
    ap.add_argument("--only", choices=["exam", "key"], help="make only the exam or only the marking scheme")
    ap.add_argument("--department", default="Department of Computer Science and Software Engineering")
    ap.add_argument("--instructions", help="text file with the cover instructions, one per line (HTML allowed; "
                    "{PAGES} becomes the number of pages)")
    ap.add_argument("--no-logo", action="store_true", help="leave the Concordia logo out")
    ap.add_argument("--no-parts", action="store_true", help="one list of questions instead of Part A / Part B")
    ap.add_argument("--chrome", help="path to a Chrome/Chromium to use instead of Playwright's own")
    args = ap.parse_args()

    folder = exam_folder(args.exam)
    exam = json.loads((folder / "exam.json").read_text(encoding="utf-8"))
    out = Path(args.out).expanduser().resolve() if args.out else folder.parent / f"{folder.name}-print"
    if out == folder or folder in out.parents:
        fail("the output folder must not be inside the exam folder (the marking scheme would be published with it)")

    # the bundle is what the page reads: refresh it so it matches the JSON files
    subprocess.run([sys.executable, str(ROOT / "tools" / "pack_exam.py"), str(folder)], check=True, stdout=subprocess.DEVNULL)
    bundle = (folder / "exam.bundle.js").read_text(encoding="utf-8")
    if '"withSolutions": false' in bundle:
        print("warning: the exam was built without solutions: the marking scheme will have the computed answers, "
              "but no written explanations or MCQ keys")

    # a self-contained print folder: the exam's app files + the print page
    out.mkdir(parents=True, exist_ok=True)
    for sub in ("js", "css", "assets"):
        if (folder / sub).exists():
            shutil.copytree(folder / sub, out / sub, dirs_exist_ok=True)
    shutil.copy2(folder / "exam.bundle.js", out / "exam.bundle.js")
    (out / "js" / "print").mkdir(parents=True, exist_ok=True)
    shutil.copy2(ROOT / "js" / "print" / "print.js", out / "js" / "print" / "print.js")
    shutil.copy2(ROOT / "css" / "print.css", out / "css" / "print.css")
    logo = None
    if not args.no_logo and (ROOT / "tools" / "print" / "concordia-logo.png").exists():
        shutil.copy2(ROOT / "tools" / "print" / "concordia-logo.png", out / "concordia-logo.png")
        logo = "concordia-logo.png"

    instructions = None
    if args.instructions:
        instructions = [l.strip() for l in Path(args.instructions).expanduser().read_text(encoding="utf-8").splitlines() if l.strip()]
    course = exam.get("course") or {}
    footer = " – ".join(x for x in (course.get("code"), course.get("term"), exam.get("title") or exam.get("examType")) if x)
    scripts = app_scripts(folder)
    base = {"department": args.department, "logo": logo, "instructions": instructions, "partA": not args.no_parts}
    stem = exam.get("examId") or folder.name
    targets = [m for m in ("exam", "key") if not args.only or args.only == m]

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        for mode in targets:
            (out / f"paper-{mode}.html").write_text(page_html(mode, scripts, {**base, "mode": mode}, footer), encoding="utf-8")
        fail(f"Playwright is not installed, so no PDF was made. Install it once with\n"
             f"    pip3 install playwright && python3 -m playwright install chromium\n"
             f"or open the pages in {out} in Chrome and print them to PDF.")

    with sync_playwright() as p:
        browser = p.chromium.launch(**({"executable_path": args.chrome} if args.chrome else {}))
        page = browser.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))

        def render(mode, pages=None):
            name = out / f"paper-{mode}.html"
            name.write_text(page_html(mode, scripts, {**base, "mode": mode, "pages": pages}, footer), encoding="utf-8")
            page.goto(name.as_uri())
            page.wait_for_function("window.PRINT_READY === true || document.querySelector('.pp-q') === null && window.PRINT_READY !== undefined", timeout=30000)
            if errors:
                fail(f"the print page failed: {errors[0]}")
            return page.pdf(prefer_css_page_size=True, print_background=True)

        for mode in targets:
            pdf = render(mode)
            if mode == "exam":                    # second pass with the page count on the cover
                pdf = render(mode, count_pages(pdf))
            target = out / f"{stem}-{'exam' if mode == 'exam' else 'marking-scheme'}.pdf"
            target.write_bytes(pdf)
            print(f"{target}  ({count_pages(pdf)} pages)")
        browser.close()


if __name__ == "__main__":
    main()
