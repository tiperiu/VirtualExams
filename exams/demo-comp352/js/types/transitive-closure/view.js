// Transitive closure question: one panel per iteration. Each panel shows the graph with the edges
// so far (the original edges in black, the student's edges of earlier iterations dashed); the student
// drags from one vertex to another to add a new edge (or clicks the two vertices), and clicks an added
// edge (or its chip) to remove it.
// Response format: { "added": [["C>B", "D>B"], [], ["A>D"], ...] }   (one list per iteration)
(function (VE) {
'use strict';
const { h } = VE.util;
const { renderPrompt, drawGraph } = VE;
const T = VE.transitiveClosure;
const G = VE.graph;

function isAnswered(r) {
  return !!(r && Array.isArray(r.added) && r.added.some((l) => Array.isArray(l) && l.length));
}

function render({ container, problem, response, onChange, baseUrl }) {
  const s = T.solve(problem);
  const { g, K } = s;
  const pos = G.layout(problem, g);
  const added = Array.from({ length: K }, (_, k) => (Array.isArray(response?.added?.[k]) ? response.added[k].filter((e) => typeof e === 'string') : []));
  const emit = () => onChange({ added: added.map((l) => l.slice()) });
  container.append(renderPrompt({ ...problem, prompt: problem.prompt ?? T.defaultPrompt(problem) }, baseUrl));
  container.append(h('p', { class: 'q-hint' }, 'In each panel, drag from one vertex to another to add a new edge (or click the two vertices one after the other). Click a new edge, or its ✕ below, to remove it. An iteration may add no edges.'));
  const panels = h('div', { class: 'tc-panels' });
  container.append(panels);

  const draw = () => {
    panels.replaceChildren();
    let before = new Set(s.base);
    const earlier = new Set();
    for (let k = 0; k < K; k++) {
      const via = g.V[k];
      const mine = added[k];
      const edges = [
        ...[...s.base].map((e) => ({ e, cls: '' })),
        ...[...earlier].map((e) => ({ e, cls: 'gd-old' })),
        ...mine.map((e) => ({ e, cls: 'gd-new' })),
      ].map(({ e, cls }) => { const [u, v] = e.split('>'); return { u, v, cls }; });
      const gd = drawGraph({ g: { ...g, directed: true }, pos, edges, weights: false, width: problem.width || 420, height: problem.height || 260, label: `Iteration ${k + 1}` });
      gd.vertexEls.get(via)?.classList.add('gd-via');
      const present = new Set([...before, ...mine]);
      const msg = h('p', { class: 'te-msg' });
      const add = (u, v) => {
        if (u === v) return;
        const e = G.ek(u, v);
        if (present.has(e)) { msg.textContent = `${T.arrow(e)} is already an edge.`; return; }
        mine.push(e); emit(); draw();
      };
      const remove = (e) => { const i = mine.indexOf(e); if (i >= 0) { mine.splice(i, 1); emit(); draw(); } };
      // drag from a vertex to another (or click two vertices)
      let picked = null;
      for (const [v, el] of gd.vertexEls) {
        el.addEventListener('pointerdown', (ev) => {
          ev.preventDefault();
          const [x0, y0] = gd.point(v);
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('class', 'gd-edge gd-new gd-drag');
          line.setAttribute('x1', x0); line.setAttribute('y1', y0); line.setAttribute('x2', x0); line.setAttribute('y2', y0);
          gd.svg.insertBefore(line, gd.svg.querySelector('.gd-v'));
          let moved = false;
          const move = (e2) => { const [x, y] = gd.toSvg(e2.clientX, e2.clientY); if (Math.hypot(x - x0, y - y0) > 6) moved = true; line.setAttribute('x2', x); line.setAttribute('y2', y); };
          const up = (e2) => {
            window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
            line.remove();
            const target = document.elementFromPoint(e2.clientX, e2.clientY)?.closest('[data-v]');
            if (moved && target && gd.svg.contains(target)) { add(v, target.dataset.v); return; }
            if (!moved) {                       // click: pick a vertex, then the second one
              if (picked && picked !== v) { const p = picked; picked = null; add(p, v); return; }
              gd.vertexEls.forEach((x) => x.classList.remove('gd-picked'));
              picked = picked === v ? null : v;
              if (picked) el.classList.add('gd-picked');
            }
          };
          window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
        });
      }
      for (const p of gd.svg.querySelectorAll('.gd-edge.gd-new')) p.addEventListener('click', () => remove(p.dataset.edge));
      const chips = h('div', { class: 'tc-chips' }, mine.length
        ? mine.map((e) => h('button', { type: 'button', class: 'tc-chip', 'aria-label': `Remove ${T.arrow(e)}`, onClick: () => remove(e) }, T.arrow(e), ' ✕'))
        : h('span', { class: 'tc-none' }, 'no new edges yet'));
      panels.append(h('section', { class: 'tc-panel' },
        h('div', { class: 'tc-title' }, `Iteration ${k + 1}: through ${via} (v${k + 1})`),
        h('div', { class: 'gd-box' }, gd.svg), chips, msg));
      mine.forEach((e) => earlier.add(e));
      before = new Set([...before, ...mine]);
    }
  };
  draw();
}

VE.views = VE.views || {};
VE.views['transitive-closure'] = { render, isAnswered };
})(globalThis.VE = globalThis.VE || {});
