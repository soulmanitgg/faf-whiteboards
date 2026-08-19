import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Excalidraw, exportToCanvas, serializeAsJSON } from '@excalidraw/excalidraw';
// Note: Excalidraw 0.17.x injects its own CSS from the JS bundle at runtime —
// there is no separate stylesheet to import.
import { asset, isDarkType } from '../data/boardTypes.js';
import BoardBackground from './BoardBackground.jsx';
import { buildCursorCss } from '../cursors.js';
import { hashElements } from '../utils.js';
import { jsPDF } from 'jspdf';
import * as store from '../state/store.js';

// Draw an image OR video frame to cover a w×h box (like CSS background-size: cover).
function drawCover(ctx, src, w, h) {
  const iw = src.videoWidth || src.naturalWidth || src.width;
  const ih = src.videoHeight || src.naturalHeight || src.height;
  if (!iw || !ih) return;
  const ir = iw / ih;
  const br = w / h;
  let dw, dh;
  if (ir > br) { dh = h; dw = h * ir; } else { dw = w; dh = w / ir; }
  ctx.drawImage(src, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

// Approximate the CSS "aurora" canvas as a static gradient for PNG/cover export.
function paintAurora(ctx, w, h) {
  ctx.fillStyle = '#0b1020';
  ctx.fillRect(0, 0, w, h);
  const blobs = [
    { x: 0.25, y: 0.35, r: 0.6, c: 'rgba(74,222,160,0.45)' },
    { x: 0.72, y: 0.30, r: 0.55, c: 'rgba(120,110,255,0.45)' },
    { x: 0.55, y: 0.78, r: 0.6, c: 'rgba(60,150,255,0.40)' },
  ];
  ctx.globalCompositeOperation = 'lighter';
  for (const b of blobs) {
    const g = ctx.createRadialGradient(b.x * w, b.y * h, 0, b.x * w, b.y * h, b.r * Math.max(w, h));
    g.addColorStop(0, b.c);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.globalCompositeOperation = 'source-over';
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Downscale any source (canvas or image) to a small 16:10 JPEG data URL for use
// as a board cover thumbnail — keeps stored covers tiny (~20-40KB).
function toCoverDataUrl(source) {
  const W = 480, H = 300;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#0b1017';
  ctx.fillRect(0, 0, W, H);
  drawCover(ctx, source, W, H);
  return c.toDataURL('image/jpeg', 0.72);
}

export default function Editor({ board, type, allTypes, allTags = [], exLibrary, onLibraryChange, onClose, onRename, onTouch, onChangeType, onSetCover, onSetBgOpacity, onSetTags, onFlash }) {
  const [api, setApi] = useState(null);
  const [initial, setInitial] = useState(undefined); // undefined = loading
  const [title, setTitle] = useState(board.title);
  const [coverMenu, setCoverMenu] = useState(false);
  const [bgMenu, setBgMenu] = useState(false);
  const [tagMenu, setTagMenu] = useState(false);
  const [shareMenu, setShareMenu] = useState(false);
  const [newTag, setNewTag] = useState('');
  const boardTags = board.tags || [];
  const [activeTool, setActiveTool] = useState('selection');
  const activeToolRef = useRef('selection');
  const bgOpacity = board.bgOpacity ?? 100; // 0–100

  // Inject the outlined-cursor stylesheet once (shared across all editors).
  useEffect(() => {
    if (document.getElementById('faf-cursor-style')) return;
    const s = document.createElement('style');
    s.id = 'faf-cursor-style';
    s.textContent = buildCursorCss();
    document.head.appendChild(s);
  }, []);
  const saveTimer = useRef(null);
  const latest = useRef(null);     // most recent {elements, appState, files, dirty}
  const contentSig = useRef(null); // signature of last-known element content
  const lastCoverTs = useRef(0);   // throttle auto-cover generation
  const genCoverRef = useRef(null);
  const dark = isDarkType(type);

  // A cheap signature of drawn content: count + summed element versions.
  // Changes only when elements are actually added/edited/deleted — not when
  // Excalidraw fires onChange for scroll/zoom/font settling on open.
  const signature = (elements) =>
    `${elements.length}:${elements.reduce((a, e) => a + (e.version || 0), 0)}`;

  // Load this board's saved scene once.
  useEffect(() => {
    let alive = true;
    (async () => {
      const scene = await store.loadScene(board.id);
      if (!alive) return;
      contentSig.current = signature(scene?.elements || []);
      setInitial({
        elements: scene?.elements || [],
        appState: {
          currentItemStrokeColor: type.defaultInk || '#1c1b18',
          theme: dark ? 'dark' : 'light',
          ...(scene?.appState || {}),
          // Always transparent — the themed texture layer lives behind the canvas.
          viewBackgroundColor: 'transparent',
        },
        files: scene?.files || undefined,
        libraryItems: exLibrary || [],
        scrollToContent: true,
      });
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board.id]);

  const persist = useCallback((elements, appState, files) => {
    const json = serializeAsJSON(elements, appState, files || {}, 'local');
    const scene = JSON.parse(json);
    scene.appState = { ...scene.appState, viewBackgroundColor: 'transparent' };
    store.saveScene(board.id, scene);
    // Only bump "modified" when the drawn content actually changed — not for
    // scroll/zoom/color-only changes or Excalidraw's init settling.
    const sig = signature(elements);
    if (sig !== contentSig.current) {
      contentSig.current = sig;
      onTouch(board.id, hashElements(elements));
      // Auto-cover: snapshot the board as its thumbnail (throttled), so the
      // user never has to set one manually.
      const now = Date.now();
      if (now - lastCoverTs.current > 2500) {
        lastCoverTs.current = now;
        genCoverRef.current?.();
      }
    }
  }, [board.id, onTouch]);

  const onChange = useCallback((elements, appState, files) => {
    // Track the active tool so the canvas gets the matching outlined cursor.
    const tool = appState?.activeTool?.type;
    if (tool && tool !== activeToolRef.current) {
      activeToolRef.current = tool;
      setActiveTool(tool);
    }
    // Keep the most recent scene so we can flush it on close/unmount WITHOUT
    // calling Excalidraw's API during teardown (which throws inside Excalidraw).
    latest.current = { elements, appState, files, dirty: true };
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      persist(elements, appState, files);
      latest.current.dirty = false;
    }, 700);
  }, [persist]);

  // Flush any pending save on unmount — from the ref, never via the API.
  useEffect(() => () => {
    clearTimeout(saveTimer.current);
    const l = latest.current;
    if (l && l.dirty) persist(l.elements, l.appState, l.files);
  }, [persist]);

  // When the canvas type changes, seed new strokes with that board's default
  // ink (so you're not drawing black-on-black after switching to a dark board).
  // Skips the initial mount so a saved stroke-color preference isn't clobbered.
  const inkSeeded = useRef(false);
  useEffect(() => {
    if (!api) return;
    if (!inkSeeded.current) { inkSeeded.current = true; return; }
    api.updateScene({ appState: { currentItemStrokeColor: type.defaultInk || '#1c1b18' } });
  }, [api, type.defaultInk]);

  const commitTitle = () => {
    const t = title.trim() || board.title;
    setTitle(t);
    if (t !== board.title) onRename(board.id, t);
  };

  const handleClose = () => {
    clearTimeout(saveTimer.current);
    const l = latest.current;
    if (l && l.dirty) { persist(l.elements, l.appState, l.files); l.dirty = false; }
    onClose();
  };

  // Render the board (themed background + tint + drawing) to a flat canvas.
  const renderComposite = async () => {
    const canvas = await exportToCanvas({
      elements: api.getSceneElements(),
      appState: { ...api.getAppState(), exportBackground: false, exportWithDarkMode: dark },
      files: api.getFiles(),
      exportPadding: 24,
      getDimensions: (w, h) => ({ width: w, height: h, scale: 2 }),
    });
    const out = document.createElement('canvas');
    out.width = canvas.width;
    out.height = canvas.height;
    const ctx = out.getContext('2d');
    ctx.fillStyle = type.bg || '#ffffff';
    ctx.fillRect(0, 0, out.width, out.height);
    // Draw the themed background at the board's chosen opacity, over the base color.
    ctx.globalAlpha = bgOpacity / 100;
    if (type.kind === 'video') {
      // Draw the current live video frame; fall back to the poster still.
      const vid = document.querySelector('.editor-bg video');
      if (vid && vid.readyState >= 2) {
        try { drawCover(ctx, vid, out.width, out.height); } catch { /* keep solid bg */ }
      } else if (type.poster) {
        try { drawCover(ctx, await loadImage(asset(type.poster)), out.width, out.height); } catch { /* keep solid bg */ }
      }
    } else if (type.kind === 'css' && type.css === 'aurora') {
      paintAurora(ctx, out.width, out.height);
    } else if (type.texture) {
      try { drawCover(ctx, await loadImage(asset(type.texture)), out.width, out.height); } catch { /* keep solid bg */ }
    }
    ctx.globalAlpha = 1;
    if (type.tintOpacity) {
      ctx.globalAlpha = type.tintOpacity / 100;
      ctx.fillStyle = type.tintColor || '#000000';
      ctx.fillRect(0, 0, out.width, out.height);
      ctx.globalAlpha = 1;
    }
    ctx.drawImage(canvas, 0, 0);
    return out;
  };

  // Auto-cover generator (called throttled from persist on content change).
  genCoverRef.current = async () => {
    if (!api) return;
    try { onSetCover(board.id, toCoverDataUrl(await renderComposite())); } catch { /* ignore */ }
  };

  // Export a flattened PNG.
  const exportPng = async () => {
    if (!api) return;
    setShareMenu(false);
    const out = await renderComposite();
    const res = await store.exportPngFile({ suggestedName: title, dataUrl: out.toDataURL('image/png') });
    if (res && !res.canceled) onFlash('PNG saved');
  };

  // Copy the board as an image to the clipboard — instant paste into a chat.
  const copyImage = async () => {
    if (!api) return;
    setShareMenu(false);
    try {
      const out = await renderComposite();
      const blob = await new Promise((res) => out.toBlob(res, 'image/png'));
      await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })]);
      onFlash('Image copied — paste into a message');
    } catch { onFlash('Could not copy image'); }
  };

  // Export a PDF (one page sized to the board) — good for email or print.
  const exportPdf = async () => {
    if (!api) return;
    setShareMenu(false);
    const out = await renderComposite();
    const w = out.width, h = out.height;
    const pdf = new jsPDF({ orientation: w >= h ? 'landscape' : 'portrait', unit: 'px', format: [w, h] });
    pdf.addImage(out.toDataURL('image/png'), 'PNG', 0, 0, w, h);
    const base64 = pdf.output('datauristring').split(',')[1];
    const res = await store.exportPdfFile({ suggestedName: title, base64, blob: pdf.output('blob') });
    if (res && !res.canceled) onFlash('PDF saved');
  };

  // ── Cover image ──────────────────────────────────────────────────────────
  const coverFromCanvas = async () => {
    if (!api) return;
    setCoverMenu(false);
    const out = await renderComposite();
    onSetCover(board.id, toCoverDataUrl(out));
    onFlash('Cover set from board');
  };

  const uploadCover = () => {
    setCoverMenu(false);
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const img = await loadImage(URL.createObjectURL(file));
        onSetCover(board.id, toCoverDataUrl(img));
        URL.revokeObjectURL(img.src);
        onFlash('Cover image set');
      } catch { onFlash('Could not read that image'); }
    };
    input.click();
  };

  const resetCover = () => {
    setCoverMenu(false);
    onSetCover(board.id, null);
    onFlash('Cover reset to board texture');
  };

  const exportFile = async () => {
    if (!api) return;
    setShareMenu(false);
    const json = serializeAsJSON(api.getSceneElements(), api.getAppState(), api.getFiles(), 'local');
    const res = await store.exportBoardFile({ suggestedName: title, scene: JSON.parse(json) });
    if (res && !res.canceled) onFlash('Editable board saved');
  };

  // ── Tags ─────────────────────────────────────────────────────────────────
  const toggleTag = (tag) => {
    const set = new Set(boardTags);
    set.has(tag) ? set.delete(tag) : set.add(tag);
    onSetTags(board.id, [...set]);
  };
  const addNewTag = () => {
    const t = newTag.trim();
    if (!t) return;
    if (!boardTags.includes(t)) onSetTags(board.id, [...boardTags, t]);
    setNewTag('');
  };

  return (
    <div className="editor-overlay">
      <div className="ed-topbar">
        <button className="ed-back" onClick={handleClose}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><path d="M10 3L5 8l5 5" /></svg>
          Boards
        </button>
        <input
          className="ed-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        />
        <label className="ed-canvas-select" title="Change canvas type">
          <span className="ed-canvas-label">Whiteboard Background</span>
          <select value={board.type} onChange={(e) => onChangeType(board.id, e.target.value)}>
            {Object.entries(allTypes).filter(([k, t]) => !t.hidden || k === board.type).map(([key, t]) => (
              <option key={key} value={key}>{t.label}</option>
            ))}
          </select>
        </label>
        <div className="ed-actions">
          <div className="ed-cover-wrap">
            <button className="ed-btn ed-btn-ghost" onClick={() => setTagMenu((v) => !v)} title="Tags / categories">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="12" height="12"><path d="M2 3.5h5.5l6 6-4.5 4.5-6-6z" strokeLinejoin="round" /><circle cx="5" cy="6" r="1" fill="currentColor" stroke="none" /></svg>
              Tags{boardTags.length ? ` (${boardTags.length})` : ''} ▾
            </button>
            {tagMenu && (
              <>
                <div className="ed-menu-backdrop" onClick={() => setTagMenu(false)} />
                <div className="ed-menu ed-tag-menu">
                  <div className="ed-tag-current">
                    {boardTags.length === 0 && <span className="ed-tag-empty">No tags yet</span>}
                    {boardTags.map((t) => (
                      <button key={t} className="ed-tag-pill sel" onClick={() => toggleTag(t)}>{t} ✕</button>
                    ))}
                  </div>
                  {allTags.filter((t) => !boardTags.includes(t)).length > 0 && (
                    <div className="ed-tag-suggest">
                      {allTags.filter((t) => !boardTags.includes(t)).map((t) => (
                        <button key={t} className="ed-tag-pill" onClick={() => toggleTag(t)}>+ {t}</button>
                      ))}
                    </div>
                  )}
                  <div className="ed-tag-add">
                    <input
                      type="text" placeholder="New tag…" value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') addNewTag(); }}
                    />
                    <button onClick={addNewTag}>Add</button>
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="ed-cover-wrap">
            <button className="ed-btn ed-btn-ghost" onClick={() => setBgMenu((v) => !v)} title="Background opacity">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="12" height="12"><circle cx="8" cy="8" r="6" /><path d="M8 2a6 6 0 000 12z" fill="currentColor" stroke="none" /></svg>
              Background Transparency ▾
            </button>
            {bgMenu && (
              <>
                <div className="ed-menu-backdrop" onClick={() => setBgMenu(false)} />
                <div className="ed-menu ed-bg-menu">
                  <div className="ed-bg-menu-row">
                    <span>Background opacity</span>
                    <span className="ed-bg-val">{bgOpacity}%</span>
                  </div>
                  <input
                    type="range" min="0" max="100" value={bgOpacity}
                    onChange={(e) => onSetBgOpacity(board.id, Number(e.target.value))}
                  />
                  <button className="ed-bg-reset" onClick={() => onSetBgOpacity(board.id, 100)}>Reset to 100%</button>
                </div>
              </>
            )}
          </div>
          <div className="ed-cover-wrap">
            <button className="ed-btn ed-btn-ghost" onClick={() => setCoverMenu((v) => !v)}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="12" height="12"><rect x="2" y="3" width="12" height="10" rx="1.5" /><circle cx="6" cy="7" r="1.2" /><path d="M3 12l3.5-3 2.5 2 2-1.5L14 12" /></svg>
              Cover ▾
            </button>
            {coverMenu && (
              <>
                <div className="ed-menu-backdrop" onClick={() => setCoverMenu(false)} />
                <div className="ed-menu">
                  <button onClick={coverFromCanvas}>Use current board</button>
                  <button onClick={uploadCover}>Upload image…</button>
                  {board.cover && <button onClick={resetCover}>Reset to texture</button>}
                </div>
              </>
            )}
          </div>
          <div className="ed-cover-wrap">
            <button className="ed-btn ed-btn-primary" onClick={() => setShareMenu((v) => !v)}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="12" height="12"><circle cx="4" cy="8" r="1.8" /><circle cx="12" cy="4" r="1.8" /><circle cx="12" cy="12" r="1.8" /><path d="M5.6 7.1l4.8-2.4M5.6 8.9l4.8 2.4" /></svg>
              Share ▾
            </button>
            {shareMenu && (
              <>
                <div className="ed-menu-backdrop" onClick={() => setShareMenu(false)} />
                <div className="ed-menu ed-share-menu">
                  <button onClick={copyImage}>
                    <span className="ed-share-title">📋 Copy image</span>
                    <span className="ed-share-sub">paste straight into a text or chat</span>
                  </button>
                  <button onClick={exportPng}>
                    <span className="ed-share-title">🖼️ Save as image (PNG)</span>
                    <span className="ed-share-sub">text or email — anyone can open it</span>
                  </button>
                  <button onClick={exportPdf}>
                    <span className="ed-share-title">📄 Save as PDF</span>
                    <span className="ed-share-sub">great for email or printing</span>
                  </button>
                  <button onClick={exportFile}>
                    <span className="ed-share-title">✏️ Save editable board</span>
                    <span className="ed-share-sub">.excalidraw — they double-click to open &amp; edit</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className={`editor-canvas ${dark ? 'is-dark' : 'is-light'}`} data-tool={activeTool} style={{ backgroundColor: type.bg }}>
        {/* Themed background sits behind the transparent Excalidraw canvas.
            keyed by board.type so switching canvas remounts the right layer. */}
        <div className="editor-bg" key={board.type} style={{ opacity: bgOpacity / 100 }}>
          <BoardBackground type={type} variant="editor" />
        </div>
        {type.tintOpacity ? (
          <div className="editor-bg-tint" style={{ backgroundColor: type.tintColor, opacity: type.tintOpacity / 100 }} />
        ) : null}

        {initial !== undefined && (
          <Excalidraw
            excalidrawAPI={setApi}
            initialData={initial}
            onChange={onChange}
            onLibraryChange={onLibraryChange}
            libraryReturnUrl={typeof window !== 'undefined' ? window.location.origin : undefined}
            theme={dark ? 'dark' : 'light'}
            UIOptions={{ canvasActions: { toggleTheme: true } }}
          />
        )}
      </div>
    </div>
  );
}
