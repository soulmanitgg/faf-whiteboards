import React, { useEffect, useState } from 'react';
import * as store from '../state/store.js';

export default function SettingsModal({ onClose, onReload, onExportLibrary, onImportLibrary }) {
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState(false);

  const refresh = async () => setInfo(await store.getDataDir());
  useEffect(() => { refresh(); }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const chooseFolder = async () => {
    setBusy(true);
    const res = await store.chooseDataDir();
    setBusy(false);
    if (res.canceled) return;
    await refresh();
    await onReload();
  };

  const resetFolder = async () => {
    setBusy(true);
    await store.resetDataDir();
    setBusy(false);
    await refresh();
    await onReload();
  };

  const unsupported = info?.unsupported;

  return (
    <div className="modal-bg" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal settings-modal" role="dialog" aria-modal="true">
        <div className="modal-tabs"><div className="modal-tab active">Settings</div></div>
        <div className="modal-body">
          <div className="settings-section">
            <div className="modal-title">Sync across PCs</div>
            <div className="modal-sub">
              Put your library in a cloud-synced folder (OneDrive, Dropbox, Google Drive).
              Point every PC at the <em>same</em> folder and your boards stay in sync.
              Tip: avoid editing the same board on two PCs at once — the last save wins.
            </div>

            <div className="settings-field">
              <div className="settings-label">Library folder</div>
              <div className="settings-path" title={info?.dir}>{info?.dir || '…'}</div>
              {info && !unsupported && (
                <div className="settings-hint">{info.isDefault ? 'Default location (this PC only).' : 'Custom — syncing via your cloud folder.'}</div>
              )}
            </div>

            {unsupported ? (
              <div className="settings-hint">Folder syncing is available in the desktop app.</div>
            ) : (
              <div className="settings-actions">
                <button className="btn btn-primary" disabled={busy} onClick={chooseFolder}>Change folder…</button>
                {info && !info.isDefault && (
                  <button className="btn btn-ghost" disabled={busy} onClick={resetFolder}>Reset to default</button>
                )}
              </div>
            )}
          </div>

          <div className="settings-divider" />

          <div className="settings-section">
            <div className="modal-title">Backup &amp; transfer</div>
            <div className="modal-sub">Export your entire library to one file, or import one from another PC. Imports skip exact duplicates and rename name clashes.</div>
            <div className="settings-actions">
              <button className="btn btn-ghost" onClick={async () => { await onExportLibrary(); }}>Export entire library…</button>
              <button className="btn btn-ghost" onClick={async () => { await onImportLibrary(); }}>Import library…</button>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
