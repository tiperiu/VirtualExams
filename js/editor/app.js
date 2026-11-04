// Problem editor: create, load, edit and save problems of every type, with a live preview that
// uses the same view the student gets in the exam, and a "Check answer" button that runs the
// real grader. Problems are stored in a bank folder:
//   problems/<type>/<name>.json    what the student sees (one subfolder per problem type)
//   solutions/<type>/<name>.json   the answer key (same type folder and name)
//   assets/...                     images, referenced from problems as "assets/<file>"
// URL: editor.html?type=<type> starts a new problem of that type.
(function (VE) {
'use strict';
const { h, downloadJSON } = VE.util;
const { Bank, makeForm } = VE;

const TYPES = Object.keys(VE.editors).filter((t) => VE.views[t] && VE.graders[t]);
const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const ASSET_RE = /(?<![\w/.-])assets\/[\w.@~%+-]+(?:\/[\w.@~%+-]+)*/g;
const STATUS = {
  correct: ['✓', 'Correct'], incorrect: ['✗', 'Incorrect'], partial: ['~', 'Partially correct'],
  unanswered: ['–', 'Not answered'], pending: ['…', 'Graded by hand'], error: ['!', 'Could not grade'],
};
const clone = (o) => JSON.parse(JSON.stringify(o));
const BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

const S = {
  bank: null,          // VE.Bank when a folder is open
  list: [],            // problems in the bank: [{ type, name, title, error? }]
  stray: [],           // .json files directly in problems/ (ignored)
  assets: [],          // "assets/..." image paths in the bank
  cur: null,           // { name, type, loadedKey ('type/name' as saved), problem, solution, saved, notices }
  response: null,      // the answer given in the preview
  urls: new Map(),     // asset path -> object URL
  memAssets: new Map(),// images added without a bank folder
  filter: '',
  tab: 'preview',
};

// ---- page skeleton --------------------------------------------------------------------------
const app = document.getElementById('app');
const bankBox = h('div', { class: 'ed-bankbox' });
const side = h('aside', { class: 'ed-side' });
const formPane = h('main', { class: 'ed-formpane' });
const previewPane = h('section', { class: 'ed-previewpane', 'aria-label': 'Preview' });
app.append(
  h('header', { class: 'ed-header' },
    h('div', { class: 'ed-brand' }, h('strong', {}, 'VirtualExams'), h('span', {}, 'Problem editor')),
    bankBox,
    h('a', { class: 'ed-link', href: 'index.html' }, 'Open the demo exam ↗')),
  h('div', { class: 'ed-shell' }, side, formPane, previewPane));

const status = h('div', { class: 'ed-status', role: 'status' });
let statusTimer = null;
function say(msg, kind = 'info') {
  status.textContent = msg;
  status.className = `ed-status ed-status-${kind}`;
  clearTimeout(statusTimer);
  if (kind !== 'error') statusTimer = setTimeout(() => { status.textContent = ''; }, 6000);
}

// ---- bank -----------------------------------------------------------------------------------
async function drawBankBox() {
  bankBox.replaceChildren();
  if (!Bank.supported) {
    bankBox.append(h('span', { class: 'ed-bankname' }, 'No folder access in this browser — use Chrome or Edge to open and save a bank folder.'));
    return;
  }
  if (S.bank) {
    bankBox.append(h('span', { class: 'ed-bankname', title: 'Bank folder' }, '📁 ', S.bank.name));
    bankBox.append(button('Open another folder…', openBank, 'btn-ghost'));
    return;
  }
  bankBox.append(button('Open bank folder…', openBank, 'btn-ghost'));
  const prev = await Bank.previous();
  if (prev && !S.bank) {
    bankBox.append(button(`Reopen “${prev.name}”`, async () => {
      if (!(await confirmDiscard())) return;
      const b = await prev.open();
      if (b) await useBank(b); else say('Permission to the folder was not given.', 'error');
    }, 'btn-ghost'));
  }
}

async function openBank() {
  if (!(await confirmDiscard())) return;
  try {
    const b = await Bank.pick();
    if (b) await useBank(b);
  } catch (e) {
    say(`Could not open the folder: ${e.message}`, 'error');
  }
}

async function useBank(bank) {
  S.bank = bank;
  S.cur = null;
  S.urls.forEach((u) => URL.revokeObjectURL(u));
  S.urls.clear();
  await refreshBank();
  drawBankBox();
  drawForm();
  drawPreview();
  const empty = !S.list.length;
  say(empty ? `Opened “${bank.name}”. It has no problems yet: new problems will be saved into it.` : `Opened “${bank.name}”: ${S.list.length} problems.`);
  if (S.stray.length) say(`Ignored ${S.stray.join(', ')}: files directly in problems/ must be moved into problems/<type>/.`, 'error');
}

async function refreshBank() {
  if (!S.bank) return;
  const [{ problems, stray }, assets] = await Promise.all([S.bank.list(), S.bank.assets()]);
  S.list = problems; S.stray = stray; S.assets = assets;
  drawSide();
}

// ---- side bar: new problem + list -------------------------------------------------------------
function drawSide() {
  side.replaceChildren();
  side.append(h('div', { class: 'ed-side-title' }, 'New problem'));
  side.append(h('div', { class: 'ed-newtypes' }, TYPES.map((t) => button(VE.editors[t].label, () => newProblem(t), 'ed-newtype'))));

  if (!S.bank) {
    side.append(h('div', { class: 'ed-side-title' }, 'Open'));
    const pick = (accept, onFile) => {
      const input = h('input', { type: 'file', accept, hidden: true });
      input.addEventListener('change', () => { if (input.files[0]) onFile(input.files[0]); input.value = ''; });
      return input;
    };
    const pf = pick('.json,application/json', openProblemFile);
    const sf = pick('.json,application/json', openSolutionFile);
    side.append(pf, sf,
      h('div', { class: 'ed-newtypes' },
        button('Problem file…', () => pf.click(), 'ed-newtype'),
        button('Solution file…', () => sf.click(), 'ed-newtype', !S.cur)),
      h('p', { class: 'ed-note' }, Bank.supported
        ? 'Open the bank folder (top right) to see its problems, and to save in place.'
        : 'Without folder access, Save downloads <name>.json and <name>.solution.json.'));
    return;
  }

  const search = h('input', { type: 'search', class: 'ed-search', placeholder: 'Filter problems', value: S.filter });
  search.addEventListener('input', () => { S.filter = search.value; drawList(list); });
  const list = h('div', { class: 'ed-list', role: 'list' });
  side.append(h('div', { class: 'ed-side-title' }, `Problems in “${S.bank.name}”`, h('span', { class: 'ed-count' }, String(S.list.length))), search, list);
  drawList(list);
}

function drawList(list) {
  list.replaceChildren();
  const f = S.filter.trim().toLowerCase();
  const items = S.list.filter((x) => !f || `${x.name} ${x.title} ${x.type}`.toLowerCase().includes(f));
  if (!items.length) list.append(h('p', { class: 'ed-note' }, S.list.length ? 'No match.' : 'No problems yet.'));
  let group = null;
  for (const x of items) {
    if (x.type !== group) {
      group = x.type;
      list.append(h('div', { class: 'ed-group' }, VE.editors[group]?.label ?? group, h('span', { class: 'ed-group-dir' }, `${group}/`)));
    }
    const b = h('button', {
      type: 'button', role: 'listitem',
      class: `ed-item${S.cur && S.cur.loadedKey === `${x.type}/${x.name}` ? ' active' : ''}`,
      title: x.error || x.title,
    },
    h('span', { class: 'ed-item-name' }, x.name),
    x.error ? h('span', { class: 'ed-tag bad' }, 'error') : h('span', {}),
    x.title ? h('span', { class: 'ed-item-title' }, x.title) : null);
    b.addEventListener('click', () => openFromBank(x.type, x.name));
    list.append(b);
  }
}

// ---- opening / creating --------------------------------------------------------------------
function uniqueName(type, base) {
  const names = new Set(S.list.filter((x) => x.type === type).map((x) => x.name));
  if (!names.has(base)) return base;
  for (let k = 2; ; k++) if (!names.has(`${base}-${k}`)) return `${base}-${k}`;
}

async function newProblem(type) {
  if (!(await confirmDiscard())) return;
  const { problem, solution } = VE.editors[type].blank();
  setCurrent({ name: uniqueName(type, 'new-problem'), loadedKey: null, type, problem, solution, notices: [] });
}

async function openFromBank(type, name) {
  const key = `${type}/${name}`;
  if (S.cur && S.cur.loadedKey === key) return;
  if (!(await confirmDiscard())) return;
  try {
    const { problem, solution } = await S.bank.load(type, name);
    if (!openLoaded(name, problem, solution, solution ? [] : [`There is no solutions/${key}.json yet; it will be created when you save.`])) return;
    S.cur.loadedKey = key;
    drawSide();
  } catch (e) {
    say(`Could not open ${key}: ${e.message}`, 'error');
  }
}

function openLoaded(name, problem, solution, notices = []) {
  const type = problem.type;
  if (!VE.editors[type]) {
    say(`${name}: unknown problem type "${type}"`, 'error');
    return false;
  }
  solution = solution || {};
  notices = notices.concat(VE.editors[type].normalize?.(problem, solution) ?? []);
  setCurrent({ name, loadedKey: null, type, problem, solution, notices });
  return true;
}

async function openProblemFile(file) {
  if (!(await confirmDiscard())) return;
  try {
    const problem = JSON.parse(await file.text());
    const name = file.name.replace(/\.json$/i, '');
    openLoaded(name, problem, {}, ['Opened without a bank folder: also open its solution file (“Solution file…”), and add its images with “Add image…”.']);
  } catch (e) {
    say(`${file.name}: ${e.message}`, 'error');
  }
}

async function openSolutionFile(file) {
  if (!S.cur) return;
  try {
    const solution = JSON.parse(await file.text());
    S.cur.solution = solution;
    S.cur.notices = (VE.editors[S.cur.type].normalize?.(clone(S.cur.problem), solution) ?? []);
    drawForm();
    changed();
    say(`Loaded ${file.name} as the solution.`);
  } catch (e) {
    say(`${file.name}: ${e.message}`, 'error');
  }
}

function setCurrent(cur) {
  S.cur = cur;
  S.response = null;
  drawForm();      // drawing the form can fill in defaults: the result counts as "saved"
  cur.saved = snapshot();
  updateDirty();
  drawPreview();
  drawSide();
}

const snapshot = () => (S.cur ? JSON.stringify([S.cur.name, S.cur.problem, S.cur.solution]) : '');
const isDirty = () => !!S.cur && snapshot() !== S.cur.saved;

async function confirmDiscard() {
  return !isDirty() || window.confirm(`“${S.cur.name}” has unsaved changes. Discard them?`);
}

// ---- saving -----------------------------------------------------------------------------
async function save() {
  if (!S.cur) return;
  const name = S.cur.name.trim();
  if (!NAME_RE.test(name)) {
    say('The name may only contain letters, digits, ".", "-" and "_", and must start with a letter or digit.', 'error');
    return;
  }
  S.cur.name = name;
  const { problem, solution, type } = S.cur;
  const key = `${type}/${name}`;
  try {
    if (S.bank) {
      if (key !== S.cur.loadedKey && (await S.bank.exists(type, name))
        && !window.confirm(`problems/${key}.json already exists in “${S.bank.name}”. Replace it?`)) return;
      await S.bank.save(type, name, problem, solution);
      const renamed = S.cur.loadedKey && S.cur.loadedKey !== key;
      S.cur.loadedKey = key;
      S.cur.saved = snapshot();
      await refreshBank();
      say(`Saved problems/${key}.json and solutions/${key}.json${renamed ? ' (the files under the old name are kept)' : ''}.`, 'ok');
    } else {
      downloadJSON(problem, `${name}.json`);
      setTimeout(() => downloadJSON(solution, `${name}.solution.json`), 300);
      S.cur.saved = snapshot();
      say(`Downloaded ${name}.json and ${name}.solution.json — put them in the bank as problems/${key}.json and solutions/${key}.json.`, 'ok');
    }
    updateDirty();
  } catch (e) {
    say(`Could not save: ${e.message}`, 'error');
  }
}

// ---- the form ---------------------------------------------------------------------------
const saveBtn = button('Save', save, 'btn-primary');
const dirtyMark = h('span', { class: 'ed-dirty' });

function updateDirty() {
  const d = isDirty();
  dirtyMark.textContent = d ? 'Unsaved changes' : S.cur ? 'Saved' : '';
  dirtyMark.classList.toggle('on', d);
  saveBtn.textContent = S.bank || !S.cur ? 'Save' : 'Download';
  document.title = S.cur ? `${d ? '• ' : ''}${S.cur.name} — Problem editor` : 'Problem editor';
}

let previewTimer = null;
function changed() {
  updateDirty();
  clearTimeout(previewTimer);
  previewTimer = setTimeout(drawPreview, 200);
}

function drawForm() {
  formPane.replaceChildren();
  if (!S.cur) {
    formPane.append(status, welcome());
    return;
  }
  const cur = S.cur;
  const ed = VE.editors[cur.type];
  const ctx = { problem: cur.problem, solution: cur.solution, changed, rerender: drawForm };
  const F = makeForm(ctx);

  const nameInput = h('input', { type: 'text', class: 'mono ed-name', spellcheck: 'false', 'aria-label': 'Problem name (file name)' });
  nameInput.value = cur.name;
  nameInput.addEventListener('input', () => { cur.name = nameInput.value; changed(); });

  formPane.append(
    h('div', { class: 'ed-toolbar' },
      h('div', { class: 'ed-namebox' },
        h('div', { class: 'ed-path' }, `problems/${cur.type}/`),
        h('div', { class: 'ed-nameline' }, nameInput, h('span', { class: 'ed-ext' }, '.json'))),
      dirtyMark, saveBtn),
    status);
  for (const n of cur.notices) formPane.append(h('div', { class: 'ed-notice' }, n));

  const p = cur.problem;
  formPane.append(F.section('Common',
    F.field('Title', F.text(p, 'title', { placeholder: 'Short title, shown above the question' })),
    F.field('Prompt (HTML)', F.area(p, 'prompt', { rows: 4, mono: true, placeholder: ed.promptNote ? '(generated)' : '<p>…</p>' }),
      ed.promptNote || 'HTML: <p>, <strong>, <code>, <pre><code>…</code></pre>, <img src="assets/…">.'),
    imageField(F, ctx)));
  for (const part of [].concat(ed.form(F, ctx))) if (part) formPane.append(part);
  updateDirty();
}

function welcome() {
  return h('div', { class: 'ed-welcome' },
    h('h1', {}, 'Problem editor'),
    h('p', {}, 'Problems live in a ', h('strong', {}, 'bank folder'), ' (for example ', h('code', {}, 'bank/'), ' in VirtualExams):'),
    h('pre', {}, 'problems/<type>/<name>.json    what the student sees\nsolutions/<type>/<name>.json   the answer key — same folder and name\nassets/                        images used by the problems'),
    h('p', {}, Bank.supported
      ? 'Open the bank folder with the button at the top right, then pick a problem on the left or create a new one. Saving writes both files into the folder.'
      : 'This browser cannot open folders: you can create and edit problems and download them. Chrome or Edge can open and save a bank folder directly.'),
    h('p', {}, 'To build an exam from bank problems: ', h('code', {}, 'python3 tools/build_exam.py --help')));
}

function imageField(F, ctx) {
  const p = ctx.problem;
  const wrap = h('div', { class: 'ed-field' }, h('label', {}, 'Image (optional)'));
  const draw = () => {
    wrap.replaceChildren(h('label', {}, 'Image (optional)'));
    const options = new Set([...S.assets, ...S.memAssets.keys()]);
    if (p.image?.src) options.add(p.image.src);
    const sel = h('select', { 'aria-label': 'Image file' },
      h('option', { value: '' }, '— no image —'),
      [...options].sort().map((src) => h('option', { value: src }, src.replace(/^assets\//, ''))));
    sel.value = p.image?.src ?? '';
    sel.addEventListener('change', () => {
      if (!sel.value) delete p.image; else p.image = { ...(p.image || {}), src: sel.value };
      changed(); draw();
    });
    const file = h('input', { type: 'file', accept: 'image/*', hidden: true });
    file.addEventListener('change', () => { if (file.files[0]) addImage(file.files[0]).then(() => draw()); file.value = ''; });
    wrap.append(h('div', { class: 'ed-inline' }, sel, file, button('Add image…', () => file.click(), 'btn-small')));
    if (p.image) {
      const img = p.image;
      wrap.append(F.row(
        F.field('Alt text (for screen readers)', F.text(img, 'alt', { placeholder: 'Describe the image' })),
        F.field('Width', F.text(img, 'width', { placeholder: 'e.g. 420px or 60%' }))),
        F.field('Caption', F.text(img, 'caption', { placeholder: 'optional' })));
    }
    wrap.append(h('div', { class: 'ed-hint' }, S.bank
      ? 'Images are copied into the bank’s assets/ folder. In a prompt, use <img src="assets/name.png">.'
      : 'Without a bank folder the image is only kept in this page: copy it into the bank’s assets/ folder yourself.'));
  };
  draw();
  async function addImage(f) {
    const path = `assets/${f.name}`;
    try {
      if (S.bank) {
        if ((await S.bank.hasAsset(f.name)) && !window.confirm(`${path} already exists in the bank. Replace it?`)) return;
        await S.bank.addAsset(f);
        if (S.urls.has(path)) { URL.revokeObjectURL(S.urls.get(path)); S.urls.delete(path); }
        S.assets = await S.bank.assets();
      } else {
        S.memAssets.set(path, f);
      }
      p.image = { ...(p.image || {}), src: path, alt: p.image?.alt ?? '' };
      changed();
      say(`Added ${path}.`, 'ok');
    } catch (e) {
      say(`Could not add the image: ${e.message}`, 'error');
    }
  }
  return wrap;
}

// ---- preview ----------------------------------------------------------------------------
/** The problem with "assets/..." paths replaced by object URLs (loading missing ones). */
function withAssets(problem) {
  let text = JSON.stringify(problem);
  const missing = [];
  const wanted = new Set(text.match(ASSET_RE) || []);
  for (const path of wanted) {
    if (!S.urls.has(path)) {
      if (S.memAssets.has(path)) S.urls.set(path, URL.createObjectURL(S.memAssets.get(path)));
      else if (S.bank) {
        S.urls.set(path, null); // loading
        S.bank.asset(path).then((f) => {
          if (f) { S.urls.set(path, URL.createObjectURL(f)); drawPreview(); } else S.urls.set(path, undefined);
        });
      }
    }
    const url = S.urls.get(path);
    if (url === undefined) missing.push(path);
    text = text.split(path).join(url || BLANK); // blank image while loading or missing
  }
  return { problem: JSON.parse(text), missing };
}

function drawPreview() {
  previewPane.replaceChildren();
  if (!S.cur) return;
  const cur = S.cur;
  const tabs = h('div', { class: 'ed-tabs', role: 'tablist' },
    ['preview', 'json'].map((t) => {
      const b = h('button', { type: 'button', role: 'tab', class: `ed-tab${S.tab === t ? ' active' : ''}`, 'aria-selected': String(S.tab === t) },
        t === 'preview' ? 'Student view' : 'JSON files');
      b.addEventListener('click', () => { S.tab = t; drawPreview(); });
      return b;
    }));
  previewPane.append(tabs);
  if (S.tab === 'json') { previewPane.append(jsonTab()); return; }

  const { problem, missing } = withAssets(cur.problem);
  const result = h('div', { class: 'ed-result' });
  const body = h('div', { class: `q-body q-type-${cur.type}` });
  const card = h('section', { class: 'card question-card ed-card' },
    h('div', { class: 'q-head' }, h('span', { class: 'q-number' }, 'Preview'), h('span', { class: 'q-points' }, VE.editors[cur.type].label)),
    problem.title ? h('h2', { class: 'q-title' }, problem.title) : null,
    body);
  try {
    VE.views[cur.type].render({
      container: body, problem, response: S.response, baseUrl: location.href, questionId: 'preview', autofocus: false,
      onChange: (r) => { S.response = r; result.replaceChildren(); },
    });
  } catch (e) {
    body.replaceChildren(h('div', { class: 'ed-error-box' }, h('strong', {}, 'This problem cannot be shown: '), e.message));
  }
  for (const m of missing) card.append(h('div', { class: 'ed-error-box' }, `${m} was not found in the bank’s assets/ folder.`));

  const key = h('div', { class: 'ed-key' });
  try {
    const g = VE.graders[cur.type].grade({ problem: cur.problem, solution: cur.solution, response: null, points: 1 });
    key.append(h('span', {}, 'Answer key: '), h('code', {}, g.correctAnswer ?? '—'));
  } catch (e) {
    key.append(h('span', { class: 'ed-bad' }, `The grader fails: ${e.message}`));
  }
  previewPane.append(card,
    h('div', { class: 'ed-preview-actions' },
      button('Check my answer', () => check(result), 'btn-primary'),
      button('Clear answer', () => { S.response = null; drawPreview(); }),
      key),
    result);
}

function check(result) {
  result.replaceChildren();
  const cur = S.cur;
  let r;
  try {
    r = VE.graders[cur.type].grade({ problem: cur.problem, solution: cur.solution, response: S.response, points: 1 });
  } catch (e) {
    result.append(h('div', { class: 'ed-error-box' }, `The grader fails: ${e.message}`));
    return;
  }
  const [icon, word] = STATUS[r.status] || ['?', r.status];
  const expl = h('p', { class: 'res-expl', html: r.explanation || '' });
  result.append(h('div', { class: `result result-${r.status}` },
    h('div', { class: 'res-head' },
      h('span', { class: 'res-icon', 'aria-hidden': 'true' }, icon),
      h('span', { class: 'res-title' }, word + (r.detail ? ` — ${r.detail}` : '')),
      h('span', { class: 'res-score' }, `${r.score} / 1`)),
    h('dl', { class: 'res-answers' },
      h('dt', {}, 'Your answer'), h('dd', {}, r.yourAnswer ?? '—'),
      h('dt', {}, 'Correct answer'), h('dd', {}, r.correctAnswer ?? '—')),
    r.explanation ? expl : null));
}

function jsonTab() {
  const cur = S.cur;
  const mk = (obj) => h('textarea', { class: 'mono ed-json', spellcheck: 'false', rows: '14' }, JSON.stringify(obj, null, 2));
  const pa = mk(cur.problem), sa = mk(cur.solution);
  const err = h('div', { class: 'ed-error', role: 'alert' });
  const apply = button('Apply JSON', () => {
    try {
      const problem = JSON.parse(pa.value), solution = JSON.parse(sa.value);
      if (!VE.editors[problem.type]) throw new Error(`unknown problem type "${problem.type}"`);
      cur.problem = problem; cur.solution = solution; cur.type = problem.type;
      cur.notices = VE.editors[problem.type].normalize?.(problem, solution) ?? [];
      drawForm(); changed(); S.tab = 'preview'; drawPreview();
      say('Applied the JSON.', 'ok');
    } catch (e) { err.textContent = e.message; }
  }, 'btn-primary');
  return h('div', { class: 'ed-jsontab' },
    h('p', { class: 'ed-note' }, 'The two files as they will be saved. Edit them here for fields the form does not offer, then press Apply.'),
    h('label', { class: 'ed-jsonlabel' }, `problems/${cur.type}/${cur.name}.json`), pa,
    h('label', { class: 'ed-jsonlabel' }, `solutions/${cur.type}/${cur.name}.json`), sa,
    err, apply);
}

// ---- helpers & start --------------------------------------------------------------------
function button(label, onClick, cls = '', disabled = false) {
  const b = h('button', { type: 'button', class: `btn ${cls}`.trim(), disabled });
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

window.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
});
window.addEventListener('beforeunload', (e) => { if (isDirty()) { e.preventDefault(); e.returnValue = ''; } });

drawBankBox();
drawSide();
drawForm();
const startType = new URLSearchParams(location.search).get('type');
if (startType && VE.editors[startType]) newProblem(startType);

VE.editorState = S; // for debugging and tests
})(globalThis.VE = globalThis.VE || {});
