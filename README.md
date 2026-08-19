# FAF Boards

A tactile, infinite-canvas board workspace — built as a desktop app with **Electron + React + Vite**, using the real **Excalidraw** engine for drawing.

Every board type (Whiteboard, Blue Board, Chalkboard, Blackboard, Brick Wall, or your own **Custom** types) opens the same Excalidraw canvas; the "type" simply sets the themed texture/color that shows through behind the transparent canvas, plus the default ink color.

## Features

- **Glassmorphism launcher shell** with an ambient looping background video (low opacity behind the glass).
- **Home** — animated hero, a scrolling "Choose your canvas" row, and recent boards.
- **Board Library** — search, type filters, sort, and dynamic pagination.
- **Custom Board designer** — mix a texture/solid background, an overlay tint, and a default ink color, then save it as a reusable board type.
- **Real Excalidraw editor** — full toolbar, shapes, text, arrows, undo/redo, zoom/pan.
- **Local persistence** — every board's drawing is saved automatically. Boards, custom types, and drawings survive restarts.
  - Desktop: stored as JSON files under the app's user-data folder.
  - Browser (dev): falls back to `localStorage`.
- **Export / Import** — export a board as a `.excalidraw` / `.faf` file or a flattened **PNG** (texture + drawing composited); import a board back in.

## Requirements

- Node.js 18+ (developed on Node 22/24).

## Setup

```bash
npm install
npm run prepare-assets   # generates the app icon (.ico/.png) and transcodes the hero video
```

`prepare-assets` runs two steps:
- `make-icon` — converts `build/icon-source.png` into `public/icon.png` and `build/icon.ico` (used as-is, no mask/overlay).
- `transcode` — compresses the source `.mov` into `public/hero.mp4` + `public/hero.webm` (via the vendored `ffmpeg-static`, no system ffmpeg needed). Override the source path: `node scripts/transcode-video.mjs "C:\path\to\video.mov"`.

## Develop

```bash
npm run dev
```

Starts Vite and launches the Electron window pointing at it (with hot reload). To preview the UI in a plain browser instead: `npm run dev:vite-only` and open `http://localhost:5173` (uses the `localStorage` fallback).

## Build a distributable

```bash
npm run dist        # installer (NSIS) in ./release
npm run dist:dir    # unpacked app only (faster, no installer)
```

## Project layout

```
electron/         Electron main process + preload (window + file persistence over IPC)
src/
  App.jsx         top-level state, routing, persistence orchestration
  components/     Sidebar, TopBar, HomeScreen, LibraryScreen, NewBoardModal, Editor, …
  state/store.js  persistence adapter (Electron IPC ↔ localStorage fallback)
  data/           board-type definitions
scripts/          make-icon, transcode-video
public/           textures, transcoded video, app icon, Excalidraw fonts (offline)
```

## Notes

- The app is **not** wrapped in `React.StrictMode` — Excalidraw 0.17.x is not StrictMode-safe (its dev-only double-mount makes Excalidraw's lifecycle throw).
- Excalidraw fonts are bundled into `public/excalidraw-assets` at build time so the app works fully offline.
