// Tell Excalidraw to load its fonts/assets from our bundled copy instead of a
// CDN, so the app works fully offline. Must be set before Excalidraw loads.
// (vite copies node_modules/@excalidraw/excalidraw/dist/excalidraw-assets into
//  /public via the plugin in vite.config.js.)
window.EXCALIDRAW_ASSET_PATH = import.meta.env.BASE_URL;

import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

// NOTE: We intentionally do NOT wrap the app in <React.StrictMode>. Excalidraw
// 0.17.x is not StrictMode-safe — StrictMode's dev-only double mount/unmount
// makes Excalidraw's internal lifecycle throw. This is a known upstream issue.
createRoot(document.getElementById('root')).render(<App />);
