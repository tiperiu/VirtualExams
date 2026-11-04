// Grades a whole submission. Pure: the caller loads the exam, problems and solutions.
//
// questions:  [{ id, type, points, problem, solution }]   (solution may be null -> "pending")
// submission: the JSON produced by the exam app (see README, "Submission format")
(function (VE) {
'use strict';
const round2 = (x) => Math.round(x * 100) / 100;

function gradeSubmission(questions, submission) {
  const answers = new Map((submission.answers ?? []).map((a) => [a.questionId, a]));
  const results = questions.map((q) => {
    const maxScore = q.points ?? 1;
    const response = answers.get(q.id)?.response ?? null;
    const head = { questionId: q.id, type: q.type, title: q.problem?.title ?? q.id, maxScore };
    const grader = (VE.graders || {})[q.type];
    if (!grader) return { ...head, status: 'error', score: 0, error: `No grader for type "${q.type}"` };
    if (!q.solution) return { ...head, status: 'pending', score: 0, yourAnswer: null, correctAnswer: null };
    try {
      return { ...head, ...grader.grade({ problem: q.problem, solution: q.solution, response, points: maxScore }) };
    } catch (e) {
      return { ...head, status: 'error', score: 0, error: e.message };
    }
  });
  return {
    format: 'virtualexams.grade/v1',
    examId: submission.examId,
    studentId: submission.student?.id ?? null,
    gradedAt: new Date().toISOString(),
    totalScore: round2(results.reduce((s, r) => s + (r.score || 0), 0)),
    maxScore: round2(results.reduce((s, r) => s + r.maxScore, 0)),
    complete: results.every((r) => r.status !== 'pending' && r.status !== 'error'),
    results,
  };
}

VE.gradeSubmission = gradeSubmission;
})(globalThis.VE = globalThis.VE || {});
