// Transcode the source .mov (746MB ProRes) into small, web-playable loops for
// the home hero background. Produces public/hero.mp4 (H.264) and public/hero.webm
// (VP9). Both are muted, ~1280px wide, and heavily compressed — a background
// video should be a few MB, not hundreds.
import { spawn } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(root, '..', 'public');

// Source can be overridden with `node scripts/transcode-video.mjs "<path>"`.
const source = process.argv[2] || 'C:\\Users\\expre\\Downloads\\Partical_Project_008.mov';

if (!existsSync(source)) {
  console.error(`Source video not found: ${source}`);
  process.exit(1);
}
if (!ffmpegPath) {
  console.error('ffmpeg-static did not resolve a binary. Run `npm install` first.');
  process.exit(1);
}

function run(args, label) {
  return new Promise((resolve, reject) => {
    console.log(`\n▶ ${label}`);
    const p = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'inherit'] });
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${label} exited ${code}`))));
    p.on('error', reject);
  });
}

// Common video filter: scale to 1280 wide (keep aspect, even dimensions).
const vf = 'scale=1280:-2:flags=lanczos';

const mp4 = path.join(publicDir, 'hero.mp4');
const webm = path.join(publicDir, 'hero.webm');

try {
  await run(
    ['-y', '-i', source, '-an', '-vf', vf, '-c:v', 'libx264', '-profile:v', 'high',
     '-pix_fmt', 'yuv420p', '-crf', '30', '-preset', 'slow', '-movflags', '+faststart', mp4],
    'Encoding hero.mp4 (H.264)'
  );
  await run(
    ['-y', '-i', source, '-an', '-vf', vf, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '36',
     '-row-mt', '1', '-deadline', 'good', webm],
    'Encoding hero.webm (VP9)'
  );
  console.log('\n✓ Done. Wrote hero.mp4 and hero.webm to /public.');
} catch (err) {
  console.error(`\n✗ Transcode failed: ${err.message}`);
  process.exit(1);
}
