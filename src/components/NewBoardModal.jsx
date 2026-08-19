import React, { useEffect, useRef, useState } from 'react';
import BoardBackground from './BoardBackground.jsx';
import {
  CUSTOM_BACKGROUNDS, CUSTOM_SOLIDS, INK_COLORS,
} from '../data/boardTypes.js';

export default function NewBoardModal({ allTypes, preset, onClose, onCreate, onCreateCustom }) {
  const [tab, setTab] = useState(preset.tab || 'new');

  // New-board tab state
  const [selectedType, setSelectedType] = useState(preset.type || 'whiteboard');
  const [boardName, setBoardName] = useState('');

  // Custom-board tab state — `bg` mirrors a CUSTOM_BACKGROUNDS entry.
  const [cust, setCust] = useState({
    bgKey: 'brick',
    kind: 'texture',
    texture: 'textures/brick.png',
    video: null,
    css: null,
    poster: null,
    bgColor: '#1a1008',
    tintColor: '#000000',
    tintOpacity: 0,
    inkColor: '#1c1b18',
  });
  const [customTypeName, setCustomTypeName] = useState('');
  const [customBoardName, setCustomBoardName] = useState('');
  const [customError, setCustomError] = useState('');

  const nameRef = useRef(null);
  const typeNameRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => {
      (tab === 'custom' ? typeNameRef : nameRef).current?.focus();
    }, 60);
    return () => clearTimeout(t);
  }, [tab]);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const confirmNew = () => onCreate(selectedType, boardName);

  const confirmCustom = () => {
    if (!customTypeName.trim()) {
      setCustomError('Give your board type a name.');
      typeNameRef.current?.focus();
      return;
    }
    const animated = cust.kind === 'css' || cust.kind === 'video';
    onCreateCustom(
      {
        label: customTypeName.trim(),
        bg: cust.bgColor,
        texture: cust.kind === 'texture' ? cust.texture : null,
        kind: animated ? cust.kind : undefined,   // static → no kind
        css: cust.kind === 'css' ? cust.css : undefined,
        video: cust.kind === 'video' ? cust.video : undefined,
        poster: cust.kind === 'video' ? cust.poster : undefined,
        animated: animated || undefined,
        defaultInk: cust.inkColor,
        tintColor: cust.tintColor,
        tintOpacity: cust.tintOpacity,
      },
      customBoardName,
    );
  };

  // Pick a background (texture / video / css / solid) from CUSTOM_BACKGROUNDS.
  const setBackground = (bg) => setCust((c) => ({
    ...c,
    bgKey: bg.key,
    kind: bg.kind,
    texture: bg.kind === 'texture' ? bg.texture : null,
    video: bg.kind === 'video' ? bg.video : null,
    poster: bg.kind === 'video' ? bg.poster : null,
    css: bg.kind === 'css' ? bg.css : null,
  }));

  const setSolid = (color) => setCust((c) => ({
    ...c,
    bgKey: 'none', kind: 'solid', texture: null, video: null, css: null, poster: null,
    bgColor: color,
  }));

  // Synthesized type object for the live preview / swatches.
  const previewType = {
    bg: cust.bgColor, kind: cust.kind === 'solid' ? undefined : cust.kind,
    texture: cust.texture, video: cust.video, css: cust.css, poster: cust.poster,
  };

  return (
    <div className="modal-bg" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-tabs">
          <button className={`modal-tab ${tab === 'new' ? 'active' : ''}`} onClick={() => setTab('new')}>New Board</button>
          <button className={`modal-tab ${tab === 'custom' ? 'active' : ''}`} onClick={() => setTab('custom')}>✦ Custom Board</button>
        </div>

        {tab === 'new' ? (
          <>
            <div className="modal-body">
              <div className="modal-title">Choose a board type</div>
              <div className="modal-sub">Select a background style to start with</div>
              <div className="modal-type-grid">
                {Object.entries(allTypes).filter(([, t]) => !t.hidden).map(([key, t]) => (
                  <button
                    key={key}
                    className={`modal-type-tile ${key === selectedType ? 'sel' : ''}`}
                    onClick={() => setSelectedType(key)}
                  >
                    <div className="modal-type-thumb"><BoardBackground type={t} variant="tile" /></div>
                    <div className="modal-type-label">{t.label}{t.animated ? ' ✦' : ''}</div>
                  </button>
                ))}
              </div>
              <input
                ref={nameRef}
                className="modal-input"
                type="text"
                placeholder="Board name (optional)…"
                value={boardName}
                onChange={(e) => setBoardName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') confirmNew(); }}
              />
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" onClick={confirmNew}>Create Board</button>
            </div>
          </>
        ) : (
          <>
            <div className="modal-body">
              <div className="modal-title">Design a Custom Board</div>
              <div className="modal-sub">Mix a background, overlay, and default ink color — then save as a reusable type</div>

              <div className="cust-section">
                <div className="cust-label">Background (textures &amp; animated)</div>
                <div className="cust-textures">
                  {CUSTOM_BACKGROUNDS.map((bg) => (
                    <button
                      key={bg.key}
                      className={`cust-texture ${cust.bgKey === bg.key ? 'sel' : ''}`}
                      onClick={() => setBackground(bg)}
                    >
                      {bg.kind === 'solid'
                        ? <div className="cust-texture-none">Solid</div>
                        : <div className="cust-texture-thumb"><BoardBackground type={{ bg: cust.bgColor, kind: bg.kind === 'texture' ? undefined : bg.kind, texture: bg.texture, video: bg.video, css: bg.css, poster: bg.poster }} variant="tile" /></div>}
                      <div className="cust-texture-label">{bg.label}{bg.animated ? ' ✦' : ''}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="cust-section">
                <div className="cust-label">Or Solid Color</div>
                <div className="cust-solid">
                  {CUSTOM_SOLIDS.map((c) => (
                    <button
                      key={c}
                      className={`cust-solid-dot ${cust.kind === 'solid' && cust.bgColor === c ? 'sel' : ''}`}
                      style={{ background: c, ...(c === '#ffffff' ? { border: '1.5px solid #e4e4e7' } : {}) }}
                      onClick={() => setSolid(c)}
                    />
                  ))}
                </div>
              </div>

              <div className="cust-section">
                <div className="cust-label">Overlay Tint &amp; Opacity</div>
                <div className="cust-tint-row">
                  <input type="color" value={cust.tintColor}
                    onChange={(e) => setCust((c) => ({ ...c, tintColor: e.target.value }))} />
                  <input type="range" min="0" max="80" value={cust.tintOpacity}
                    onChange={(e) => setCust((c) => ({ ...c, tintOpacity: Number(e.target.value) }))} />
                  <span className="cust-tint-val">{cust.tintOpacity}%</span>
                </div>
              </div>

              <div className="cust-section">
                <div className="cust-label">Default Ink Color</div>
                <div className="cust-color-row">
                  {INK_COLORS.map((c) => (
                    <button
                      key={c}
                      className={`cust-c ${cust.inkColor === c ? 'sel' : ''}`}
                      style={{ background: c, ...(c === '#ffffff' ? { border: '1.5px solid #e4e4e7' } : {}) }}
                      onClick={() => setCust((cc) => ({ ...cc, inkColor: c }))}
                    />
                  ))}
                </div>
              </div>

              <div className="cust-section">
                <div className="cust-label">Preview</div>
                <div className="cust-preview">
                  <div className="cust-preview-bg"><BoardBackground type={previewType} variant="tile" /></div>
                  <div className="cust-preview-overlay" style={{ backgroundColor: cust.tintColor, opacity: cust.tintOpacity / 100 }} />
                  <div className="cust-preview-center">
                    <span className="cust-preview-text" style={{ color: cust.inkColor }}>Preview</span>
                  </div>
                </div>
              </div>

              <input
                ref={typeNameRef}
                className="modal-input"
                type="text"
                placeholder="Name this board type (e.g. Night Sky)…"
                value={customTypeName}
                onChange={(e) => { setCustomTypeName(e.target.value); setCustomError(''); }}
              />
              <input
                className="modal-input"
                type="text"
                placeholder="First board name (optional)…"
                value={customBoardName}
                onChange={(e) => setCustomBoardName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') confirmCustom(); }}
              />
              {customError && <div className="cust-error">{customError}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" onClick={confirmCustom}>Save Type &amp; Create Board</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
