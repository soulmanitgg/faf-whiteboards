const { app, BrowserWindow, ipcMain, dialog, shell, session } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const http = require('node:http');
const fss = require('node:fs');

const isDev = process.env.NODE_ENV === 'development';

// ── Serve the built app from a local http origin ───────────────────────────
// Loading from file:// gives embedded YouTube players no valid origin (Error
// 152/153). A tiny 127.0.0.1 server gives the renderer a real http origin, so
// the clean embed player works — while staying fully local/offline.
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.gif': 'image/gif', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.txt': 'text/plain', '.map': 'application/json',
};
let appUrl = 'http://localhost:5173'; // dev default

function startStaticServer(rootDir) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
        if (urlPath === '/' || urlPath === '') urlPath = '/index.html';
        const safe = path.normalize(urlPath).replace(/^([\\/]|\.\.[\\/])+/, '');
        let filePath = path.join(rootDir, safe);
        if (!filePath.startsWith(rootDir)) { res.statusCode = 403; return res.end('forbidden'); }
        fss.stat(filePath, (err, st) => {
          if (err || !st.isFile()) filePath = path.join(rootDir, 'index.html'); // SPA fallback
          res.setHeader('Content-Type', MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream');
          fss.createReadStream(filePath).on('error', () => { res.statusCode = 500; res.end('err'); }).pipe(res);
        });
      } catch { res.statusCode = 500; res.end('err'); }
    });
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

// Atomic write: write to a temp file then rename, so a crash mid-write can't
// corrupt the existing file.
async function writeJsonAtomic(file, obj) {
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(obj, null, 2), 'utf8');
  await fs.rename(tmp, file);
}

async function readJson(file, fallback) {
  try {
    const raw = await fs.readFile(file, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return fallback;
    throw err;
  }
}

async function pathExists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

// ── Config (fixed location) points at the movable data directory ───────────
// Storing the data-dir choice here (not in the data dir itself) lets the user
// relocate their library into a cloud-synced folder (OneDrive/Dropbox/Drive).
const configFile = () => path.join(app.getPath('userData'), 'config.json');
let cachedConfig;
async function getConfig() {
  if (!cachedConfig) cachedConfig = await readJson(configFile(), {});
  return cachedConfig;
}
async function setConfig(patch) {
  cachedConfig = { ...(await getConfig()), ...patch };
  await writeJsonAtomic(configFile(), cachedConfig);
  return cachedConfig;
}

const defaultDataDir = () => path.join(app.getPath('userData'), 'data');
async function currentDataDir() {
  const c = await getConfig();
  return c.dataDir || defaultDataDir();
}

// Resolve the set of paths for the current data dir at call time.
async function paths() {
  const base = await currentDataDir();
  return {
    base,
    boards: path.join(base, 'boards'),
    state: path.join(base, 'workspace.json'),
    library: path.join(base, 'library.json'), // Excalidraw reusable-shapes library
  };
}

async function ensureDirs() {
  const p = await paths();
  await fs.mkdir(p.boards, { recursive: true });
  return p;
}

// A scene id must be a safe filename fragment (defends against path traversal).
async function sceneFile(id) {
  const safe = String(id).replace(/[^a-zA-Z0-9_-]/g, '');
  if (!safe) throw new Error('Invalid board id');
  const p = await paths();
  return path.join(p.boards, `${safe}.json`);
}

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 940,
    minHeight: 640,
    backgroundColor: '#07111f',
    show: false,
    title: 'FAF Whiteboards',
    icon: path.join(__dirname, '..', 'build', 'icon-source.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true, // in-app YouTube tutorial player runs in a <webview>
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());

  // Open external links in the system browser, never inside the app window.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.loadURL(appUrl);

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── IPC: workspace (boards list + custom types + settings) ─────────────────
ipcMain.handle('workspace:load', async () => {
  const p = await ensureDirs();
  return readJson(p.state, null);
});

ipcMain.handle('workspace:save', async (_e, state) => {
  const p = await ensureDirs();
  await writeJsonAtomic(p.state, state);
  return true;
});

// ── IPC: per-board scene (Excalidraw elements + appState) ──────────────────
ipcMain.handle('scene:load', async (_e, id) => {
  return readJson(await sceneFile(id), null);
});

ipcMain.handle('scene:save', async (_e, id, scene) => {
  await ensureDirs();
  await writeJsonAtomic(await sceneFile(id), scene);
  return true;
});

ipcMain.handle('scene:delete', async (_e, id) => {
  try {
    await fs.unlink(await sceneFile(id));
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
  return true;
});

// ── IPC: Excalidraw reusable-shapes library (app-wide, persisted) ──────────
ipcMain.handle('exlib:load', async () => {
  const p = await paths();
  return readJson(p.library, []);
});

ipcMain.handle('exlib:save', async (_e, items) => {
  const p = await ensureDirs();
  await writeJsonAtomic(p.library, items || []);
  return true;
});

// ── IPC: library folder location (cloud-sync enabler) ──────────────────────
ipcMain.handle('settings:getDataDir', async () => {
  const c = await getConfig();
  return { dir: await currentDataDir(), isDefault: !c.dataDir, defaultDir: defaultDataDir() };
});

ipcMain.handle('settings:chooseDataDir', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Choose your FAF Boards library folder',
    message: 'Pick a folder inside OneDrive/Dropbox/Google Drive to sync across PCs.',
    properties: ['openDirectory', 'createDirectory'],
  });
  if (canceled || !filePaths.length) return { canceled: true };
  const target = filePaths[0];
  const targetState = path.join(target, 'workspace.json');
  const adopting = await pathExists(targetState);

  if (!adopting) {
    // Empty target → migrate the current library into it.
    const cur = await paths();
    await fs.mkdir(path.join(target, 'boards'), { recursive: true });
    if (await pathExists(cur.state)) await fs.copyFile(cur.state, targetState);
    if (await pathExists(cur.library)) await fs.copyFile(cur.library, path.join(target, 'library.json'));
    if (await pathExists(cur.boards)) {
      for (const f of await fs.readdir(cur.boards)) {
        await fs.copyFile(path.join(cur.boards, f), path.join(target, 'boards', f)).catch(() => {});
      }
    }
  }
  await setConfig({ dataDir: target });
  return { canceled: false, dir: target, adopted: adopting };
});

ipcMain.handle('settings:resetDataDir', async () => {
  await setConfig({ dataDir: null });
  return { dir: defaultDataDir() };
});

// ── IPC: whole-library bundle export / import ──────────────────────────────
ipcMain.handle('library:exportAll', async () => {
  const p = await ensureDirs();
  const workspace = await readJson(p.state, { boards: [], customTypes: {} });
  const scenes = {};
  for (const b of workspace.boards || []) {
    const sf = await sceneFile(b.id);
    const sc = await readJson(sf, null);
    if (sc) scenes[b.id] = sc;
  }
  const bundle = { faf: 'library', version: 1, workspace, scenes };
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Entire Library',
    defaultPath: `faf-boards-library.faflib`,
    filters: [{ name: 'FAF Library', extensions: ['faflib', 'json'] }],
  });
  if (canceled || !filePath) return { canceled: true };
  await fs.writeFile(filePath, JSON.stringify(bundle, null, 2), 'utf8');
  return { canceled: false, filePath, count: (workspace.boards || []).length };
});

ipcMain.handle('library:importAll', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Library',
    properties: ['openFile'],
    filters: [{ name: 'FAF Library', extensions: ['faflib', 'json'] }],
  });
  if (canceled || !filePaths.length) return { canceled: true };
  const bundle = JSON.parse(await fs.readFile(filePaths[0], 'utf8'));
  return { canceled: false, bundle };
});

// Persist an imported/merged board's scene straight to disk (used during
// library import so the renderer can write many scenes).
ipcMain.handle('scene:saveMany', async (_e, entries) => {
  await ensureDirs();
  for (const [id, scene] of Object.entries(entries || {})) {
    await writeJsonAtomic(await sceneFile(id), scene);
  }
  return true;
});

// ── IPC: export / import a single board as a .excalidraw file ──────────────
ipcMain.handle('board:export', async (_e, { suggestedName, scene }) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Board',
    defaultPath: `${(suggestedName || 'board').replace(/[^a-zA-Z0-9 _-]/g, '')}.excalidraw`,
    filters: [
      { name: 'Excalidraw / FAF Board', extensions: ['excalidraw', 'faf'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  if (canceled || !filePath) return { canceled: true };
  await fs.writeFile(filePath, JSON.stringify(scene, null, 2), 'utf8');
  return { canceled: false, filePath };
});

ipcMain.handle('board:import', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Board',
    properties: ['openFile'],
    filters: [
      { name: 'Excalidraw / FAF Board', extensions: ['excalidraw', 'faf', 'json'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  if (canceled || !filePaths.length) return { canceled: true };
  const raw = await fs.readFile(filePaths[0], 'utf8');
  return { canceled: false, data: JSON.parse(raw), fileName: path.basename(filePaths[0]) };
});

// ── IPC: export the flattened PNG the renderer produced ────────────────────
ipcMain.handle('board:exportPng', async (_e, { suggestedName, dataUrl }) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export PNG',
    defaultPath: `${(suggestedName || 'board').replace(/[^a-zA-Z0-9 _-]/g, '')}.png`,
    filters: [{ name: 'PNG Image', extensions: ['png'] }],
  });
  if (canceled || !filePath) return { canceled: true };
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
  await fs.writeFile(filePath, Buffer.from(base64, 'base64'));
  return { canceled: false, filePath };
});

// ── IPC: export a PDF (bytes built by the renderer with jsPDF) ─────────────
ipcMain.handle('board:exportPdf', async (_e, { suggestedName, base64 }) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export PDF',
    defaultPath: `${(suggestedName || 'board').replace(/[^a-zA-Z0-9 _-]/g, '')}.pdf`,
    filters: [{ name: 'PDF Document', extensions: ['pdf'] }],
  });
  if (canceled || !filePath) return { canceled: true };
  await fs.writeFile(filePath, Buffer.from(base64, 'base64'));
  return { canceled: false, filePath };
});

// ── Open a .excalidraw/.faf file passed by the OS (double-click / "Open with") ──
function fileArgFromArgv(argv) {
  // The launched file path is a bare arg ending in one of our extensions.
  return argv.find((a) => /\.(excalidraw|faf)$/i.test(a)) || null;
}

let pendingOpenFile = null; // set if a file was requested before the UI is ready

async function openFilePath(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const payload = { data: JSON.parse(raw), fileName: path.basename(filePath) };
    if (mainWindow && !mainWindow.webContents.isLoading()) {
      mainWindow.webContents.send('open-file', payload);
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    } else {
      pendingOpenFile = payload; // deliver once the renderer signals ready
    }
  } catch (err) {
    // Malformed/unreadable file — ignore rather than crash.
  }
}

// The renderer calls this once it has mounted its open-file listener.
ipcMain.handle('app:ready-for-files', async () => {
  if (pendingOpenFile) {
    const p = pendingOpenFile;
    pendingOpenFile = null;
    return p;
  }
  return null;
});

// One-time migration: carry a library over from a previous brand name so a
// rename never looks like it lost the user's boards. Tries most-recent first;
// config.json (which may point at a custom/cloud library folder) is the key file.
async function migrateFromOldBrand() {
  const newRoot = app.getPath('userData'); // …/FAF Whiteboards
  const newData = path.join(newRoot, 'data');
  const newConfig = path.join(newRoot, 'config.json');
  const freshInstall = !(await pathExists(newData)) && !(await pathExists(newConfig));
  if (!freshInstall) return;

  const priorBrands = ['FAF Excalidraw', 'FAF Boards'];
  for (const brand of priorBrands) {
    const oldRoot = path.join(app.getPath('appData'), brand);
    if (oldRoot === newRoot || !(await pathExists(oldRoot))) continue;
    await fs.mkdir(newRoot, { recursive: true });
    const oldConfig = path.join(oldRoot, 'config.json');
    const oldData = path.join(oldRoot, 'data');
    if (await pathExists(oldConfig)) await fs.copyFile(oldConfig, newConfig).catch(() => {});
    if (await pathExists(oldData)) await fs.cp(oldData, newData, { recursive: true }).catch(() => {});
    break; // migrated from the most-recent prior brand that exists
  }
}

// Single-instance: a second launch (e.g. double-clicking another file) hands
// its argv to the running instance instead of opening a new window.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', (_e, argv) => {
    const f = fileArgFromArgv(argv);
    if (f) openFilePath(f);
    else if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus(); }
  });

  // macOS delivers file opens through this event.
  app.on('open-file', (e, filePath) => { e.preventDefault(); openFilePath(filePath); });

  app.whenReady().then(async () => {
    await migrateFromOldBrand();
    if (!isDev) {
      const server = await startStaticServer(path.join(__dirname, '..', 'dist'));
      appUrl = `http://127.0.0.1:${server.address().port}/`;
    }
    createWindow();
    const initialFile = fileArgFromArgv(process.argv);
    if (initialFile) openFilePath(initialFile);
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
