// Hash tables with open addressing, for "hash-table" questions (pure, no DOM; also loaded by
// tools/grade.mjs).
//
// Problem fields:
//   "keys":    [18, 41, 22, 44]     distinct non-negative integers, inserted in this order
//   "size":    11                   table size m; the hash function is h(k) = k mod m
//   "probing": "linear" (default)   try h(k), h(k)+1, h(k)+2, ...            (mod m)
//            | "quadratic"          try h(k), h(k)+1², h(k)+2², ...          (mod m)
//            | "double"             try h(k), h(k)+h'(k), h(k)+2h'(k), ...   (mod m),
//                                   with h'(k) = q − (k mod q)
//   "q":       7                    for double hashing (default: the largest prime below m)
//
// A collision is counted every time a key is sent to a cell that is already occupied, so a key
// that needs 3 tries causes 2 collisions.
(function (VE) {
'use strict';

const PROBING = { linear: 'linear probing', quadratic: 'quadratic probing', double: 'double hashing' };

function isPrime(x) {
  if (x < 2) return false;
  for (let d = 2; d * d <= x; d++) if (x % d === 0) return false;
  return true;
}
function largestPrimeBelow(m) {
  for (let x = m - 1; x >= 2; x--) if (isPrime(x)) return x;
  return 1;
}

function settings(problem) {
  const keys = problem.keys;
  if (!Array.isArray(keys) || !keys.length || keys.some((k) => !Number.isInteger(k) || k < 0)) {
    throw new Error('"keys" must be a list of non-negative whole numbers');
  }
  if (new Set(keys).size !== keys.length) throw new Error('the keys must all be different');
  const size = problem.size;
  if (!Number.isInteger(size) || size < 2) throw new Error('"size" (the table size m) must be a whole number ≥ 2');
  if (keys.length > size) throw new Error(`${keys.length} keys do not fit in a table of size ${size}`);
  const probing = problem.probing ?? 'linear';
  if (!PROBING[probing]) throw new Error(`"probing" must be "linear", "quadratic" or "double", not "${probing}"`);
  const q = probing === 'double' ? (problem.q ?? largestPrimeBelow(size)) : null;
  if (probing === 'double' && (!Number.isInteger(q) || q < 1 || q >= size)) throw new Error('"q" must be a whole number between 1 and the table size − 1');
  return { keys: keys.slice(), size, probing, q };
}

/** { table: [key or null], collisions, steps: [{ key, home, tried: [cells], cell, collisions, h2 }] } */
function simulate(problem) {
  const { keys, size: m, probing, q } = settings(problem);
  const table = Array(m).fill(null);
  const steps = [];
  let collisions = 0;
  for (const key of keys) {
    const home = key % m;
    const h2 = probing === 'double' ? q - (key % q) : null;
    const tried = [];
    let cell = null;
    for (let j = 0; j < m; j++) {
      const pos = probing === 'linear' ? (home + j) % m
        : probing === 'quadratic' ? (home + j * j) % m
        : (home + j * h2) % m;
      tried.push(pos);
      if (table[pos] == null) { cell = pos; break; }
    }
    if (cell == null) {
      throw new Error(`key ${key} cannot be placed: ${PROBING[probing]} tried ${m} cells without finding a free one`
        + (probing === 'quadratic' ? ' (with quadratic probing, keep the table at most half full and m prime)' : '')
        + (probing === 'double' ? ' (choose q so that every step h\'(k) is coprime with m, e.g. m prime)' : ''));
    }
    table[cell] = key;
    collisions += tried.length - 1;
    steps.push({ key, home, tried, cell, collisions: tried.length - 1, h2 });
  }
  return { table, collisions, steps };
}

/** A number not among the keys, to illustrate k mod m without giving anything away. */
function exampleKey(problem) {
  const { keys, size } = settings(problem);
  let x = 4 * size + 3;
  while (keys.includes(x)) x++;
  return x;
}

/** HTML for the information box: the hash function, the mod operation, probing, collisions. */
function infoHtml(problem) {
  const { size: m, probing, q } = settings(problem);
  const ex = exampleKey(problem);
  const parts = [
    `<div class="ht-formula">h(k) = k mod ${m}</div>`,
    `<p><strong>k mod ${m}</strong> is the remainder of the division of k by ${m}. For example, `
      + `${ex} mod ${m} = ${ex % m}, because ${ex} = ${Math.floor(ex / m)} × ${m} + ${ex % m}. `
      + `The table has ${m} cells, numbered 0 to ${m - 1}.</p>`,
  ];
  if (probing === 'linear') {
    parts.push(`<p><strong>Linear probing:</strong> if cell h(k) is taken, try h(k) + 1, h(k) + 2, … `
      + `(mod ${m}, so after cell ${m - 1} comes cell 0) until a free cell is found.</p>`);
  } else if (probing === 'quadratic') {
    parts.push(`<p><strong>Quadratic probing:</strong> if cell h(k) is taken, try (h(k) + 1²) mod ${m}, `
      + `(h(k) + 2²) mod ${m}, (h(k) + 3²) mod ${m}, … until a free cell is found.</p>`);
  } else {
    parts.push(`<p><strong>Double hashing:</strong> with the second hash function h′(k) = ${q} − (k mod ${q}), `
      + `if cell h(k) is taken, try (h(k) + h′(k)) mod ${m}, (h(k) + 2·h′(k)) mod ${m}, … until a free cell is found.</p>`);
  }
  parts.push(`<p>Under every key you see its h(k)${probing === 'double' ? ' and h′(k)' : ''}.</p>`);
  parts.push('<p><strong>Collisions:</strong> count one every time a key is sent to a cell that is already taken '
    + '(a key that needs three tries causes two collisions).</p>');
  return parts.join('');
}

function defaultPrompt(problem) {
  const { size: m, probing } = settings(problem);
  return `<p>Insert the keys, in the order given, into a hash table of size <strong>${m}</strong> with `
    + `h(k) = k mod ${m} and <strong>${PROBING[probing]}</strong>. Show where every key ends up, and give `
    + 'the total number of collisions.</p>';
}

VE.hashTable = { PROBING, settings, simulate, infoHtml, defaultPrompt, largestPrimeBelow };
})(globalThis.VE = globalThis.VE || {});
