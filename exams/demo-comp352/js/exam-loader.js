// Loads an exam without a web server: the exam folder's JSON files are packed into
// <folder>/exam.bundle.js by tools/pack_exam.py, and that file is added as a <script>.
// (Browsers do not let a page opened from disk read JSON files directly.)
(function (VE) {
'use strict';

VE.registerExamBundle = (bundle) => { VE.examBundle = bundle; };

function loadBundleScript(folderUrl) {
  return new Promise((resolve, reject) => {
    VE.examBundle = null;
    const s = document.createElement('script');
    s.src = new URL('exam.bundle.js', folderUrl).href + `?t=${Date.now()}`;
    s.onload = () => (VE.examBundle ? resolve(VE.examBundle) : reject(new Error('exam.bundle.js did not register an exam')));
    s.onerror = () => reject(new Error(
      `Could not find ${new URL('exam.bundle.js', folderUrl).pathname}.\n` +
      'Create it from the exam JSON files with:\n\n    python3 tools/pack_exam.py'));
    document.head.append(s);
  });
}

async function loadExam(folderUrl, { modeOverride = null } = {}) {
  const bundle = await loadBundleScript(folderUrl);
  const exam = bundle.exam;
  validateExam(exam);
  const mode = modeOverride || exam.mode || 'practice';
  const file = (path) => {
    if (!(path in bundle.files)) throw new Error(`${path} is listed in exam.json but missing from exam.bundle.js — run python3 tools/pack_exam.py again`);
    return bundle.files[path];
  };

  const questions = exam.questions.map((q, i) => {
    const problem = file(q.problem);
    const type = q.type || problem.type;
    if (q.type && problem.type && q.type !== problem.type) {
      throw new Error(`Question ${q.id}: exam.json says type "${q.type}" but ${q.problem} says "${problem.type}"`);
    }
    if (!VE.views[type]) throw new Error(`Question ${q.id}: unknown question type "${type}"`);
    // Solutions are used only in practice mode (and are left out of the bundle with --no-solutions).
    const solution = mode === 'practice' && q.solution && q.solution in bundle.files ? bundle.files[q.solution] : null;
    return {
      id: q.id || `q${i + 1}`, type, points: q.points ?? 1, problemFile: q.problem,
      problem, solution, baseUrl: folderUrl,
    };
  });

  return { exam, mode, questions, packedAt: bundle.packedAt };
}

function validateExam(exam) {
  const errors = [];
  if (!exam || !exam.examId) errors.push('missing "examId"');
  if (!Array.isArray(exam?.questions) || !exam.questions.length) errors.push('"questions" must be a non-empty array');
  const ids = new Set();
  (exam?.questions || []).forEach((q, i) => {
    if (!q.problem) errors.push(`question ${i + 1}: missing "problem" file`);
    if (q.id && ids.has(q.id)) errors.push(`duplicate question id "${q.id}"`);
    ids.add(q.id);
  });
  if (errors.length) throw new Error(`Problem with exam.json: ${errors.join('; ')}`);
}

VE.loadExam = loadExam;
})(globalThis.VE = globalThis.VE || {});
