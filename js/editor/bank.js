// Access to a problem bank folder from the editor. Layout, one subfolder per problem type:
//   problems/<type>/<name>.json    solutions/<type>/<name>.json    assets/...
// Uses the File System Access API (Chrome, Edge): the folder is opened once and files are read
// and saved in place. The folder handle is remembered in IndexedDB so "Reopen" works after a
// reload (the browser asks for permission again).
(function (VE) {
'use strict';

const supported = typeof window.showDirectoryPicker === 'function';
const IMAGE_RE = /\.(svg|png|jpe?g|gif|webp|avif|bmp)$/i;

// ---- tiny IndexedDB key/value store for the folder handle (best effort) -------------------
function idb(mode, fn) {
  return new Promise((resolve) => {
    let req;
    try { req = indexedDB.open('virtualexams-editor', 1); } catch { resolve(null); return; }
    req.onupgradeneeded = () => req.result.createObjectStore('kv');
    req.onerror = () => resolve(null);
    req.onsuccess = () => {
      try {
        const tx = req.result.transaction('kv', mode);
        const r = fn(tx.objectStore('kv'));
        tx.oncomplete = () => resolve(r && 'result' in r ? r.result : null);
        tx.onerror = () => resolve(null);
      } catch { resolve(null); }
    };
  });
}
const remember = (handle) => idb('readwrite', (s) => s.put(handle, 'bank'));
const remembered = () => idb('readonly', (s) => s.get('bank'));

async function subdir(root, name, create = false) {
  try { return await root.getDirectoryHandle(name, { create }); } catch (e) {
    if (!create && (e.name === 'NotFoundError' || e.name === 'TypeMismatchError')) return null;
    throw e;
  }
}

async function readText(dir, name) {
  try { return await (await (await dir.getFileHandle(name)).getFile()).text(); } catch (e) {
    if (e.name === 'NotFoundError') return null;
    throw e;
  }
}

async function writeFile(dir, name, data) {
  const fh = await dir.getFileHandle(name, { create: true });
  const w = await fh.createWritable();
  await w.write(data);
  await w.close();
}

class Bank {
  constructor(handle) { this.handle = handle; this.name = handle.name; }

  static get supported() { return supported; }

  /** Ask the user for a folder. Returns a Bank, or null if cancelled. */
  static async pick() {
    let handle;
    try { handle = await window.showDirectoryPicker({ id: 'virtualexams-bank', mode: 'readwrite' }); } catch (e) {
      if (e.name === 'AbortError') return null;
      throw e;
    }
    await remember(handle);
    return new Bank(handle);
  }

  /** The folder opened last time, if the browser still has it: { name, open() }. */
  static async previous() {
    const handle = await remembered();
    if (!handle || typeof handle.requestPermission !== 'function') return null;
    return {
      name: handle.name,
      async open() {
        if ((await handle.requestPermission({ mode: 'readwrite' })) !== 'granted') return null;
        return new Bank(handle);
      },
    };
  }

  /** All problems: [{ type, name, title, error? }] sorted by type, then name; plus the names of
   *  stray .json files lying directly in problems/ (they are ignored). */
  async list() {
    const out = [], stray = [];
    const dir = await subdir(this.handle, 'problems');
    if (!dir) return { problems: out, stray };
    for await (const [folder, h] of dir.entries()) {
      if (h.kind === 'file') { if (folder.endsWith('.json')) stray.push(folder); continue; }
      for await (const [file, fh] of h.entries()) {
        if (fh.kind !== 'file' || !file.endsWith('.json')) continue;
        const item = { type: folder, name: file.slice(0, -5), title: '' };
        try {
          const p = JSON.parse(await (await fh.getFile()).text());
          item.title = p.title || '';
          if (p.type !== folder) item.error = `the file says "type": "${p.type}" but it is in problems/${folder}/`;
        } catch (e) {
          item.error = `invalid JSON: ${e.message}`;
        }
        out.push(item);
      }
    }
    out.sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name));
    return { problems: out, stray };
  }

  async typeDir(root, type, create = false) {
    const r = await subdir(this.handle, root, create);
    return r && subdir(r, type, create);
  }

  async exists(type, name) {
    const dir = await this.typeDir('problems', type);
    return !!(dir && (await readText(dir, `${name}.json`)) != null);
  }

  /** { problem, solution } — solution is null when there is no solution file. */
  async load(type, name) {
    const pdir = await this.typeDir('problems', type);
    const text = pdir && (await readText(pdir, `${name}.json`));
    if (text == null) throw new Error(`problems/${type}/${name}.json not found`);
    const sdir = await this.typeDir('solutions', type);
    const stext = sdir && (await readText(sdir, `${name}.json`));
    return { problem: JSON.parse(text), solution: stext == null ? null : JSON.parse(stext) };
  }

  async save(type, name, problem, solution) {
    const json = (o) => JSON.stringify(o, null, 2) + '\n';
    await writeFile(await this.typeDir('problems', type, true), `${name}.json`, json(problem));
    await writeFile(await this.typeDir('solutions', type, true), `${name}.json`, json(solution));
  }

  /** Image files in assets/ (and one level of subfolders), as "assets/..." paths. */
  async assets() {
    const dir = await subdir(this.handle, 'assets');
    if (!dir) return [];
    const out = [];
    for await (const [name, h] of dir.entries()) {
      if (h.kind === 'file' && IMAGE_RE.test(name)) out.push(`assets/${name}`);
      else if (h.kind === 'directory') {
        for await (const [n2, h2] of h.entries()) if (h2.kind === 'file' && IMAGE_RE.test(n2)) out.push(`assets/${name}/${n2}`);
      }
    }
    return out.sort();
  }

  /** A File for an "assets/..." path, or null. */
  async asset(path) {
    const parts = path.replace(/^assets\//, '').split('/');
    let dir = await subdir(this.handle, 'assets');
    for (const p of parts.slice(0, -1)) dir = dir && (await subdir(dir, p));
    if (!dir) return null;
    try { return await (await dir.getFileHandle(parts[parts.length - 1])).getFile(); } catch { return null; }
  }

  async hasAsset(fileName) {
    const dir = await subdir(this.handle, 'assets');
    return !!(dir && (await dir.getFileHandle(fileName).then(() => true, () => false)));
  }

  /** Copies a picked file into assets/; returns its "assets/..." path. */
  async addAsset(file) {
    await writeFile(await subdir(this.handle, 'assets', true), file.name, file);
    return `assets/${file.name}`;
  }
}

VE.Bank = Bank;
VE.IMAGE_RE = IMAGE_RE;
})(globalThis.VE = globalThis.VE || {});
