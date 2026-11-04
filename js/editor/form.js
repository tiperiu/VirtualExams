// Form controls for the problem editor. Every control is bound to a property of an object
// (the problem or the solution being edited) and calls ctx.changed() after each edit.
// Empty optional fields are removed from the JSON instead of being saved as "".
(function (VE) {
'use strict';
const { h } = VE.util;

let uid = 0;
const nextId = () => `ed-${++uid}`;

function makeForm(ctx) {
  const set = (obj, key, value, optional) => {
    if (optional && (value === '' || value == null)) delete obj[key];
    else obj[key] = value;
    ctx.changed();
  };

  const F = {
    section(title, ...children) {
      return h('fieldset', { class: 'ed-section' }, h('legend', {}, title), ...children);
    },
    note(text) { return h('p', { class: 'ed-note' }, text); },
    field(label, control, hint) {
      const id = control.id || (control.id = nextId());
      return h('div', { class: 'ed-field' },
        h('label', { for: id }, label), control, hint ? h('div', { class: 'ed-hint' }, hint) : null);
    },
    row(...fields) { return h('div', { class: 'ed-row' }, ...fields); },

    text(obj, key, { placeholder = '', optional = true, mono = false } = {}) {
      const el = h('input', { type: 'text', class: mono ? 'mono' : null, placeholder, spellcheck: 'false' });
      el.value = obj[key] ?? '';
      el.addEventListener('input', () => set(obj, key, el.value, optional));
      return el;
    },
    area(obj, key, { rows = 3, placeholder = '', optional = true, mono = false } = {}) {
      const el = h('textarea', { rows: String(rows), class: mono ? 'mono' : null, placeholder, spellcheck: 'false' });
      el.value = obj[key] ?? '';
      el.addEventListener('input', () => set(obj, key, el.value, optional));
      return el;
    },
    num(obj, key, { min, max, placeholder = '', optional = true, integer = true } = {}) {
      const el = h('input', { type: 'number', min: min ?? null, max: max ?? null, step: integer ? '1' : 'any', placeholder });
      el.value = obj[key] ?? '';
      el.addEventListener('input', () => {
        if (el.value === '') { set(obj, key, null, optional); return; }
        const v = Number(el.value);
        if (Number.isFinite(v)) set(obj, key, integer ? Math.round(v) : v, optional);
      });
      return el;
    },
    select(obj, key, options, { onChange, fallback } = {}) {
      const el = h('select', {}, options.map(([value, label]) => h('option', { value }, label)));
      el.value = obj[key] ?? fallback ?? options[0][0];
      if (obj[key] == null) obj[key] = el.value; // write the shown default into the JSON
      el.addEventListener('change', () => { obj[key] = el.value; ctx.changed(); onChange?.(el.value); });
      return el;
    },
    /** A select whose two choices are true / false: options = [[true, label], [false, label]]. */
    bool(obj, key, options, { fallback = true, onChange } = {}) {
      const el = h('select', {}, options.map(([value, label]) => h('option', { value: String(value) }, label)));
      if (typeof obj[key] !== 'boolean') obj[key] = fallback;
      el.value = String(obj[key]);
      el.addEventListener('change', () => { obj[key] = el.value === 'true'; ctx.changed(); onChange?.(obj[key]); });
      return el;
    },
    check(obj, key, label, { fallback = false, onChange } = {}) {
      const el = h('input', { type: 'checkbox' });
      el.checked = obj[key] ?? fallback;
      el.addEventListener('change', () => { obj[key] = el.checked; ctx.changed(); onChange?.(el.checked); });
      return h('label', { class: 'ed-check' }, el, ' ', label);
    },
    /** A text control whose value is converted by parse(text) (throw an Error to reject). */
    parsed(obj, key, { format, parse, placeholder = '', rows = 0, mono = true, onValue } = {}) {
      const el = rows
        ? h('textarea', { rows: String(rows), class: mono ? 'mono' : null, placeholder, spellcheck: 'false' })
        : h('input', { type: 'text', class: mono ? 'mono' : null, placeholder, spellcheck: 'false' });
      const err = h('div', { class: 'ed-error', role: 'alert' });
      el.value = obj[key] == null ? '' : format(obj[key]);
      el.addEventListener('input', () => {
        try {
          const v = parse(el.value);
          err.textContent = '';
          el.classList.remove('invalid');
          if (v === undefined) delete obj[key]; else obj[key] = v;
          onValue?.(v);
          ctx.changed();
        } catch (e) {
          err.textContent = e.message;
          el.classList.add('invalid');
        }
      });
      return h('div', { class: 'ed-parsed' }, el, err);
    },
    /** One string per line → array (empty → field removed). */
    lines(obj, key, { rows = 3, placeholder = '', validate } = {}) {
      return F.parsed(obj, key, {
        rows, placeholder,
        format: (arr) => arr.join('\n'),
        parse: (t) => {
          const arr = t.split('\n').map((x) => x.trim()).filter(Boolean);
          arr.forEach((x, i) => validate?.(x, i));
          return arr.length ? arr : undefined;
        },
      });
    },
    numbers(obj, key, { placeholder = '5, 2, 9, 1' } = {}) {
      return F.parsed(obj, key, {
        placeholder,
        format: (arr) => arr.join(', '),
        parse: (t) => {
          const parts = t.split(/[\s,;]+/).filter(Boolean);
          const bad = parts.find((x) => !Number.isFinite(Number(x)));
          if (bad) throw new Error(`"${bad}" is not a number`);
          if (parts.length < 2) throw new Error('give at least 2 numbers');
          return parts.map(Number);
        },
      });
    },
    explanation(sol) {
      return F.field('Explanation (shown after submitting, in practice mode)',
        F.area(sol, 'explanation', { rows: 3, placeholder: 'Why this is the answer. HTML allowed.' }));
    },
  };
  return F;
}

VE.makeForm = makeForm;
})(globalThis.VE = globalThis.VE || {});
