// Generate app icons from build/icon-source.png.
// The icon is used AS-IS — no rounded-corner mask, no overlay — per request.
// Produces: public/icon.png (sidebar logo) + build/icon.ico (Windows app icon).
import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { fileURLToPath } from 'node:url';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(root, '..', 'build', 'icon-source.png');
const outPng = path.join(root, '..', 'public', 'icon.png');
const outIco = path.join(root, '..', 'build', 'icon.ico');
const outMacPng = path.join(root, '..', 'build', 'icon.png'); // electron-builder → .icns on macOS

const meta = await sharp(src).metadata();
console.log(`Source icon: ${meta.width}x${meta.height} hasAlpha=${meta.hasAlpha}`);

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

// In-app sidebar logo: the raw PNG as-is (no mask, no background fill).
await sharp(src).resize(512, 512, { fit: 'contain', background: TRANSPARENT }).png().toFile(outPng);
console.log(`Wrote ${outPng} (raw, transparent-preserving)`);

// macOS icon source (electron-builder generates the .icns from this 1024px png).
await sharp(src).resize(1024, 1024, { fit: 'contain', background: TRANSPARENT }).png().toFile(outMacPng);
console.log(`Wrote ${outMacPng} (1024, for macOS .icns)`);

// Windows taskbar/app .ico: flatten onto white so the installed icon has an
// OPAQUE background (transparent corners otherwise look "see-through" on the
// dark taskbar). electron-builder needs sizes up to 256.
const WHITE = { r: 255, g: 255, b: 255 };
const sizes = [16, 24, 32, 48, 64, 128, 256];
const buffers = await Promise.all(
  sizes.map((s) => sharp(src).resize(s, s, { fit: 'cover' }).flatten({ background: WHITE }).png().toBuffer())
);
await writeFile(outIco, await pngToIco(buffers));
console.log(`Wrote ${outIco}`);
