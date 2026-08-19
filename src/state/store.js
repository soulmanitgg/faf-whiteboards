// Persistence adapter. In Electron it talks to the main process over IPC
// (window.faf, defined in preload.cjs). In a plain browser (vite dev without
// Electron) it falls back to localStorage + File System Access so the app
// still runs and can be developed outside the desktop shell.

const hasDesktop = typeof window !== 'undefined' && !!window.faf;

const LS_WORKSPACE = 'faf-boards:workspace';
const LS_SCENE = (id) => `faf-boards:scene:${id}`;

// ── Workspace (boards list, custom types, nextId) ──────────────────────────
export async function loadWorkspace() {
  if (hasDesktop) return window.faf.workspace.load();
  try {
    const raw = localStorage.getItem(LS_WORKSPACE);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export async function saveWorkspace(state) {
  if (hasDesktop) return window.faf.workspace.save(state);
  localStorage.setItem(LS_WORKSPACE, JSON.stringify(state));
  return true;
}

// ── Per-board scene (Excalidraw elements + appState + files) ───────────────
export async function loadScene(id) {
  if (hasDesktop) return window.faf.scene.load(id);
  try {
    const raw = localStorage.getItem(LS_SCENE(id));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export async function saveScene(id, scene) {
  if (hasDesktop) return window.faf.scene.save(id, scene);
  localStorage.setItem(LS_SCENE(id), JSON.stringify(scene));
  return true;
}

export async function deleteScene(id) {
  if (hasDesktop) return window.faf.scene.delete(id);
  localStorage.removeItem(LS_SCENE(id));
  return true;
}

// ── Export / import a single board file ────────────────────────────────────
export async function exportBoardFile({ suggestedName, scene }) {
  if (hasDesktop) return window.faf.board.export({ suggestedName, scene });
  // Browser fallback: trigger a download.
  const blob = new Blob([JSON.stringify(scene, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${(suggestedName || 'board')}.excalidraw`;
  a.click();
  URL.revokeObjectURL(a.href);
  return { canceled: false };
}

export async function importBoardFile() {
  if (hasDesktop) return window.faf.board.import();
  // Browser fallback: open a file picker.
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.excalidraw,.faf,.json,application/json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve({ canceled: true });
      const reader = new FileReader();
      reader.onload = () => {
        try {
          resolve({ canceled: false, data: JSON.parse(reader.result), fileName: file.name });
        } catch {
          resolve({ canceled: true, error: 'Invalid file' });
        }
      };
      reader.readAsText(file);
    };
    input.click();
  });
}

export async function exportPngFile({ suggestedName, dataUrl }) {
  if (hasDesktop) return window.faf.board.exportPng({ suggestedName, dataUrl });
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `${(suggestedName || 'board')}.png`;
  a.click();
  return { canceled: false };
}

// PDF bytes are built by the caller (jsPDF). Desktop saves via dialog; browser
// downloads directly.
export async function exportPdfFile({ suggestedName, base64, blob }) {
  if (hasDesktop) return window.faf.board.exportPdf({ suggestedName, base64 });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${(suggestedName || 'board')}.pdf`;
  a.click();
  URL.revokeObjectURL(a.href);
  return { canceled: false };
}

// ── Excalidraw reusable-shapes library (app-wide) ──────────────────────────
const LS_EXLIB = 'faf-boards:exlib';
export async function loadExLibrary() {
  if (hasDesktop) return window.faf.exlib.load();
  try { return JSON.parse(localStorage.getItem(LS_EXLIB) || '[]'); } catch { return []; }
}
export async function saveExLibrary(items) {
  if (hasDesktop) return window.faf.exlib.save(items);
  localStorage.setItem(LS_EXLIB, JSON.stringify(items || []));
  return true;
}

// ── Save many scenes at once (library import) ──────────────────────────────
export async function saveScenes(entries) {
  if (hasDesktop) return window.faf.scene.saveMany(entries);
  for (const [id, scene] of Object.entries(entries || {})) {
    localStorage.setItem(LS_SCENE(id), JSON.stringify(scene));
  }
  return true;
}

// ── Library folder location (desktop only) ─────────────────────────────────
export async function getDataDir() {
  if (hasDesktop) return window.faf.settings.getDataDir();
  return { dir: 'Browser storage (localStorage)', isDefault: true, unsupported: true };
}
export async function chooseDataDir() {
  if (hasDesktop) return window.faf.settings.chooseDataDir();
  return { canceled: true, unsupported: true };
}
export async function resetDataDir() {
  if (hasDesktop) return window.faf.settings.resetDataDir();
  return { unsupported: true };
}

// ── Whole-library bundle export / import ───────────────────────────────────
export async function exportLibrary(buildBundle) {
  if (hasDesktop) return window.faf.library.exportAll();
  // Browser: build the bundle here and download it.
  const bundle = await buildBundle();
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'faf-boards-library.faflib';
  a.click();
  URL.revokeObjectURL(a.href);
  return { canceled: false, count: (bundle.workspace?.boards || []).length };
}
export async function importLibrary() {
  if (hasDesktop) return window.faf.library.importAll();
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.faflib,.json,application/json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve({ canceled: true });
      const reader = new FileReader();
      reader.onload = () => {
        try { resolve({ canceled: false, bundle: JSON.parse(reader.result) }); }
        catch { resolve({ canceled: true, error: 'Invalid file' }); }
      };
      reader.readAsText(file);
    };
    input.click();
  });
}
