// Big-O engine, copied unchanged from the COMP 352 web app BigO_Quiz.html (lines 154-679 there).
// A safe formula reader (no eval), evaluation that does not overflow (log-domain numbers for 2^n, n!,
// n = 10^300), the definitions of O / Omega / Theta checked for every n >= n0 with the first
// counterexample, the limit of f/g, the best constants and an SVG plotter.
// It defines globalThis.BigO; the last lines also make it available as VE.bigO.
/* COMP 352 · Big-O engine shared by the three asymptotic-notation apps.
   - a small, safe formula reader for f(n) (no eval): numbers, n, + − · /, ^, !, log (base 2), lg, ln, log10, sqrt,
     implicit multiplication (3n², n log n) and unicode (², ³, ⁿ, ·, ×, −, √)
   - evaluation in doubles, falling back to log-domain numbers so 2ⁿ, n! and n = 10³⁰⁰ never overflow
   - check(rel, f, g, c, n0): is f(n) ≤ c·g(n) (O), ≥ (Ω), or c1·g ≤ f ≤ c2·g (Θ) for every n ≥ n0? first counterexample
   - bestC / smallestN0 / limit of f/g (0, a constant, ∞) and a light SVG plotter */
(function (root) {
  'use strict';
  const LN2 = Math.LN2, LN10 = Math.LN10;

  /* ---------- log-domain numbers: value = s · e^l ---------- */
  const Z = { s: 0, l: -Infinity }, NAN = { s: NaN, l: NaN };
  const mk = (s, l) => (s === 0 || l === -Infinity) ? Z : (Number.isNaN(s) || Number.isNaN(l)) ? NAN : { s, l };
  const isBad = a => Number.isNaN(a.s);
  function L(x) { if (Number.isNaN(x)) return NAN; return x === 0 ? Z : mk(Math.sign(x), Math.log(Math.abs(x))); }
  function toNum(a) { return isBad(a) ? NaN : a.s === 0 ? 0 : a.s * Math.exp(a.l); }
  function mul(a, b) { if (isBad(a) || isBad(b)) return NAN; return (a.s === 0 || b.s === 0) ? Z : mk(a.s * b.s, a.l + b.l); }
  function div(a, b) { if (isBad(a) || isBad(b) || b.s === 0) return NAN; return a.s === 0 ? Z : mk(a.s * b.s, a.l - b.l); }
  function neg(a) { return (isBad(a) || a.s === 0) ? a : mk(-a.s, a.l); }
  function add(a, b) {
    if (isBad(a) || isBad(b)) return NAN;
    if (a.s === 0) return b; if (b.s === 0) return a;
    if (a.l < b.l) { const t = a; a = b; b = t; }
    const d = b.l - a.l;
    if (a.s === b.s) return mk(a.s, a.l + Math.log1p(Math.exp(d)));
    if (d === 0) return Z;
    return mk(a.s, a.l + Math.log(-Math.expm1(d)));
  }
  const sub = (a, b) => add(a, neg(b));
  function powL(a, b) {                      // a^b; b a log-domain number or {exact: double}
    if (isBad(a) || (b.exact === undefined && isBad(b))) return NAN;
    const e = b.exact !== undefined ? b.exact : toNum(b);
    if (!Number.isFinite(e)) { if (a.s > 0 && a.l > 0 && e > 0) return { s: 1, l: Infinity }; if (a.s > 0 && e > 0) return Z; return NAN; }
    if (a.s === 0) return e > 0 ? Z : NAN;
    if (a.s < 0 && !Number.isInteger(e)) return NAN;
    const s = a.s < 0 && Math.abs(e % 2) === 1 ? -1 : 1;
    return mk(s, e * a.l);
  }
  const LG = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
              12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  function lgamma(x) {
    if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lgamma(1 - x);
    x -= 1; let a = LG[0]; const t = x + 7.5;
    for (let i = 1; i < 9; i++) a += LG[i] / (x + i);
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
  }
  // -1, 0, 1 with a relative tolerance (equal counts as satisfying ≤ and ≥); the tolerance grows with the rounding
  // noise of the logs, so 2^(n+1) vs 2·2^n at n = 10^13 still counts as equal
  const noise = (...xs) => Math.max(1e-11, 2e-15 * Math.max(...xs.map(x => (x && Number.isFinite(x.l)) ? Math.abs(x.l) : 0)));
  const UNRELIABLE = 1e11;                     // |log value| beyond this: doubles cannot resolve a factor of 1.0002
  const unreliable = (...xs) => xs.some(x => x && x.s !== 0 && Math.abs(x.l) > UNRELIABLE);
  function cmpL(a, b) {
    if (isBad(a) || isBad(b)) return NaN;
    if (a.s !== b.s) return a.s < b.s ? -1 : 1;
    if (a.s === 0) return 0;
    const d = a.l - b.l;
    if (Math.abs(d) < noise(a, b) || (a.l === b.l)) return 0;
    return a.s > 0 ? Math.sign(d) : -Math.sign(d);
  }

  /* ---------- parser ---------- */
  const FUNCS = { log: 'log2', lg: 'log2', log2: 'log2', ln: 'ln', log10: 'log10', sqrt: 'sqrt' };
  function normalize(s) {
    return String(s).replace(/[−–—]/g, '-').replace(/[·×∙⋅*]/g, '*').replace(/÷/g, '/')
      .replace(/²/g, '^2').replace(/³/g, '^3').replace(/⁴/g, '^4').replace(/ⁿ/g, '^n').replace(/√/g, ' sqrt ')
      .replace(/log\s*_\s*\{?\s*2\s*\}?/g, 'log2').replace(/log\s*_\s*\{?\s*10\s*\}?/g, 'log10').replace(/log₂/g, 'log2').replace(/log₁₀/g, 'log10')
      .replace(/\*\*/g, '^');
  }
  function tokenize(src) {
    const s = normalize(src), out = [];
    let i = 0;
    while (i < s.length) {
      const ch = s[i];
      if (/\s/.test(ch)) { i++; continue; }
      if (/[0-9.]/.test(ch)) {
        const m = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(s.slice(i)); if (!m) throw new Error(`cannot read the number at “${s.slice(i, i + 6)}”`);
        out.push({ t: 'num', v: parseFloat(m[0]) }); i += m[0].length; continue;
      }
      if (/[a-z]/i.test(ch)) {          // names are read greedily: "nlogn" = n log n, "logn" = log n, "lnn" = ln n
        const rest = s.slice(i).toLowerCase();
        const nm = ['log10', 'log2', 'sqrt', 'log', 'lg', 'ln'].find(w => rest.startsWith(w));
        if (nm) { out.push({ t: 'fn', f: FUNCS[nm] }); i += nm.length; continue; }
        if (rest[0] === 'n') { out.push({ t: 'n' }); i += 1; continue; }
        const m = /^[a-z]+/i.exec(s.slice(i));
        throw new Error(`unknown name “${m[0]}” — use n, log, ln, sqrt`);
      }
      if ('+-*/^()!'.includes(ch)) { out.push({ t: ch }); i++; continue; }
      throw new Error(`unexpected “${ch}”`);
    }
    return out;
  }
  function parse(src) {
    const tk = tokenize(src); let p = 0;
    if (!tk.length) throw new Error('empty formula');
    const peek = () => tk[p], eat = t => { if (tk[p] && tk[p].t === t) { p++; return true; } return false; };
    const startsPrimary = x => x && (x.t === 'num' || x.t === 'n' || x.t === 'fn' || x.t === '(');
    function expr() {
      let a = term();
      for (;;) { if (eat('+')) a = { t: 'add', a, b: term() }; else if (eat('-')) a = { t: 'sub', a, b: term() }; else return a; }
    }
    function term(fnArg) {
      let a = unary();
      for (;;) {
        const x = peek();
        if (!fnArg && x && x.t === '*') { p++; a = { t: 'mul', a, b: unary() }; }
        else if (!fnArg && x && x.t === '/') { p++; a = { t: 'div', a, b: unary() }; }
        else if (startsPrimary(x) && !(fnArg && x.t === 'fn')) a = { t: 'mul', a, b: power() };   // implicit ×
        else return a;
      }
    }
    function unary() { if (eat('-')) return { t: 'neg', a: unary() }; if (eat('+')) return unary(); return power(); }
    function power() { const b = postfix(); if (eat('^')) return { t: 'pow', a: b, b: unary() }; return b; }
    function postfix() { let a = primary(); while (eat('!')) a = { t: 'fact', a }; return a; }
    function primary() {
      const x = tk[p];
      if (!x) throw new Error('the formula ends too early');
      if (x.t === 'num') { p++; return { t: 'num', v: x.v }; }
      if (x.t === 'n') { p++; return { t: 'n' }; }
      if (x.t === 'fn') {
        p++;
        if (peek() && peek().t === '^') {                    // log^2 n = (log n)^2
          p++; const e = postfix();
          const inner = peek() && peek().t === '(' ? (p++, (() => { const a = expr(); if (!eat(')')) throw new Error('missing “)”'); return a; })()) : term(true);
          return { t: 'pow', a: { t: 'fn', f: x.f, a: inner }, b: e };
        }
        if (peek() && peek().t === '(') { p++; const a = expr(); if (!eat(')')) throw new Error('missing “)”'); return postfixOn({ t: 'fn', f: x.f, a }); }
        return { t: 'fn', f: x.f, a: term(true) };              // log 2n = log(2n); log n · n = (log n)·n
      }
      if (x.t === '(') { p++; const a = expr(); if (!eat(')')) throw new Error('missing “)”'); return a; }
      throw new Error(`unexpected “${x.t}”`);
    }
    function postfixOn(a) { while (eat('!')) a = { t: 'fact', a }; return a; }
    const ast = expr();
    if (p < tk.length) throw new Error(`unexpected “${tk[p].t === 'num' ? tk[p].v : tk[p].t}”`);
    return ast;
  }
  const usesN = a => !!a && (a.t === 'n' || ['a', 'b'].some(k => a[k] && usesN(a[k])));

  /* ---------- evaluation ---------- */
  function factD(x) {
    if (x < 0 || Number.isNaN(x)) return NaN;
    if (Number.isInteger(x) && x <= 170) { let r = 1; for (let k = 2; k <= x; k++) r *= k; return r; }
    return x > 171 ? Infinity : Math.exp(lgamma(x + 1));
  }
  function evD(a, n) {
    switch (a.t) {
      case 'num': return a.v;
      case 'n': return n;
      case 'add': return evD(a.a, n) + evD(a.b, n);
      case 'sub': return evD(a.a, n) - evD(a.b, n);
      case 'mul': return evD(a.a, n) * evD(a.b, n);
      case 'div': { const d = evD(a.b, n); return d === 0 ? NaN : evD(a.a, n) / d; }
      case 'neg': return -evD(a.a, n);
      case 'pow': return Math.pow(evD(a.a, n), evD(a.b, n));
      case 'fact': return factD(evD(a.a, n));
      case 'fn': {
        const x = evD(a.a, n);
        if (a.f === 'sqrt') return x < 0 ? NaN : Math.sqrt(x);
        if (!(x > 0)) return NaN;
        return a.f === 'log2' ? Math.log2(x) : a.f === 'ln' ? Math.log(x) : Math.log10(x);
      }
    }
    return NaN;
  }
  function evLn(a, n) {
    const d = typeof n === 'number' ? evD(a, n) : NaN;                                  // exact doubles for every part that fits (keeps 2^(n+1) exact)
    if (Number.isFinite(d) && Math.abs(d) < 1e290) return L(d);
    switch (a.t) {
      case 'num': return L(a.v);
      case 'n': return typeof n === 'number' ? L(n) : n;
      case 'add': return add(evLn(a.a, n), evLn(a.b, n));
      case 'sub': return sub(evLn(a.a, n), evLn(a.b, n));
      case 'mul': return mul(evLn(a.a, n), evLn(a.b, n));
      case 'div': return div(evLn(a.a, n), evLn(a.b, n));
      case 'neg': return neg(evLn(a.a, n));
      case 'pow': {                                        // exponent as an exact double whenever possible
        const e = typeof n === 'number' ? evD(a.b, n) : NaN;
        return powL(evLn(a.a, n), Number.isFinite(e) ? { exact: e } : evLn(a.b, n));
      }
      case 'fact': { const xd = typeof n === 'number' ? evD(a.a, n) : NaN, x = Number.isFinite(xd) ? xd : toNum(evLn(a.a, n)); if (!(x >= 0)) return NAN; return { s: 1, l: lgamma(x + 1) }; }
      case 'fn': {
        const x = evLn(a.a, n);
        if (a.f === 'sqrt') return x.s < 0 ? NAN : x.s === 0 ? Z : { s: 1, l: x.l / 2 };
        if (!(x.s > 0)) return NAN;
        return L(a.f === 'log2' ? x.l / LN2 : a.f === 'ln' ? x.l : x.l / LN10);
      }
    }
    return NAN;
  }
  // value of a formula at n as a log-domain number (exact doubles whenever they suffice)
  function ev(a, n) {
    if (typeof n !== 'number') return evLn(a, n);
    const d = evD(a, n);
    if (Number.isFinite(d) && Math.abs(d) < 1e290) return L(d);
    return evLn(a, n);
  }
  const evNum = (a, n) => { const d = evD(a, n); return Number.isFinite(d) ? d : toNum(evLn(a, n)); };

  /* ---------- pretty printing ---------- */
  const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '-': '⁻', n: 'ⁿ', '.': '·' };
  const PREC = { add: 1, sub: 1, mul: 2, div: 2, neg: 3, pow: 4, fact: 5, fn: 5, num: 6, n: 6 };
  function numTxt(v) { return Number.isInteger(v) ? String(v) : String(+v.toPrecision(6)); }
  function show(a, html) {
    const nv = html ? '<i>n</i>' : 'n';
    const wrap = (s) => `(${s})`;
    const sub_ = (x, minPrec) => (PREC[x.t] < minPrec ? wrap(show(x, html)) : show(x, html));
    const isSimpleArg = x => x.t === 'n';
    const startsWithFn = x => x.t === 'fn' || ((x.t === 'mul' || x.t === 'div' || x.t === 'pow') && startsWithFn(x.a));
    const startsWithN = x => x.t === 'n' || (x.t === 'fact' && x.a.t === 'n') || ((x.t === 'mul' || x.t === 'div' || x.t === 'pow') && startsWithN(x.a));
    switch (a.t) {
      case 'num': return numTxt(a.v);
      case 'n': return nv;
      case 'add': return `${show(a.a, html)} + ${a.b.t === 'neg' ? wrap(show(a.b, html)) : show(a.b, html)}`;
      case 'sub': return `${show(a.a, html)} − ${sub_(a.b, 2)}`;
      case 'neg': return `−${sub_(a.a, 3)}`;
      case 'mul': {
        const l = a.a.t === 'div' ? wrap(show(a.a, html)) : sub_(a.a, 2), r = sub_(a.b, 3);
        if (a.b.t === 'fn' && a.b.f === 'sqrt' && a.a.t !== 'fn') return `${l}${r}`;
        if (startsWithFn(a.b) && PREC[a.b.t] >= 2) return `${l} ${r}`;
        if (a.a.t === 'num' && (startsWithN(a.b) || PREC[a.b.t] < 3 || a.b.t === 'fn')) return `${l}${r}`;
        if (a.a.t !== 'num' && a.b.t === 'pow' && a.b.a.t !== 'num') return `${l}${r}`;
        if (a.a.t === 'n' && PREC[a.b.t] < 3) return `${l}${r}`;
        return `${l}·${r}`;
      }
      case 'div': return `${sub_(a.a, 2)}/${sub_(a.b, 3)}`;
      case 'pow': {
        const base = (a.a.t === 'num' || a.a.t === 'n') ? show(a.a, html) : wrap(show(a.a, html));
        if (html) return `${base}<sup>${show(a.b, html)}</sup>`;
        const e = show(a.b, false);
        return /^(-?[0-9]+|n)$/.test(e) ? base + e.split('').map(ch => SUP[ch] || ch).join('') : `${base}^${PREC[a.b.t] < 6 ? wrap(e) : e}`;
      }
      case 'fact': return `${PREC[a.a.t] < 6 ? wrap(show(a.a, html)) : show(a.a, html)}!`;
      case 'fn': {
        const name = a.f === 'log2' ? 'log' : a.f === 'ln' ? 'ln' : a.f === 'log10' ? (html ? 'log<sub>10</sub>' : 'log₁₀') : '√';
        if (a.f === 'sqrt') return (a.a.t === 'n' || a.a.t === 'num') ? `√${show(a.a, html)}` : `√${wrap(show(a.a, html))}`;
        return isSimpleArg(a.a) ? `${name} ${show(a.a, html)}` : `${name}${wrap(show(a.a, html))}`;
      }
    }
    return '?';
  }
  const text = a => show(a, false), html = a => show(a, true);

  /* ---------- number formatting ---------- */
  const supTxt = s => String(s).split('').map(ch => SUP[ch] || ch).join('');
  function fmtL(a, digits = 4) {
    if (isBad(a)) return 'undefined';
    if (a.s === 0) return '0';
    const e10 = a.l / LN10;
    if (e10 < 6.5 && e10 >= -3) return fmtNum(toNum(a), digits);
    if (!Number.isFinite(e10)) return a.s < 0 ? '−∞' : '∞';
    let ex = Math.floor(e10), m = Math.pow(10, e10 - ex);
    if (+m.toPrecision(3) >= 10) { m /= 10; ex += 1; }
    return `${a.s < 0 ? '−' : ''}${(+m.toPrecision(3))} × 10${supTxt(ex)}`;
  }
  function fmtNum(x, digits = 4) {
    if (Number.isNaN(x)) return 'undefined';
    if (!Number.isFinite(x)) return x < 0 ? '−∞' : '∞';
    if (Math.abs(x) >= 1e7 || (x !== 0 && Math.abs(x) < 1e-3)) return fmtL(L(x));
    if (Number.isInteger(x)) return x.toLocaleString('en-US').replace(/,/g, ' ');
    if (Math.abs(x) >= 1000) return Math.round(x).toLocaleString('en-US').replace(/,/g, ' ');
    return String(+x.toPrecision(digits));
  }
  const fmtN = n => (n < 1e7 ? fmtNum(Math.round(n)) : fmtL(L(n)));
  // a "nice" constant: 2 significant digits, rounded up (dir = 1) or down (dir = -1)
  function niceC(x, dir = 1, sig = 2) {
    if (!(x > 0) || !Number.isFinite(x)) return x;
    const e = Math.floor(Math.log10(x)) - (sig - 1), u = Math.pow(10, e);
    let v = (dir > 0 ? Math.ceil(x / u * (1 - 1e-12)) : Math.floor(x / u * (1 + 1e-12))) * u;
    if (dir < 0 && v <= 0) v = u;
    return +v.toPrecision(sig + 1);
  }

  /* ---------- the definitions ---------- */
  // condition at one n: returns {ok, side, fv, lo, hi} — side 'upper' (f > c2·g), 'lower' (f < c1·g) or 'undef'
  function condAt(rel, f, g, c1, c2, n) {
    const fv = ev(f, n), gv = ev(g, n);
    if (isBad(fv) || isBad(gv)) return { ok: false, side: 'undef', fv, gv };
    if (unreliable(fv, gv)) return { ok: true, skip: true, fv, gv };
    if (rel === 'O') { const hi = mul(L(c2), gv); return { ok: cmpL(fv, hi) <= 0, side: 'upper', fv, gv, hi }; }
    if (rel === 'Omega') { const lo = mul(L(c1), gv); return { ok: cmpL(fv, lo) >= 0, side: 'lower', fv, gv, lo }; }
    const lo = mul(L(c1), gv), hi = mul(L(c2), gv);
    if (cmpL(fv, lo) < 0) return { ok: false, side: 'lower', fv, gv, lo, hi };
    if (cmpL(fv, hi) > 0) return { ok: false, side: 'upper', fv, gv, lo, hi };
    return { ok: true, side: null, fv, gv, lo, hi };
  }
  // the n values we look at for "every n ≥ n0": every integer near n0, then a fine geometric sweep, then huge n
  const EXACT = 4000, TOP = 1e15;
  function scanPoints(n0) {
    const pts = [];
    const exact = n0 < 2 ** 52;
    if (exact) for (let k = 0; k <= EXACT; k++) pts.push(n0 + k); else pts.push(n0);
    let n = exact ? n0 + EXACT : n0;
    while (n < TOP) { n = Math.ceil(n * 1.004); pts.push(n); }
    for (let k = 16; k <= 300; k += k < 40 ? 2 : 20) pts.push(Math.pow(10, k));
    return pts;
  }
  // smallest integer in (lo, hi] where the condition fails, given it holds at lo and fails at hi
  function bisect(test, lo, hi) {
    for (let it = 0; it < 200 && hi - lo > 1 && hi > lo * (1 + 1e-15); it++) {
      const mid = hi - lo > 2 ** 52 ? Math.sqrt(lo * hi) : Math.floor((lo + hi) / 2);
      if (mid <= lo || mid >= hi) break;
      if (test(mid)) lo = mid; else hi = mid;
    }
    return hi;
  }
  // is the claim proved by these constants? {ok, bad: first counterexample n (or null), info at bad}
  function check(rel, f, g, c, n0, c2) {
    n0 = Math.max(1, Math.floor(n0));
    const c1 = c, cu = rel === 'Theta' ? c2 : c;
    const pts = scanPoints(n0);
    let prev = null;
    for (const n of pts) {
      const r = condAt(rel, f, g, c1, cu, n);
      if (r.skip) continue;
      if (!r.ok) {
        let nb = n;
        if (prev !== null && n - prev > 1) nb = bisect(m => condAt(rel, f, g, c1, cu, m).ok, prev, n);
        return Object.assign({ ok: false, bad: nb, exact: nb < 9e15 }, condAt(rel, f, g, c1, cu, nb));
      }
      prev = n;
    }
    // nothing broke up to 10^300: also make sure the limit of f/g agrees
    const lim = limit(f, g);
    const bad = (rel !== 'Omega' && lim.kind === 'inf') || (rel !== 'O' && lim.kind === 'zero') ||
                (lim.kind === 'const' && ((rel !== 'Omega' && lim.L > cu * (1 + lim.tol)) || (rel !== 'O' && lim.L < c1 * (1 - lim.tol))));
    return { ok: !bad, bad: null, beyond: bad, lim };
  }
  // limit of f(n)/g(n) as n → ∞: {kind: 'zero' | 'const' | 'inf' | 'unknown', L}
  function limit(f, g) {
    const lr = [], nz = [];
    const ladder = [1, 2, 4, 8, 16, 32, 64, 128, 256].map(k => Math.pow(10, k));
    for (let j = 9; j <= 42; j++) ladder.push({ s: 1, l: Math.pow(2, j) * LN10 });     // n = 10^512 … 10^(4·10^12)
    for (const n of ladder) {
      const fv = ev(f, n), gv = ev(g, n);
      if (isBad(fv) || isBad(gv) || fv.s <= 0 || gv.s <= 0) { if (typeof n !== 'number') break; if (lr.length) return { kind: 'unknown' }; continue; }
      if (unreliable(fv, gv)) break;
      lr.push(fv.l - gv.l); nz.push(noise(fv, gv));
    }
    if (lr.length < 3) return { kind: 'unknown' };
    lr.splice(0, Math.max(0, lr.length - 5)); nz.splice(0, Math.max(0, nz.length - 5));
    const d = []; for (let i = 1; i < lr.length; i++) d.push(lr[i] - lr[i - 1]);
    const last = d[d.length - 1], prev = d[d.length - 2], K = nz.length - 1;
    const epsL = Math.max(1e-9, 20 * (nz[K] + nz[K - 1])), epsP = Math.max(1e-6, 20 * (nz[K - 1] + nz[K - 2]));
    if (!Number.isFinite(lr[lr.length - 1])) return lr[lr.length - 1] > 0 ? { kind: 'inf' } : { kind: 'zero' };
    const tol = Math.max(1e-9, 50 * nz[K]);
    if (Math.abs(last) < epsL && Math.abs(prev) < epsP) return { kind: 'const', L: Math.exp(lr[lr.length - 1]), tol };
    const q = prev !== 0 ? last / prev : 1;
    if (q > 0 && q < 0.75 && Math.abs(last) < 0.1) {               // increments shrinking geometrically → converging
      const tail = last * q / (1 - q);
      return { kind: 'const', L: Math.exp(lr[lr.length - 1] + tail), tol: Math.max(tol, Math.abs(tail)) };
    }
    return last > 0 ? { kind: 'inf' } : { kind: 'zero' };
  }
  function truth(f, g) {           // which of O, Ω, Θ hold (from the limit of f/g)
    const lim = limit(f, g);
    const O = lim.kind === 'zero' || lim.kind === 'const', Om = lim.kind === 'inf' || lim.kind === 'const';
    return { O, Omega: Om, Theta: O && Om, lim };
  }
  // smallest c (O, rounded up) or largest c (Ω, rounded down) that works from n0 on; null if none
  function extremeRatio(f, g, n0, wantMax) {
    let best = wantMax ? -Infinity : Infinity;
    for (const n of scanPoints(Math.max(1, n0))) {
      const fv = ev(f, n), gv = ev(g, n);
      if (isBad(fv) || isBad(gv) || gv.s <= 0) return null;
      if (unreliable(fv, gv)) continue;
      const r = toNum(div(fv, gv));
      if (wantMax ? r > best : r < best) best = r;
    }
    const lim = limit(f, g);
    if (wantMax && lim.kind === 'inf') return null;
    if (!wantMax && lim.kind === 'zero') return null;
    if (lim.kind === 'const') best = wantMax ? Math.max(best, lim.L) : Math.min(best, lim.L);
    return best;
  }
  function bestC(rel, f, g, n0) {
    const r = bestC0(rel, f, g, n0);
    if (!r) return r;
    for (let k = 0; k < 6; k++) {
      if (check(rel, f, g, r.c, n0, r.c2).ok) return r;
      if (rel === 'O') r.c = niceC(r.c * 1.02, 1); else if (rel === 'Omega') r.c = niceC(r.c / 1.02, -1);
      else { r.c = niceC(r.c / 1.02, -1); r.c2 = niceC(r.c2 * 1.02, 1); }
    }
    return check(rel, f, g, r.c, n0, r.c2).ok ? r : null;
  }
  function bestC0(rel, f, g, n0) {
    if (rel === 'O') { const m = extremeRatio(f, g, n0, true); return m === null || !(m > 0) ? null : { c: niceC(m, 1) }; }
    if (rel === 'Omega') { const m = extremeRatio(f, g, n0, false); return m === null || !(m > 0) ? null : { c: niceC(m, -1) }; }
    const hi = extremeRatio(f, g, n0, true), lo = extremeRatio(f, g, n0, false);
    if (hi === null || lo === null || !(lo > 0)) return null;
    return { c: niceC(lo, -1), c2: niceC(hi, 1) };
  }
  // smallest n0 ≥ 1 from which the constants work; null if they never do
  function smallestN0(rel, f, g, c, c2) {
    const cu = rel === 'Theta' ? c2 : c;
    let lastBad = 0, prev = null, prevBad = false;
    for (const n of scanPoints(1)) {
      const rr = condAt(rel, f, g, c, cu, n);
      if (rr.skip) continue;
      const ok = rr.ok;
      if (!ok) { lastBad = n; prevBad = true; }
      else {
        if (prevBad && prev !== null && n - prev > 1) lastBad = bisect(m => !condAt(rel, f, g, c, cu, m).ok, prev, n) - 1;
        prevBad = false;
      }
      prev = n;
    }
    if (prevBad) return null;                       // still failing at 10^300
    const r = check(rel, f, g, c, lastBad + 1, c2);
    return r.ok ? lastBad + 1 : null;
  }

  /* ---------- SVG plot ---------- */
  const NS = 'http://www.w3.org/2000/svg';
  function el(tag, at = {}, parent) { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); if (parent) parent.append(e); return e; }
  function niceStep(span, target = 5) {
    const raw = span / target, p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p;
    return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
  }
  function tickLabel(v) {
    if (v === 0) return '0';
    const a = Math.abs(v);
    if (a >= 1e6 || a < 1e-3) { const e = Math.floor(Math.log10(a)), m = +(v / Math.pow(10, e)).toPrecision(2); return (m === 1 ? '' : m + '·') + '10' + supTxt(e); }
    if (a >= 1e4) return v.toLocaleString('en-US').replace(/,/g, ' ');
    return String(+v.toPrecision(4));
  }
  function vbox(svg) {
    const v = (svg.getAttribute('viewBox') || '0 0 900 420').trim().split(/[\s,]+/).map(Number);
    return { width: v[2] || 900, height: v[3] || 420 };
  }
  /* spec: {xmax, xlog, ylog, ymax, curves:[{fn, color, width, dash, id}], n0, band:{lo, hi, color}, bad:[n], marks:[{n, y, color, label}]}
     returns the scales so callers can hit-test pointer events */
  function plot(svg, spec) {
    const box = vbox(svg);
    const W = box.width, H = box.height, m = { l: 66, r: 18, t: 14, b: 40 };
    const pw = W - m.l - m.r, ph = H - m.t - m.b;
    const xmax = Math.max(2, spec.xmax), xlog = !!spec.xlog;
    const xs = []; const NS_ = 520;
    if (!xlog && xmax <= 320) for (let n = 1; n <= xmax; n++) xs.push(n);
    else for (let i = 0; i <= NS_; i++) xs.push(xlog ? Math.pow(xmax, i / NS_) : 1 + (xmax - 1) * i / NS_);
    const vals = spec.curves.map(c => xs.map(n => { const v = c.fn(n); return Number.isFinite(v) ? v : NaN; }));
    let ymax = spec.ymax, ymin = 0;
    if (!ymax) {
      let mx = 0; spec.curves.forEach((c, i) => { if (c.scale) vals[i].forEach(v => { if (v > mx) mx = v; }); });
      ymax = (mx > 0 ? mx : 1) * 1.35;
    }
    if (!(ymax < 1e300)) ymax = 1e300;
    const ylog = !!spec.ylog;
    if (ylog) {
      let mn = Infinity; spec.curves.forEach((c, i) => { if (c.scale) vals[i].forEach(v => { if (v > 0 && v < mn) mn = v; }); });
      ymin = Number.isFinite(mn) ? Math.max(mn / 2, 1e-300) : 0.5; ymax = Math.min(1e300, Math.max(ymax, ymin * 10));
    }
    const X = n => m.l + (xlog ? Math.log(n) / Math.log(xmax) : n / xmax) * pw;
    const Xinv = px => { const t = Math.min(1, Math.max(0, (px - m.l) / pw)); return xlog ? Math.pow(xmax, t) : t * xmax; };
    const Y = v => ylog ? m.t + ph - (Math.log(Math.max(v, ymin * 1e-3)) - Math.log(ymin)) / (Math.log(ymax) - Math.log(ymin)) * ph : m.t + ph - (v / ymax) * ph;
    const Yinv = py => { const t = (m.t + ph - py) / ph; return ylog ? Math.exp(Math.log(ymin) + t * (Math.log(ymax) - Math.log(ymin))) : t * ymax; };
    svg.textContent = '';
    const clipId = 'clip' + (svg.id || 'p');
    el('rect', { x: m.l, y: m.t, width: pw, height: ph }, el('clipPath', { id: clipId }, el('defs', {}, svg)));
    el('rect', { x: m.l, y: m.t, width: pw, height: ph, class: 'pl-bg' }, svg);
    // n < n0 is "don't care"
    if (spec.n0 && spec.n0 > (xlog ? 1 : 0)) {
      const x0 = Math.min(m.l + pw, X(Math.max(1, spec.n0)));
      el('rect', { x: m.l, y: m.t, width: Math.max(0, x0 - m.l), height: ph, class: 'pl-ignore' }, svg);
      if (x0 - m.l > 70) { const t = el('text', { x: m.l + 8, y: m.t + 16, class: 'pl-ignore-t' }, svg); t.textContent = 'n < n₀: ignored'; }
    }
    // grid + ticks
    const gx = el('g', { class: 'pl-grid' }, svg);
    if (xlog) { for (let e = 0, it = 0; Math.pow(10, e) <= xmax * 1.0001 && it < 40; e += Math.max(1, Math.ceil(Math.log10(xmax) / 7)), it++) { const v = Math.pow(10, e); const x = X(v); el('line', { x1: x, x2: x, y1: m.t, y2: m.t + ph }, gx); const t = el('text', { x, y: m.t + ph + 18, class: 'pl-tick', 'text-anchor': 'middle' }, svg); t.textContent = tickLabel(v); } }
    else { const st = niceStep(xmax, 8); for (let v = 0, it = 0; v <= xmax * (1 + 1e-12) && it < 40; v += st, it++) { const x = X(v); el('line', { x1: x, x2: x, y1: m.t, y2: m.t + ph }, gx); const t = el('text', { x, y: m.t + ph + 18, class: 'pl-tick', 'text-anchor': 'middle' }, svg); t.textContent = tickLabel(+v.toPrecision(12)); } }
    if (ylog) { const e0 = Math.ceil(Math.log10(ymin)), e1 = Math.floor(Math.log10(ymax)), stp = Math.max(1, Math.ceil((e1 - e0 + 1) / 6)); for (let e = e0, it = 0; e <= e1 && it < 40; e += stp, it++) { const y = Y(Math.pow(10, e)); el('line', { x1: m.l, x2: m.l + pw, y1: y, y2: y }, gx); const t = el('text', { x: m.l - 8, y: y + 4, class: 'pl-tick', 'text-anchor': 'end' }, svg); t.textContent = tickLabel(Math.pow(10, e)); } }
    else { const st = niceStep(ymax, 5); for (let v = 0, it = 0; v <= ymax * (1 + 1e-12) && it < 40; v += st, it++) { const y = Y(v); el('line', { x1: m.l, x2: m.l + pw, y1: y, y2: y }, gx); const t = el('text', { x: m.l - 8, y: y + 4, class: 'pl-tick', 'text-anchor': 'end' }, svg); t.textContent = tickLabel(+v.toPrecision(12)); } }
    el('line', { x1: m.l, x2: m.l + pw, y1: m.t + ph, y2: m.t + ph, class: 'pl-axis' }, svg);
    el('line', { x1: m.l, x2: m.l, y1: m.t, y2: m.t + ph, class: 'pl-axis' }, svg);
    const xl = el('text', { x: m.l + pw, y: m.t + ph + 34, class: 'pl-axlab', 'text-anchor': 'end' }, svg); xl.textContent = 'n →' + (xlog ? '  (log scale)' : '');
    const gc = el('g', { 'clip-path': `url(#${clipId})` }, svg);
    const pathOf = (arr, ok) => { let d = '', pen = false; arr.forEach((v, i) => { if (Number.isFinite(v) && (!ok || ok(i))) { const y = Math.max(m.t - 400, Math.min(m.t + ph + 400, Y(v))); d += (pen ? 'L' : 'M') + X(xs[i]).toFixed(1) + ' ' + y.toFixed(1); pen = true; } else pen = false; }); return d; };
    if (spec.band) {   // shade between two curves (Θ sandwich)
      const lo = xs.map(spec.band.lo), hi = xs.map(spec.band.hi);
      let d = ''; xs.forEach((n, i) => { if (Number.isFinite(hi[i])) d += (d ? 'L' : 'M') + X(n).toFixed(1) + ' ' + Math.max(m.t - 400, Y(hi[i])).toFixed(1); });
      for (let i = xs.length - 1; i >= 0; i--) if (Number.isFinite(lo[i])) d += 'L' + X(xs[i]).toFixed(1) + ' ' + Math.min(m.t + ph + 400, Y(Math.max(lo[i], ylog ? ymin * 1e-3 : -1e300))).toFixed(1);
      if (d) el('path', { d: d + 'Z', class: 'pl-band' }, gc);
    }
    const ids = {};
    spec.curves.forEach((c, i) => {
      const p = el('path', { d: pathOf(vals[i]), class: 'pl-curve ' + (c.cls || ''), stroke: c.color, 'stroke-width': c.width || 2.5, fill: 'none' }, gc);
      if (c.dash) p.setAttribute('stroke-dasharray', c.dash);
      ids[c.id || i] = p;
      if (c.dots && xs.length <= 60) xs.forEach((n, k) => { if (Number.isFinite(vals[i][k])) el('circle', { cx: X(n), cy: Y(vals[i][k]), r: 2.6, fill: c.color }, gc); });
    });
    // where the condition fails (n ≥ n0), overdraw f in red
    if (spec.badFn && spec.badCurve !== undefined) {
      const ci = spec.badCurve;
      el('path', { d: pathOf(vals[ci], i => xs[i] >= (spec.n0 || 1) && spec.badFn(xs[i])), class: 'pl-bad' }, gc);
    }
    if (spec.n0) {
      const x0 = X(Math.max(1, spec.n0));
      if (x0 <= m.l + pw + 1) {
        el('line', { x1: x0, x2: x0, y1: m.t, y2: m.t + ph, class: 'pl-n0' }, svg);
        const hd = el('g', { class: 'pl-n0h', transform: `translate(${x0} ${m.t + ph})` }, svg);
        el('rect', { x: -24, y: -22, width: 48, height: 20, rx: 10 }, hd);
        const t = el('text', { x: 0, y: -8, 'text-anchor': 'middle' }, hd); t.textContent = 'n₀ = ' + (spec.n0 < 1e5 ? spec.n0 : fmtN(spec.n0));
        hd.querySelector('rect').setAttribute('x', -Math.max(24, t.textContent.length * 3.6 + 8)); hd.querySelector('rect').setAttribute('width', 2 * Math.max(24, t.textContent.length * 3.6 + 8));
      }
    }
    (spec.marks || []).forEach(mk_ => {
      if (!(mk_.n <= xmax * 1.0001)) return;
      const x = X(mk_.n), y = Y(mk_.y), g = el('g', { class: 'pl-mark ' + (mk_.cls || '') }, svg);
      el('line', { x1: x, x2: x, y1: m.t, y2: m.t + ph, class: 'pl-markline' }, g);
      if (Number.isFinite(mk_.y)) el('circle', { cx: x, cy: Math.max(m.t, Math.min(m.t + ph, y)), r: 6 }, g);
      if (mk_.label) { const t = el('text', { x: x + (x > m.l + pw * 0.7 ? -10 : 10), y: m.t + 16 + (mk_.dy || 0), 'text-anchor': x > m.l + pw * 0.7 ? 'end' : 'start', class: 'pl-marklab' }, g); t.textContent = mk_.label; }
    });
    return { X, Xinv, Y, Yinv, m, pw, ph, W, H, xmax, ymax, ymin, xlog, ylog, ids };
  }
  // map a pointer event to the SVG's viewBox coordinates
  function svgPoint(svg, ev_) {
    const r = svg.getBoundingClientRect(), vb = vbox(svg);
    const sx = vb.width / (r.width || vb.width), sy = vb.height / (r.height || vb.height);
    const s = Math.max(sx, sy);                                    // preserveAspectRatio meet
    const ox = (r.width * s - vb.width) / 2, oy = (r.height * s - vb.height) / 2;
    return { x: (ev_.clientX - r.left) * s - ox, y: (ev_.clientY - r.top) * s - oy };
  }

  const API = { parse, text, html, ev, evNum, toNum, L, cmpL, condAt, check, limit, truth, bestC, smallestN0, niceC, fmtNum, fmtL, fmtN, plot, svgPoint, usesN, lgamma, supTxt };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.BigO = API;
})(typeof window !== 'undefined' ? window : globalThis);
(function (VE) { VE.bigO = globalThis.BigO; })(globalThis.VE = globalThis.VE || {});
