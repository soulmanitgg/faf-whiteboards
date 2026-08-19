import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Copy Excalidraw's font/asset folder into /public so it ships with the app
// and loads offline (paired with window.EXCALIDRAW_ASSET_PATH in main.jsx).
function copyExcalidrawAssets() {
  return {
    name: 'copy-excalidraw-assets',
    buildStart() {
      const src = path.join(__dirname, 'node_modules', '@excalidraw', 'excalidraw', 'dist', 'excalidraw-assets');
      const dest = path.join(__dirname, 'public', 'excalidraw-assets');
      if (existsSync(src)) {
        mkdirSync(path.dirname(dest), { recursive: true });
        cpSync(src, dest, { recursive: true });
      } else {
        this.warn('excalidraw-assets not found — run npm install first.');
      }
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [copyExcalidrawAssets(), react()],
  server: {
    port: 5173,
    strictPort: true,
  },
  define: {
    'process.env.IS_PREACT': JSON.stringify('false'),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 4000,
  },
});
