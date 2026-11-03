// Exam shell: welcome (student ID) -> one question per page -> review -> submit -> result.
// Works when index.html is opened straight from disk (file://); no web server needed.
//
// URL parameters (optional):
//   ?exam=exams/demo-comp352     which exam folder to load (this is the default)
//   &mode=practice|exam          overrides the "mode" in exam.json
(function (VE) {
'use strict';
const { h, downloadJSON, formatDate, formatClock, safeStorage } = VE.util;
const views = VE.views;
const { gradeSubmission, loadExam } = VE;

const params = new URLSearchParams(location.search);
const examFolder = (params.get('exam') || 'exams/demo-comp352').replace(/\/(exam\.json)?$/, '') + '/';
const app = document.getElementById('app');
const store = safeStorage();

const state = {
  exam: null, mode: 'practice', questions: [],
  view: 'welcome',          // welcome | question | review | done
  index: 0,
  student: null,            // { id }
  responses: {},            // questionId -> response object (type-specific)
  startedAt: null,
  submission: null, grade: null, filename: null, resumed: false,
};
let timer = null;

main();

async function main() {
  try {
    const folderUrl = new URL(examFolder, location.href).href;
    const mode = params.get('mode');
    Object.assign(state, await loadExam(folderUrl, { modeOverride: mode === 'exam' || mode === 'practice' ? mode : null }));
    document.title = `${state.exam.course?.code ?? ''} ${state.exam.title ?? 'Exam'}`.trim();
    render();
  } catch (e) {
    console.error(e);
    showError('The exam could not be loaded.', e.message);
  }
}

// ---------------------------------------------------------------------------------------------
// Persistence (autosave in this browser so a reload does not lose answers)

const storageKey = () => `virtualexams:${state.exam.examId}:${state.mode}:${state.student.id}`;

function save() {
  if (!store || !state.student) return;
  try {
    store.setItem(storageKey(), JSON.stringify({
      index: state.index, responses: state.responses, startedAt: state.startedAt, submitted: !!state.submission,
    }));
  } catch { /* storage full or blocked: ignore */ }
}

function restore() {
  if (!store) return false;
  try {
    const saved = JSON.parse(store.getItem(storageKey()) || 'null');
    if (!saved || saved.submitted) return false;
    state.responses = saved.responses || {};
    state.index = Math.min(saved.index || 0, state.questions.length - 1);
    state.startedAt = saved.startedAt || state.startedAt;
    return true;
  } catch {
    return false;
  }
}

function clearSaved() {
  if (store && state.student) { try { store.removeItem(storageKey()); } catch { /* ignore */ } }
}

// ---------------------------------------------------------------------------------------------
// Rendering

function render() {
  clearInterval(timer);
  app.replaceChildren();
  const v = { welcome: renderWelcome, question: renderQuestion, review: renderReview, done: renderDone }[state.view];
  v();
  window.scrollTo(0, 0);
}

function totalPoints() {
  return state.questions.reduce((s, q) => s + q.points, 0);
}

function modeBadge() {
  return state.mode === 'practice'
    ? h('span', { class: 'badge badge-practice' }, 'Practice mode')
    : h('span', { class: 'badge badge-exam' }, 'Exam');
}

function renderWelcome() {
  const e = state.exam;
  const meta = [
    ['Type', e.examType],
    ['Date', formatDate(e.date)],
    ['Start time', e.startTime],
    ['Duration', e.durationMinutes ? `${e.durationMinutes} minutes` : null],
    ['Location', e.location],
    ['Questions', String(state.questions.length)],
    ['Total points', String(totalPoints())],
  ].filter(([, v]) => v);

  const input = h('input', {
    id: 'student-id', name: 'student-id', type: 'text', inputmode: 'numeric', autocomplete: 'off',
    placeholder: e.studentIdHint || 'Student ID', required: true,
  });
  const error = h('p', { class: 'form-error', role: 'alert' });
  const startBtn = h('button', { type: 'submit', class: 'btn btn-primary' }, 'Start  →');

  const form = h('form', { class: 'start-form', novalidate: true },
    h('label', { for: 'student-id', class: 'field-label' }, 'Student ID'),
    h('div', { class: 'start-row' }, input, startBtn),
    error);
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const id = input.value.trim();
    const pattern = e.studentIdPattern ? new RegExp(e.studentIdPattern) : null;
    if (!id) { error.textContent = 'Please enter your student ID.'; input.focus(); return; }
    if (pattern && !pattern.test(id)) { error.textContent = e.studentIdError || 'This does not look like a valid student ID.'; input.focus(); return; }
    state.student = { id };
    state.responses = {};
    state.index = 0;
    state.startedAt = new Date().toISOString();
    state.resumed = restore();
    state.view = 'question';
    save();
    render();
  });

  app.append(h('main', { class: 'welcome' },
    h('section', { class: 'card welcome-card' },
      h('div', { class: 'welcome-top' },
        h('div', { class: 'course-line' }, [e.course?.code, e.course?.term].filter(Boolean).join(' · ')),
        modeBadge()),
      h('h1', {}, e.course?.title ?? ''),
      h('h2', { class: 'exam-title' }, e.title ?? 'Exam'),
      h('dl', { class: 'meta' }, meta.map(([k, v]) => [h('dt', {}, k), h('dd', {}, v)])),
      e.instructions?.length
        ? h('div', { class: 'instructions' }, h('h3', {}, 'Instructions'), h('ul', {}, e.instructions.map((t) => h('li', { html: t }))))
        : null,
      state.mode === 'practice'
        ? h('p', { class: 'note' }, 'This is a practice version: when you submit you will see which answers were correct.')
        : null,
      form)));
  setTimeout(() => input.focus(), 0);
}

function examHeader() {
  const e = state.exam;
  const clock = h('span', { class: 'timer', 'aria-live': 'off' });
  if (e.durationMinutes && state.startedAt) {
    const end = new Date(state.startedAt).getTime() + e.durationMinutes * 60000;
    const tick = () => {
      const left = (end - Date.now()) / 1000;
      clock.textContent = left > 0 ? `${formatClock(left)} left` : 'Time is up';
      clock.classList.toggle('timer-warn', left < 5 * 60);
    };
    tick();
    timer = setInterval(tick, 1000);
  }
  return h('header', { class: 'exam-header' },
    h('div', { class: 'eh-left' },
      h('strong', {}, e.course?.code ?? ''), h('span', { class: 'eh-title' }, e.title ?? ''), modeBadge()),
    h('div', { class: 'eh-right' },
      h('span', { class: 'student' }, `ID ${state.student.id}`), clock));
}

function progressNav() {
  const nav = h('nav', { class: 'progress', 'aria-label': 'Questions' });
  state.questions.forEach((q, i) => {
    const answered = views[q.type].isAnswered(state.responses[q.id]);
    const b = h('button', {
      type: 'button',
      class: ['pill', answered ? 'answered' : '', state.view === 'question' && i === state.index ? 'current' : ''].join(' '),
      'aria-label': `Question ${i + 1}${answered ? ', answered' : ''}`,
      'aria-current': state.view === 'question' && i === state.index ? 'step' : null,
      onClick: () => { state.index = i; state.view = 'question'; save(); render(); },
    }, String(i + 1));
    nav.append(b);
  });
  nav.append(h('button', {
    type: 'button', class: ['pill', 'pill-review', state.view === 'review' ? 'current' : ''].join(' '),
    onClick: () => { state.view = 'review'; render(); },
  }, 'Review'));
  return nav;
}

function renderQuestion() {
  const q = state.questions[state.index];
  const n = state.questions.length;
  const body = h('div', { class: `q-body q-type-${q.type}` });
  const nav = progressNav();

  app.append(examHeader(), nav);
  if (state.resumed) {
    app.append(h('div', { class: 'banner' }, 'Your previous answers in this browser were restored.'));
    state.resumed = false;
  }
  app.append(h('main', { class: 'question-page' },
    h('section', { class: 'card question-card', 'aria-labelledby': 'q-heading' },
      h('div', { class: 'q-head' },
        h('span', { id: 'q-heading', class: 'q-number' }, `Question ${state.index + 1} of ${n}`),
        h('span', { class: 'q-points' }, `${q.points} ${q.points === 1 ? 'point' : 'points'}`)),
      q.problem.title ? h('h2', { class: 'q-title' }, q.problem.title) : null,
      body),
    h('div', { class: 'nav-buttons' },
      h('button', {
        type: 'button', class: 'btn', disabled: state.index === 0,
        onClick: () => { state.index--; save(); render(); },
      }, '←  Previous'),
      state.index < n - 1
        ? h('button', { type: 'button', class: 'btn btn-primary', onClick: () => { state.index++; save(); render(); } }, 'Next  →')
        : h('button', { type: 'button', class: 'btn btn-primary', onClick: () => { state.view = 'review'; render(); } }, 'Review & submit  →'))));

  views[q.type].render({
    container: body,
    problem: q.problem,
    response: state.responses[q.id] ?? null,
    baseUrl: q.baseUrl,
    questionId: q.id,
    onChange: (response) => {
      state.responses[q.id] = response;
      save();
      const pill = nav.children[state.index];
      pill.classList.toggle('answered', views[q.type].isAnswered(response));
    },
  });
}

function renderReview() {
  const rows = state.questions.map((q, i) => {
    const answered = views[q.type].isAnswered(state.responses[q.id]);
    return h('li', { class: `review-row ${answered ? 'answered' : 'missing'}` },
      h('span', { class: 'rv-num' }, `${i + 1}`),
      h('span', { class: 'rv-title' }, q.problem.title ?? q.id),
      h('span', { class: 'rv-status' }, answered ? 'Answered' : 'Not answered'),
      h('button', {
        type: 'button', class: 'link-btn',
        onClick: () => { state.index = i; state.view = 'question'; render(); },
      }, answered ? 'Change' : 'Answer'));
  });
  const missing = state.questions.filter((q) => !views[q.type].isAnswered(state.responses[q.id])).length;

  app.append(examHeader(), progressNav(), h('main', { class: 'review-page' },
    h('section', { class: 'card' },
      h('h2', {}, 'Review your answers'),
      h('ol', { class: 'review-list' }, rows),
      missing
        ? h('p', { class: 'warn' }, `${missing} question${missing > 1 ? 's are' : ' is'} not answered yet.`)
        : h('p', { class: 'ok' }, 'All questions are answered.'),
      h('p', { class: 'note' }, 'After you submit you can no longer change your answers. A copy of your answers will be saved as a file.'),
      h('div', { class: 'nav-buttons' },
        h('button', { type: 'button', class: 'btn', onClick: () => { state.index = state.questions.length - 1; state.view = 'question'; render(); } }, '←  Back'),
        h('button', { type: 'button', class: 'btn btn-primary', onClick: submit }, 'Submit')))));
}

function buildSubmission() {
  const e = state.exam;
  return {
    format: 'virtualexams.submission/v1',
    examId: e.examId,
    course: e.course?.code ?? null,
    title: e.title ?? null,
    mode: state.mode,
    student: { ...state.student },
    startedAt: state.startedAt,
    submittedAt: new Date().toISOString(),
    client: { userAgent: navigator.userAgent },
    answers: state.questions.map((q) => ({
      questionId: q.id,
      type: q.type,
      problem: q.problemFile,
      response: state.responses[q.id] ?? null,
    })),
  };
}

function submit() {
  const missing = state.questions.filter((q) => !views[q.type].isAnswered(state.responses[q.id])).length;
  const msg = missing
    ? `${missing} question${missing > 1 ? 's are' : ' is'} not answered. Submit anyway?`
    : 'Submit your answers now? You will not be able to change them afterwards.';
  if (!window.confirm(msg)) return;

  state.submission = buildSubmission();
  state.filename = `${state.exam.examId}_${state.student.id}_${state.submission.submittedAt.replace(/[:.]/g, '-')}.json`;
  downloadJSON(state.submission, state.filename);
  if (state.mode === 'practice') state.grade = gradeSubmission(state.questions, state.submission);
  save();
  state.view = 'done';
  render();
}

const STATUS = {
  correct: ['✓', 'Correct'],
  incorrect: ['✗', 'Incorrect'],
  partial: ['~', 'Partially correct'],
  unanswered: ['–', 'Not answered'],
  pending: ['…', 'Graded later'],
  error: ['!', 'Could not grade'],
};

function renderDone() {
  const head = h('header', { class: 'exam-header' },
    h('div', { class: 'eh-left' }, h('strong', {}, state.exam.course?.code ?? ''), h('span', { class: 'eh-title' }, state.exam.title ?? ''), modeBadge()),
    h('div', { class: 'eh-right' }, h('span', { class: 'student' }, `ID ${state.student.id}`)));
  const again = h('div', { class: 'nav-buttons' },
    h('button', { type: 'button', class: 'btn', onClick: () => downloadJSON(state.submission, state.filename) }, 'Download answers again'),
    state.mode === 'practice'
      ? h('button', {
        type: 'button', class: 'btn btn-primary',
        onClick: () => { clearSaved(); Object.assign(state, { submission: null, grade: null, responses: {}, view: 'welcome' }); render(); },
      }, 'Try again')
      : null);

  if (state.mode !== 'practice') {
    app.append(head, h('main', { class: 'done-page' }, h('section', { class: 'card' },
      h('h2', {}, 'Your answers have been submitted'),
      h('p', {}, 'A copy was saved as ', h('code', {}, state.filename), '.'),
      h('p', { class: 'note' }, `Submitted ${new Date(state.submission.submittedAt).toLocaleString()}.`),
      again)));
    return;
  }

  const g = state.grade;
  const pct = g.maxScore ? Math.round((100 * g.totalScore) / g.maxScore) : 0;
  const cards = g.results.map((r, i) => {
    const [icon, word] = STATUS[r.status] || ['?', r.status];
    return h('li', { class: `result result-${r.status}` },
      h('div', { class: 'res-head' },
        h('span', { class: 'res-icon', 'aria-hidden': 'true' }, icon),
        h('span', { class: 'res-title' }, `${i + 1}. ${r.title}`),
        h('span', { class: 'res-score' }, `${r.score} / ${r.maxScore}`)),
      h('div', { class: 'res-status' }, word, r.detail ? ` — ${r.detail}` : ''),
      h('dl', { class: 'res-answers' },
        h('dt', {}, 'Your answer'), h('dd', {}, r.yourAnswer ?? '—'),
        r.status !== 'correct' && r.correctAnswer ? [h('dt', {}, 'Correct answer'), h('dd', {}, r.correctAnswer)] : null),
      r.explanation ? h('p', { class: 'res-expl', html: r.explanation }) : null,
      r.error ? h('p', { class: 'warn' }, r.error) : null);
  });

  app.append(head, h('main', { class: 'done-page' },
    h('section', { class: 'card score-card' },
      h('h2', {}, 'Practice results'),
      h('div', { class: 'score-big' }, h('span', {}, String(g.totalScore)), h('small', {}, ` / ${g.maxScore}`)),
      h('div', { class: 'score-bar', role: 'img', 'aria-label': `${pct} percent` }, h('div', { style: { width: `${pct}%` } })),
      h('p', { class: 'note' }, 'Your answers were also saved as ', h('code', {}, state.filename), '.')),
    h('ol', { class: 'results' }, cards),
    again));
}

function showError(title, detail) {
  app.replaceChildren(h('main', { class: 'welcome' }, h('section', { class: 'card error-card' },
    h('h2', {}, title), h('pre', {}, detail))));
}

// Exposed for debugging in the browser console.
VE.state = state;
})(globalThis.VE = globalThis.VE || {});
