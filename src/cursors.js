// Custom tool cursors for the Excalidraw canvas.
//
// Every icon is stroked TWICE — a thick white halo underneath and a dark line
// on top — so the cursor stays visible on both light (whiteboard) and dark
// canvases. Excalidraw's default cursors (e.g. the Hand's `grab`) are dark-only
// and disappear over white; these replace them via a stylesheet with
// !important so they win over Excalidraw's inline cursor.

const svg = (inner, size = 28) =>
  `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 24 24' fill='none' stroke-linecap='round' stroke-linejoin='round'>${inner}</svg>`;

// A path rendered as a white halo + dark line.
const halo = (d, w = 1.8) =>
  `<path d='${d}' stroke='#ffffff' stroke-width='${w + 2.6}'/><path d='${d}' stroke='#1c1b18' stroke-width='${w}'/>`;

const HAND = halo('M18 11V6.5a1.5 1.5 0 00-3 0V11M15 6.5V5a1.5 1.5 0 00-3 0v6M12 5V3.5a1.5 1.5 0 00-3 0V11M9 3.5V8A6 6 0 006 13v1a6 6 0 006 6h2a6 6 0 006-6v-4.5');
const CROSS = halo('M12 3.5V10 M12 14V20.5 M3.5 12H10 M14 12H20.5') +
  `<circle cx='12' cy='12' r='1.1' fill='#1c1b18' stroke='#ffffff' stroke-width='0.7'/>`;
const IBEAM = halo('M12 4.5V19.5 M9 4.5H15 M9 19.5H15');
const ERASER = halo('M19.5 19.5H8L4 15.5 12.5 7l6.5 6.5-4 5') + halo('M8 11.5l6.5 6.5', 1.6);

// tool type → { icon svg, hotspot x/y (px, cursor is 28px), fallback keyword }
const CURSORS = {
  hand:      { icon: HAND,   hx: 14, hy: 14, fallback: 'grab' },
  freedraw:  { icon: CROSS,  hx: 14, hy: 14, fallback: 'crosshair' },
  rectangle: { icon: CROSS,  hx: 14, hy: 14, fallback: 'crosshair' },
  diamond:   { icon: CROSS,  hx: 14, hy: 14, fallback: 'crosshair' },
  ellipse:   { icon: CROSS,  hx: 14, hy: 14, fallback: 'crosshair' },
  arrow:     { icon: CROSS,  hx: 14, hy: 14, fallback: 'crosshair' },
  line:      { icon: CROSS,  hx: 14, hy: 14, fallback: 'crosshair' },
  image:     { icon: CROSS,  hx: 14, hy: 14, fallback: 'crosshair' },
  frame:     { icon: CROSS,  hx: 14, hy: 14, fallback: 'crosshair' },
  laser:     { icon: CROSS,  hx: 14, hy: 14, fallback: 'crosshair' },
  text:      { icon: IBEAM,  hx: 14, hy: 14, fallback: 'text' },
  eraser:    { icon: ERASER, hx: 14, hy: 14, fallback: 'crosshair' },
};

// Build the stylesheet text. Note: 'selection' is intentionally left to
// Excalidraw's default arrow so hover/resize/move cursors still work — the
// default arrow already reads fine on white.
export function buildCursorCss() {
  let css = '';
  for (const [tool, c] of Object.entries(CURSORS)) {
    const url = `url("data:image/svg+xml,${encodeURIComponent(svg(c.icon))}") ${c.hx} ${c.hy}, ${c.fallback}`;
    css += `.editor-canvas[data-tool="${tool}"] .excalidraw,`;
    css += `.editor-canvas[data-tool="${tool}"] .excalidraw canvas{cursor:${url} !important}`;
  }
  return css;
}
