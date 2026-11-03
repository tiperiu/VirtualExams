// Shared rendering helpers for question types.
(function (VE) {
'use strict';
const { h } = VE.util;

/**
 * Renders the parts every question type shares: prompt text (HTML from the exam author)
 * and an optional image. Image paths are relative to the problem JSON file.
 */
function renderPrompt(problem, baseUrl) {
  const wrap = h('div', { class: 'q-prompt' });
  if (problem.prompt) wrap.append(h('div', { class: 'prompt-text', html: problem.prompt }));
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
})(globalThis.VE = globalThis.VE || {});
