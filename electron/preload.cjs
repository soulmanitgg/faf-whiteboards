const { contextBridge, ipcRenderer } = require('electron');

// Minimal, explicit API surface exposed to the renderer. No raw ipcRenderer,
// no Node globals — everything the UI can do to the filesystem is listed here.
contextBridge.exposeInMainWorld('faf', {
  workspace: {
    load: () => ipcRenderer.invoke('workspace:load'),
    save: (state) => ipcRenderer.invoke('workspace:save', state),
  },
  scene: {
    load: (id) => ipcRenderer.invoke('scene:load', id),
    save: (id, scene) => ipcRenderer.invoke('scene:save', id, scene),
    delete: (id) => ipcRenderer.invoke('scene:delete', id),
    saveMany: (entries) => ipcRenderer.invoke('scene:saveMany', entries),
  },
  board: {
    export: (payload) => ipcRenderer.invoke('board:export', payload),
    import: () => ipcRenderer.invoke('board:import'),
    exportPng: (payload) => ipcRenderer.invoke('board:exportPng', payload),
    exportPdf: (payload) => ipcRenderer.invoke('board:exportPdf', payload),
  },
  // OS file-open (double-click a .excalidraw / "Open with"):
  onOpenFile: (cb) => ipcRenderer.on('open-file', (_e, payload) => cb(payload)),
  readyForFiles: () => ipcRenderer.invoke('app:ready-for-files'),
  exlib: {
    load: () => ipcRenderer.invoke('exlib:load'),
    save: (items) => ipcRenderer.invoke('exlib:save', items),
  },
  settings: {
    getDataDir: () => ipcRenderer.invoke('settings:getDataDir'),
    chooseDataDir: () => ipcRenderer.invoke('settings:chooseDataDir'),
    resetDataDir: () => ipcRenderer.invoke('settings:resetDataDir'),
  },
  library: {
    exportAll: () => ipcRenderer.invoke('library:exportAll'),
    importAll: () => ipcRenderer.invoke('library:importAll'),
  },
  isDesktop: true,
});
