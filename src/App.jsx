import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import HomeLauncher from './components/HomeLauncher.jsx';
import HowToUse from './components/HowToUse.jsx';
import TemplatesScreen from './components/TemplatesScreen.jsx';
import LibraryScreen from './components/LibraryScreen.jsx';
import NewBoardModal from './components/NewBoardModal.jsx';
import Editor from './components/Editor.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import { DEFAULT_TYPES } from './data/boardTypes.js';
import * as store from './state/store.js';
import { uid, hashElements, uniqueTitle } from './utils.js';

// A fresh install starts with an empty library.
function seedBoards() {
  return [];
}

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [boards, setBoards] = useState([]);
  const [customTypes, setCustomTypes] = useState({});
  const [screen, setScreen] = useState('home');       // 'home' | 'boards' | 'tutorial'
  const [openBoardId, setOpenBoardId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPreset, setModalPreset] = useState({ type: 'whiteboard', tab: 'new' });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState(null);
  const [toast, setToast] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exLibrary, setExLibrary] = useState([]); // Excalidraw reusable-shapes library

  const allTypes = useMemo(() => ({ ...DEFAULT_TYPES, ...customTypes }), [customTypes]);
  const allTags = useMemo(() => {
    const s = new Set();
    boards.forEach((b) => (b.tags || []).forEach((t) => s.add(t)));
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [boards]);

  // ── Load workspace + Excalidraw library once ─────────────────────────────
  const loadWorkspaceState = useCallback(async () => {
    const ws = await store.loadWorkspace();
    if (ws && Array.isArray(ws.boards)) {
      setBoards(ws.boards);
      setCustomTypes(ws.customTypes || {});
    } else {
      setBoards(seedBoards());
      setCustomTypes({});
    }
  }, []);

  useEffect(() => {
    (async () => {
      await loadWorkspaceState();
      setExLibrary(await store.loadExLibrary());
      setLoaded(true);
    })();
  }, [loadWorkspaceState]);

  // ── Persist workspace on change (after initial load) ─────────────────────
  useEffect(() => {
    if (!loaded) return;
    store.saveWorkspace({ boards, customTypes, version: 1 });
  }, [boards, customTypes, loaded]);

  const flash = useCallback((msg) => {
    setToast(msg);
    window.clearTimeout(flash._t);
    flash._t = window.setTimeout(() => setToast(null), 2600);
  }, []);

  // ── Board actions ────────────────────────────────────────────────────────
  const createBoard = useCallback((type, title) => {
    const t = allTypes[type] ? type : 'whiteboard';
    const label = allTypes[t]?.label || 'Board';
    const board = {
      id: uid('brd'),
      title: (title || '').trim() || `${label} ${boards.length + 1}`,
      type: t,
      modified: Date.now(),
      createdAt: Date.now(),
    };
    setBoards((prev) => [board, ...prev]);
    setModalOpen(false);
    setOpenBoardId(board.id);
    return board;
  }, [allTypes, boards.length]);

  const createFromTemplate = useCallback(async (tpl) => {
    const elements = tpl.build ? tpl.build() : [];
    const title = uniqueTitle(tpl.name, boards.map((b) => b.title));
    const scene = { type: 'excalidraw', version: 2, elements, appState: { viewBackgroundColor: 'transparent' }, files: {} };
    const board = { id: uid('brd'), title, type: 'whiteboard', hash: hashElements(elements), modified: Date.now(), createdAt: Date.now() };
    await store.saveScene(board.id, scene);
    setBoards((prev) => [board, ...prev]);
    setScreen('home');
    setOpenBoardId(board.id);
  }, [boards]);

  const createCustomType = useCallback((def, boardName) => {
    const key = `custom_${(def.label || 'type').toLowerCase().replace(/\s+/g, '_')}_${uid('t')}`;
    setCustomTypes((prev) => ({ ...prev, [key]: { ...def, chipClass: 'chip-custom', custom: true } }));
    const board = {
      id: uid('brd'),
      title: (boardName || '').trim() || `${def.label} Board`,
      type: key,
      modified: Date.now(),
      createdAt: Date.now(),
    };
    setBoards((prev) => [board, ...prev]);
    setModalOpen(false);
    setOpenBoardId(board.id);
  }, []);

  const renameBoard = useCallback((id, title) => {
    setBoards((prev) => prev.map((b) => (b.id === id ? { ...b, title: title.trim() || b.title, modified: Date.now() } : b)));
  }, []);

  const touchBoard = useCallback((id, hash) => {
    setBoards((prev) => prev.map((b) => (b.id === id
      ? { ...b, modified: Date.now(), ...(hash ? { hash } : {}) }
      : b)));
  }, []);

  const setBoardTags = useCallback((id, tags) => {
    const clean = [...new Set((tags || []).map((t) => t.trim()).filter(Boolean))];
    setBoards((prev) => prev.map((b) => (b.id === id ? { ...b, tags: clean } : b)));
  }, []);

  const goToTag = useCallback((tag) => {
    setTagFilter(tag);
    setFilter('all');
    setScreen('boards');
  }, []);

  const saveExcalidrawLibrary = useCallback((items) => {
    setExLibrary(items);
    store.saveExLibrary(items);
  }, []);

  const changeBoardType = useCallback((id, newType) => {
    setBoards((prev) => prev.map((b) => (b.id === id ? { ...b, type: newType, modified: Date.now() } : b)));
  }, []);

  // Featured cover image for a board (small JPEG data URL, or null to reset).
  const setBoardCover = useCallback((id, cover) => {
    setBoards((prev) => prev.map((b) => (b.id === id ? { ...b, cover: cover || undefined } : b)));
  }, []);

  // Per-board background opacity (0–100), so a busy/animated canvas can be dialed down.
  const setBoardBgOpacity = useCallback((id, value) => {
    const v = Math.max(0, Math.min(100, Math.round(value)));
    setBoards((prev) => prev.map((b) => (b.id === id ? { ...b, bgOpacity: v } : b)));
  }, []);

  const deleteBoard = useCallback(async (id) => {
    setBoards((prev) => prev.filter((b) => b.id !== id));
    await store.deleteScene(id);
    if (openBoardId === id) setOpenBoardId(null);
    flash('Board deleted');
  }, [openBoardId, flash]);

  // Smart single-file import: skip exact-content duplicates, rename name clashes.
  const importBoard = useCallback(async () => {
    const res = await store.importBoardFile();
    if (res.canceled) return;
    const data = res.data || {};
    const elements = Array.isArray(data.elements) ? data.elements : [];
    const hash = hashElements(elements);

    if (boards.some((b) => b.hash === hash)) {
      flash('Already in your library — skipped duplicate');
      return;
    }
    const rawTitle = (res.fileName || 'Imported Board').replace(/\.(excalidraw|faf|json)$/i, '');
    const title = uniqueTitle(rawTitle, boards.map((b) => b.title));
    const scene = { type: 'excalidraw', version: 2, elements, appState: { viewBackgroundColor: 'transparent' }, files: data.files || {} };
    const board = { id: uid('brd'), title, type: 'whiteboard', hash, modified: Date.now(), createdAt: Date.now() };
    await store.saveScene(board.id, scene);
    setBoards((prev) => [board, ...prev]);
    flash(title === rawTitle ? 'Board imported' : `Imported as "${title}" (name existed)`);
    setOpenBoardId(board.id);
  }, [boards, flash]);

  // Open a .excalidraw/.faf handed to us by the OS (double-click / "Open with").
  // If we already have that exact board, just open it; otherwise add + open it.
  const openFileFromData = useCallback(async ({ data, fileName } = {}) => {
    const elements = Array.isArray(data?.elements) ? data.elements : [];
    const hash = hashElements(elements);
    const existing = boards.find((b) => b.hash === hash);
    if (existing) { setScreen('home'); setOpenBoardId(existing.id); flash(`Opened "${existing.title}"`); return; }
    const rawTitle = (fileName || 'Shared Board').replace(/\.(excalidraw|faf|json)$/i, '');
    const title = uniqueTitle(rawTitle, boards.map((b) => b.title));
    const scene = { type: 'excalidraw', version: 2, elements, appState: { viewBackgroundColor: 'transparent' }, files: data?.files || {} };
    const board = { id: uid('brd'), title, type: 'whiteboard', hash, modified: Date.now(), createdAt: Date.now() };
    await store.saveScene(board.id, scene);
    setBoards((prev) => [board, ...prev]);
    flash(`Opened "${title}"`);
    setOpenBoardId(board.id);
  }, [boards, flash]);

  // Register the OS file-open listener once; call the latest handler via a ref
  // so we don't re-subscribe (and duplicate opens) every time boards change.
  const openFileRef = useRef(null);
  openFileRef.current = openFileFromData;
  useEffect(() => {
    if (!window.faf?.onOpenFile) return;
    window.faf.onOpenFile((payload) => openFileRef.current?.(payload));
    window.faf.readyForFiles?.().then((payload) => { if (payload) openFileRef.current?.(payload); });
  }, []);

  // Import a whole-library bundle (.faflib): merge boards + custom types + scenes.
  const importLibrary = useCallback(async () => {
    const res = await store.importLibrary();
    if (res.canceled || !res.bundle) return;
    const { workspace = {}, scenes = {} } = res.bundle;
    const incoming = Array.isArray(workspace.boards) ? workspace.boards : [];
    const existingHashes = new Set(boards.map((b) => b.hash).filter(Boolean));
    const titles = boards.map((b) => b.title);
    const added = [];
    const sceneWrites = {};
    let skipped = 0;

    for (const src of incoming) {
      const scene = scenes[src.id];
      const hash = src.hash || (scene ? hashElements(scene.elements) : uid('h'));
      if (existingHashes.has(hash)) { skipped += 1; continue; }
      existingHashes.add(hash);
      const id = uid('brd');
      const title = uniqueTitle(src.title || 'Board', titles);
      titles.push(title);
      const board = { ...src, id, title, hash, modified: src.modified || Date.now(), createdAt: src.createdAt || Date.now() };
      added.push(board);
      if (scene) sceneWrites[id] = scene;
    }

    if (Object.keys(sceneWrites).length) await store.saveScenes(sceneWrites);
    if (workspace.customTypes) setCustomTypes((prev) => ({ ...workspace.customTypes, ...prev }));
    if (added.length) setBoards((prev) => [...added, ...prev]);
    flash(`Imported ${added.length} board${added.length !== 1 ? 's' : ''}${skipped ? `, skipped ${skipped} duplicate${skipped !== 1 ? 's' : ''}` : ''}`);
  }, [boards, flash]);

  // Export the whole library as a bundle.
  const exportLibrary = useCallback(async () => {
    const buildBundle = async () => {
      const scenes = {};
      for (const b of boards) {
        const sc = await store.loadScene(b.id);
        if (sc) scenes[b.id] = sc;
      }
      return { faf: 'library', version: 1, workspace: { boards, customTypes, version: 1 }, scenes };
    };
    const res = await store.exportLibrary(buildBundle);
    if (res && !res.canceled) flash(`Exported ${res.count ?? boards.length} boards`);
  }, [boards, customTypes, flash]);

  // Re-read everything from disk (after relocating the library folder).
  const reloadWorkspace = useCallback(async () => {
    await loadWorkspaceState();
    setExLibrary(await store.loadExLibrary());
    setOpenBoardId(null);
    flash('Library reloaded');
  }, [loadWorkspaceState, flash]);

  const openNewBoardModal = useCallback((type = 'whiteboard', tab = 'new') => {
    setModalPreset({ type, tab });
    setModalOpen(true);
  }, []);

  const currentBoard = boards.find((b) => b.id === openBoardId) || null;

  if (!loaded) {
    return <div className="boot-screen">Loading FAF Whiteboards…</div>;
  }

  return (
    <>
      <div className="app-shell">
        {screen === 'home' && (
          <HomeLauncher
            boardCount={boards.length}
            onNewBoard={openNewBoardModal}
            onTemplates={() => setScreen('templates')}
            onManageBoards={() => setScreen('boards')}
            onSettings={() => setSettingsOpen(true)}
            onTutorial={() => setScreen('tutorial')}
          />
        )}

        {screen === 'templates' && (
          <TemplatesScreen
            onHome={() => setScreen('home')}
            onPick={createFromTemplate}
          />
        )}

        {screen === 'tutorial' && (
          <HowToUse
            onHome={() => setScreen('home')}
            onNewBoard={openNewBoardModal}
            onManageBoards={() => setScreen('boards')}
          />
        )}

        {screen === 'boards' && (
          <LibraryScreen
            boards={boards}
            allTypes={allTypes}
            customTypes={customTypes}
            filter={filter}
            onFilter={setFilter}
            tagFilter={tagFilter}
            onTagFilter={setTagFilter}
            allTags={allTags}
            search={search}
            onSearch={setSearch}
            onOpenBoard={setOpenBoardId}
            onDeleteBoard={deleteBoard}
            onImport={importBoard}
            onHome={() => setScreen('home')}
            onNewBoard={() => openNewBoardModal()}
          />
        )}
      </div>

      {modalOpen && (
        <NewBoardModal
          allTypes={allTypes}
          preset={modalPreset}
          onClose={() => setModalOpen(false)}
          onCreate={createBoard}
          onCreateCustom={createCustomType}
        />
      )}

      {currentBoard && (
        <ErrorBoundary onReset={() => setOpenBoardId(null)}>
          <Editor
            key={currentBoard.id}
            board={currentBoard}
            type={allTypes[currentBoard.type] || DEFAULT_TYPES.whiteboard}
            allTypes={allTypes}
            allTags={allTags}
            exLibrary={exLibrary}
            onLibraryChange={saveExcalidrawLibrary}
            onClose={() => setOpenBoardId(null)}
            onRename={renameBoard}
            onTouch={touchBoard}
            onChangeType={changeBoardType}
            onSetCover={setBoardCover}
            onSetBgOpacity={setBoardBgOpacity}
            onSetTags={setBoardTags}
            onFlash={flash}
          />
        </ErrorBoundary>
      )}

      {settingsOpen && (
        <SettingsModal
          onClose={() => setSettingsOpen(false)}
          onReload={reloadWorkspace}
          onExportLibrary={exportLibrary}
          onImportLibrary={importLibrary}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
