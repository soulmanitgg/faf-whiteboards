// Resolve an asset path that works in both `vite dev` (served at /) and the
// packaged Electron build (loaded from file://, base './').
export const asset = (p) => import.meta.env.BASE_URL + p;

// Built-in board types.
//   `texture`  — path under /public for a static image (null = solid color)
//   `kind`     — 'video' (animated loop) | 'css' (animated CSS class) | undefined (static)
//   `video`    — basename under /public (expects <video>.webm + <video>.mp4)
//   `poster`   — still image used for card thumbnails of a video canvas
//   `css`      — CSS animation class suffix (bg-<css>) for a 'css' canvas
//   `defaultInk` seeds Excalidraw's stroke color; white ink marks a dark board.
// Only four backgrounds are offered now: Whiteboard, Blue, Green, Black.
// The rest are kept with `hidden: true` so any OLD boards that used them still
// render — they just aren't offered when creating/switching boards.
export const DEFAULT_TYPES = {
  whiteboard: { label: 'Whiteboard', bg: '#ffffff', texture: null,                     defaultInk: '#1c1b18', chipClass: 'chip-whiteboard' },
  blueboard:  { label: 'Blue Board',  bg: '#0f2a4a', texture: 'textures/blueboard.png',  defaultInk: '#ffffff', chipClass: 'chip-blueboard' },
  chalkboard: { label: 'Green Board', bg: '#2a3d22', texture: 'textures/chalkboard.png', defaultInk: '#ffffff', chipClass: 'chip-chalkboard' },
  blackboard: { label: 'Blackboard',  bg: '#1a1a1a', texture: 'textures/blackboard.png', defaultInk: '#ffffff', chipClass: 'chip-blackboard' },
  // ── hidden (legacy render-only) ──
  brickwall:  { label: 'Brick Wall', bg: '#1a1008', texture: 'textures/brick.png', defaultInk: '#ffffff', chipClass: 'chip-brickwall', hidden: true },
  water:      { label: 'Flowing Water', bg: '#0a1c2e', texture: null, kind: 'video', video: 'hero', poster: 'hero-poster.jpg', defaultInk: '#ffffff', chipClass: 'chip-water', hidden: true },
  aurora:     { label: 'Aurora',    bg: '#0b1020', texture: null, kind: 'css', css: 'aurora',    defaultInk: '#ffffff', chipClass: 'chip-anim', hidden: true },
  starfield:  { label: 'Starfield', bg: '#05060f', texture: null, kind: 'css', css: 'starfield', defaultInk: '#ffffff', chipClass: 'chip-anim', hidden: true },
  gradient:   { label: 'Gradient',  bg: '#10163a', texture: null, kind: 'css', css: 'gradient',  defaultInk: '#ffffff', chipClass: 'chip-anim', hidden: true },
  grid:       { label: 'Grid Pulse', bg: '#0a0f1a', texture: null, kind: 'css', css: 'grid',     defaultInk: '#ffffff', chipClass: 'chip-anim', hidden: true },
};

export const DEFAULT_TYPE_KEYS = Object.keys(DEFAULT_TYPES);

// A dark board wants Excalidraw's dark UI theme and light default ink.
export const isDarkType = (type) => (type?.defaultInk || '#1c1b18').toLowerCase() === '#ffffff';

// Entries offered in every picker (New Board modal, canvas switcher, filters).
export const offeredTypeEntries = (allTypes) =>
  Object.entries(allTypes).filter(([, t]) => !t.hidden);

// Custom-board designer background choices — the four textures + a plain solid.
export const CUSTOM_BACKGROUNDS = [
  { key: 'blueboard',  kind: 'texture', texture: 'textures/blueboard.png',  label: 'Blue' },
  { key: 'chalkboard', kind: 'texture', texture: 'textures/chalkboard.png', label: 'Green' },
  { key: 'blackboard', kind: 'texture', texture: 'textures/blackboard.png', label: 'Black' },
  { key: 'none',       kind: 'solid',   label: 'Solid' },
];

export const CUSTOM_SOLIDS = ['#ffffff', '#f8f7f4', '#1a1a1a', '#0f2a4a', '#2d5016', '#44302a', '#1a0a0a', '#0a1628'];
export const INK_COLORS = ['#1c1b18', '#ffffff', '#2563eb', '#f59e0b', '#16a34a', '#ec4899'];
