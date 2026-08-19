// Built-in starter templates. Each is a small set of valid Excalidraw elements
// that become a new board when picked. Kept to rectangles / text / arrows so
// they render reliably.

let n = 1;
const nextId = () => `tpl_${(n++).toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;

// Base fields every Excalidraw element needs.
function base(type, o) {
  return {
    id: nextId(), type, x: 0, y: 0, width: 100, height: 60, angle: 0,
    strokeColor: '#1e1e1e', backgroundColor: 'transparent',
    fillStyle: 'solid', strokeWidth: 2, strokeStyle: 'solid', roughness: 1, opacity: 100,
    groupIds: [], frameId: null, roundness: type === 'rectangle' ? { type: 3 } : null,
    seed: Math.floor(Math.random() * 2e9), version: 1, versionNonce: Math.floor(Math.random() * 2e9),
    isDeleted: false, boundElements: null, updated: 1, link: null, locked: false,
    ...o,
  };
}

const rect = (x, y, w, h, o = {}) => base('rectangle', { x, y, width: w, height: h, ...o });

function text(str, x, y, o = {}) {
  const fontSize = o.fontSize || 20;
  return base('text', {
    x, y, width: Math.max(20, str.length * fontSize * 0.55), height: fontSize * 1.25,
    text: str, originalText: str, fontSize, fontFamily: 1, textAlign: o.textAlign || 'left',
    verticalAlign: 'top', containerId: null, lineHeight: 1.25, baseline: Math.round(fontSize * 0.8),
    strokeColor: o.strokeColor || '#1e1e1e', ...o,
  });
}

function arrow(x, y, dx, dy, o = {}) {
  return base('arrow', {
    x, y, width: Math.abs(dx), height: Math.abs(dy),
    points: [[0, 0], [dx, dy]], lastCommittedPoint: null,
    startBinding: null, endBinding: null, startArrowhead: null, endArrowhead: 'arrow', ...o,
  });
}

// ── Templates ──────────────────────────────────────────────────────────────
function kanban() {
  const cols = [['To do', '#fff4e6'], ['In progress', '#e7f5ff'], ['Done', '#ebfbee']];
  const els = [text('Kanban Board', 40, 30, { fontSize: 28 })];
  cols.forEach(([label, bg], i) => {
    const x = 40 + i * 260;
    els.push(rect(x, 80, 230, 420, { backgroundColor: bg, strokeColor: '#e08a1e' }));
    els.push(text(label, x + 16, 96, { fontSize: 20 }));
    els.push(rect(x + 16, 140, 198, 60, { backgroundColor: '#ffffff' }));
    els.push(rect(x + 16, 216, 198, 60, { backgroundColor: '#ffffff' }));
  });
  return els;
}

function flowchart() {
  const els = [text('Flowchart', 40, 30, { fontSize: 28 })];
  const start = base('ellipse', { x: 120, y: 90, width: 160, height: 70, backgroundColor: '#e7f5ff' });
  const proc = rect(120, 220, 160, 70, { backgroundColor: '#fff4e6' });
  const dec = base('diamond', { x: 110, y: 350, width: 180, height: 100, backgroundColor: '#fff9db' });
  const done = base('ellipse', { x: 120, y: 510, width: 160, height: 70, backgroundColor: '#ebfbee' });
  els.push(start, proc, dec, done);
  els.push(text('Start', 175, 112), text('Step', 178, 242), text('Choice?', 160, 388), text('End', 182, 532));
  els.push(arrow(200, 162, 0, 55), arrow(200, 292, 0, 55), arrow(200, 452, 0, 55));
  return els;
}

function mindmap() {
  const els = [];
  const cx = 380, cy = 260;
  els.push(rect(cx - 90, cy - 35, 180, 70, { backgroundColor: '#fff4e6', strokeColor: '#e08a1e', roundness: { type: 3 } }));
  els.push(text('Main idea', cx - 55, cy - 12, { fontSize: 20 }));
  const spots = [[cx - 320, cy - 160], [cx + 200, cy - 160], [cx - 320, cy + 120], [cx + 200, cy + 120]];
  const names = ['Idea A', 'Idea B', 'Idea C', 'Idea D'];
  spots.forEach(([x, y], i) => {
    els.push(rect(x, y, 150, 56, { backgroundColor: '#ffffff' }));
    els.push(text(names[i], x + 20, y + 16));
    const sx = x < cx ? x + 150 : x;
    const sy = y + 28;
    els.push(base('line', { x: sx, y: sy, width: Math.abs(cx - sx), height: Math.abs(cy - sy), points: [[0, 0], [cx - sx, cy - sy]], strokeColor: '#adb5bd' }));
  });
  return els;
}

function weekly() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const els = [text('Weekly Planner', 40, 30, { fontSize: 28 })];
  days.forEach((d, i) => {
    const x = 40 + i * 150;
    els.push(rect(x, 80, 140, 40, { backgroundColor: '#fff4e6', strokeColor: '#e08a1e' }));
    els.push(text(d, x + 50, 90, { fontSize: 18 }));
    els.push(rect(x, 124, 140, 380, { backgroundColor: '#ffffff' }));
  });
  return els;
}

function wireframe() {
  const els = [text('Wireframe', 40, 30, { fontSize: 28 })];
  els.push(rect(80, 80, 520, 360, { backgroundColor: '#ffffff' }));      // frame
  els.push(rect(80, 80, 520, 48, { backgroundColor: '#fff4e6', strokeColor: '#e08a1e' })); // header
  els.push(text('Header', 100, 92, { fontSize: 18 }));
  els.push(rect(104, 156, 220, 140, { backgroundColor: '#f1f3f5' }));    // hero
  els.push(rect(344, 156, 232, 30, { backgroundColor: '#f1f3f5' }));
  els.push(rect(344, 202, 232, 30, { backgroundColor: '#f1f3f5' }));
  els.push(rect(344, 248, 140, 40, { backgroundColor: '#ffe8cc' }));     // button
  els.push(text('Button', 372, 258, { fontSize: 16 }));
  els.push(rect(104, 324, 472, 90, { backgroundColor: '#f1f3f5' }));     // footer block
  return els;
}

export const TEMPLATES = [
  { id: 'kanban', name: 'Kanban board', desc: 'To do · In progress · Done', build: kanban },
  { id: 'flowchart', name: 'Flowchart', desc: 'Start → step → choice → end', build: flowchart },
  { id: 'mindmap', name: 'Mind map', desc: 'A central idea with branches', build: mindmap },
  { id: 'weekly', name: 'Weekly planner', desc: 'Seven day columns', build: weekly },
  { id: 'wireframe', name: 'Wireframe', desc: 'A simple screen layout', build: wireframe },
  { id: 'blank', name: 'Blank board', desc: 'Start from nothing', build: () => [] },
];
