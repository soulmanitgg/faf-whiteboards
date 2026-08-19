// One-off: recolor styles.css from the old blue accent to the FAF orange brand
// (Fresh Orange #E54C04, Air Orange #FFA548, Deep Brown #5B1C0D).
import fs from 'node:fs';

const file = new URL('../src/styles.css', import.meta.url);
let css = fs.readFileSync(file, 'utf8');

// rgba blue triplets → orange triplets (alpha preserved by keeping the trailing comma)
const rgbaMap = [
  [/rgba\(117,185,255,/g, 'rgba(255,165,72,'],
  [/rgba\(118,185,255,/g, 'rgba(255,165,72,'],
  [/rgba\(120,184,255,/g, 'rgba(255,165,72,'],
  [/rgba\(112,184,255,/g, 'rgba(255,165,72,'],
  [/rgba\(104,184,255,/g, 'rgba(255,165,72,'],
  [/rgba\(141,202,255,/g, 'rgba(255,181,107,'],
  [/rgba\(139,202,255,/g, 'rgba(255,181,107,'],
  [/rgba\(149,207,255,/g, 'rgba(255,181,107,'],
  [/rgba\(158,208,255,/g, 'rgba(255,181,107,'],
  [/rgba\(129,197,255,/g, 'rgba(255,190,120,'],
  [/rgba\(92,173,255,/g,  'rgba(229,120,40,'],
  [/rgba\(71,155,255,/g,  'rgba(229,100,30,'],
  [/rgba\(76,158,255,/g,  'rgba(229,110,35,'],
  [/rgba\(42,99,174,/g,   'rgba(150,60,20,'],
  [/rgba\(42,93,151,/g,   'rgba(150,70,30,'],
  [/rgba\(39,119,232,/g,  'rgba(229,76,4,'],
  [/rgba\(53,142,255,/g,  'rgba(229,110,40,'],
];
for (const [re, to] of rgbaMap) css = css.replace(re, to);

// hex accents → orange family (case-insensitive)
const hexMap = [
  ['#6bb6ff', '#ffa548'], ['#347cf0', '#e54c04'], ['#82c2ff', '#ffb86e'], ['#438af5', '#f2601a'],
  ['#75b9ff', '#ffa548'], ['#8dc8ff', '#ffb266'], ['#a9d4ff', '#ffc184'], ['#8fc7ff', '#ffbe7c'],
  ['#7fc3ef', '#ffa548'], ['#2563eb', '#e54c04'], ['#1d4ed8', '#c23e00'],
  // base gradient navy → warm dark
  ['#07111f', '#1a0f0a'], ['#10213a', '#241509'], ['#071524', '#150d09'],
  ['#0b1017', '#160f0b'], ['#07111f', '#1a0f0a'],
];
for (const [from, to] of hexMap) css = css.replaceAll(new RegExp(from, 'gi'), to);

fs.writeFileSync(file, css);
console.log('retheme done');
