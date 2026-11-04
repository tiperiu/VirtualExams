// Shared rendering helpers for question types.
(function (VE) {
'use strict';
const { h } = VE.util;

/**
 * Renders the parts every question type shares: prompt text (HTML from the exam author)
 * and an optional image. Asset paths ("assets/x.svg") are relative to the exam (or bank) folder,
 * given as baseUrl; that also applies to src="..." attributes inside the prompt HTML.
 */
function resolveSrc(root, baseUrl) {
  for (const el of root.querySelectorAll('[src]')) {
    const v = el.getAttribute('src');
    if (v && !/^([a-z][a-z0-9+.-]*:|\/)/i.test(v)) el.setAttribute('src', new URL(v, baseUrl).href);
  }
}

function renderPrompt(problem, baseUrl) {
  const wrap = h('div', { class: 'q-prompt' });
  if (problem.prompt) {
    const text = h('div', { class: 'prompt-text', html: problem.prompt });
    resolveSrc(text, baseUrl);
    wrap.append(text);
  }
  if (problem.image && problem.image.src) {
    const src = new URL(problem.image.src, baseUrl).href;
    wrap.append(
      h('figure', { class: 'q-figure' },
        h('img', { src, alt: problem.image.alt || '', style: problem.image.width ? { width: problem.image.width } : null }),
        problem.image.caption ? h('figcaption', {}, problem.image.caption) : null)
    );
  }
  return wrap;
}

VE.renderPrompt = renderPrompt;
VE.resolveSrc = resolveSrc;
})(globalThis.VE = globalThis.VE || {});
