// Draws a graph as SVG: vertices as circles, edges as lines (arrows when directed, curved when
// both directions exist), weights on the edges. Browser only.
//
//   const gd = VE.drawGraph({ g, pos, edges, weights, width, height, label })
//     g: VE.graph.parseGraph(...);  pos: VE.graph.layout(...)
//     edges: optional [{ u, v, w, cls }] to draw instead of g.E (cls: extra CSS class)
//   -> { svg, vertexEls: Map(v -> <g>), point(v) -> [x, y], toSvg(clientX, clientY) -> [x, y] }
(function (VE) {
'use strict';
const NS = 'http://www.w3.org/2000/svg';
const R = 17;
const el = (name, attrs = {}) => {
  const e = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) if (v != null) e.setAttribute(k, v);
  return e;
};
let uid = 0;

function drawGraph({ g, pos, edges, weights = g.weighted, width = 520, height = 300, label = 'Graph' }) {
  const id = `gd${++uid}`;
  const pad = R + 14;
  const P = new Map([...pos].map(([v, [x, y]]) => [v, [pad + x * (width - 2 * pad), pad + y * (height - 2 * pad)]]));
  const svg = el('svg', { class: 'gd', viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': label });
  const defs = el('defs');
  for (const [name, cls] of [['a', ''], ['n', 'gd-new'], ['o', 'gd-old']]) {
    const m = el('marker', { id: `${id}-${name}`, viewBox: '0 0 10 10', refX: '9', refY: '5', markerWidth: '7', markerHeight: '7', orient: 'auto-start-reverse' });
    m.append(el('path', { d: 'M0 0 L10 5 L0 10 z', class: `gd-head ${cls}` }));
    defs.append(m);
  }
  svg.append(defs);
  const list = edges ?? g.E.map((e) => ({ u: e.u, v: e.v, w: e.w }));
  const has = new Set(list.map((e) => `${e.u}>${e.v}`));
  const edgeLayer = el('g', { class: 'gd-edges' });
  const labelLayer = el('g', { class: 'gd-labels' });
  for (const e of list) {
    const [x1, y1] = P.get(e.u), [x2, y2] = P.get(e.v);
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;
    const both = g.directed && has.has(`${e.v}>${e.u}`);
    const bend = both ? 22 : 0;                       // curve the two directions apart
    const nx = -uy * bend, ny = ux * bend;
    const sx = x1 + ux * R, sy = y1 + uy * R;
    const ex = x2 - ux * (R + (g.directed ? 2 : 0)), ey = y2 - uy * (R + (g.directed ? 2 : 0));
    const mx = (x1 + x2) / 2 + nx, my = (y1 + y2) / 2 + ny;
    const kind = e.cls === 'gd-new' ? 'n' : e.cls === 'gd-old' ? 'o' : 'a';
    const path = el('path', {
      d: bend ? `M${sx} ${sy} Q${mx} ${my} ${ex} ${ey}` : `M${sx} ${sy} L${ex} ${ey}`,
      class: `gd-edge ${e.cls || ''}`, 'marker-end': g.directed ? `url(#${id}-${kind})` : null,
      'data-edge': `${e.u}>${e.v}`,
    });
    edgeLayer.append(path);
    if (weights && e.w != null) {
      const lx = bend ? (x1 + x2) / 2 + nx * 0.55 : (x1 + x2) / 2 - uy * 11, ly = bend ? (y1 + y2) / 2 + ny * 0.55 : (y1 + y2) / 2 + ux * 11;
      const t = el('text', { x: lx, y: ly + 4, class: 'gd-w', 'text-anchor': 'middle' });
      t.textContent = String(e.w);
      labelLayer.append(t);
    }
  }
  svg.append(edgeLayer, labelLayer);
  const vertexEls = new Map();
  for (const v of g.V) {
    const [x, y] = P.get(v);
    const grp = el('g', { class: 'gd-v', 'data-v': v, transform: `translate(${x} ${y})` });
    grp.append(el('circle', { r: R }));
    const t = el('text', { y: 5, 'text-anchor': 'middle' });
    t.textContent = v;
    grp.append(t);
    svg.append(grp);
    vertexEls.set(v, grp);
  }
  const toSvg = (cx, cy) => {
    const b = svg.getBoundingClientRect();
    return [(cx - b.left) * (width / b.width), (cy - b.top) * (height / b.height)];
  };
  return { svg, vertexEls, point: (v) => P.get(v), toSvg, R };
}

VE.drawGraph = drawGraph;
})(globalThis.VE = globalThis.VE || {});
