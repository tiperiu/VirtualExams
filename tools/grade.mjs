#!/usr/bin/env node
// Offline grader: grades submission files with the same graders the browser uses.
//
//   node tools/grade.mjs exams/demo-comp352/exam.json submissions/*.json
//
// Writes <submission>.graded.json next to each submission and prints a summary.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

// The graders are plain browser scripts that register themselves on a global `VE` object.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GRADER_SCRIPTS = [
  'js/types/tree-traversal/tree.js',
  'js/types/mcq/grader.js',
  'js/types/text/grader.js',
  'js/types/tree-traversal/grader.js',
  'js/types/tree-array/array.js',
  'js/types/tree-array/grader.js',
  'js/types/sorting/algorithms.js',
  'js/types/sort-count/grader.js',
  'js/types/sort-trace/grader.js',
  'js/types/heap-build/heap.js',
  'js/types/heap-build/grader.js',
  'js/types/hash-table/hash.js',
  'js/types/hash-table/grader.js',
  'js/types/radix-sort/radix.js',
  'js/types/radix-sort/grader.js',
  'js/types/bst-update/bst.js',
  'js/types/bst-update/grader.js',
  'js/grading/grade-exam.js',
];
const sandbox = vm.createContext({});
for (const f of GRADER_SCRIPTS) {
  vm.runInContext(await readFile(path.join(ROOT, f), 'utf8'), sandbox, { filename: f });
}
const { gradeSubmission } = vm.runInContext('VE', sandbox);

const readJSON = async (p) => JSON.parse(await readFile(p, 'utf8'));

const [examPath, ...files] = process.argv.slice(2);
if (!examPath || !files.length) {
  console.error('Usage: node tools/grade.mjs <exam.json> <submission.json> [more submissions...]');
  process.exit(1);
}

const exam = await readJSON(examPath);
const dir = path.dirname(examPath);
const questions = await Promise.all(exam.questions.map(async (q, i) => {
  const problem = await readJSON(path.resolve(dir, q.problem));
  return {
    id: q.id || `q${i + 1}`,
    type: q.type || problem.type,
    points: q.points ?? 1,
    problem,
    solution: q.solution ? await readJSON(path.resolve(dir, q.solution)) : null,
  };
}));

let failed = false;
for (const f of files) {
  const sub = await readJSON(f);
  if (sub.examId !== exam.examId) {
    console.error(`${f}: examId "${sub.examId}" does not match "${exam.examId}" — skipped`);
    failed = true;
    continue;
  }
  // JSON round-trip: objects created inside the sandbox are plain data once serialized.
  const g = JSON.parse(JSON.stringify(gradeSubmission(questions, sub)));
  const out = f.replace(/\.json$/i, '') + '.graded.json';
  await writeFile(out, JSON.stringify(g, null, 2) + '\n');
  const marks = g.results.map((r) => `${r.questionId}:${r.score}/${r.maxScore}`).join('  ');
  console.log(`${String(g.studentId).padEnd(10)} ${String(g.totalScore).padStart(6)} / ${g.maxScore}   ${marks}${g.complete ? '' : '   (incomplete)'}`);
}
process.exit(failed ? 2 : 0);
