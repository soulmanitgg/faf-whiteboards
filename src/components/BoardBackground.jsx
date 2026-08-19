import React from 'react';
import { asset } from '../data/boardTypes.js';

// Renders a board's canvas background for a given context:
//   variant 'editor' → full live background behind the Excalidraw canvas
//   variant 'tile'   → live preview in the "Choose your canvas" / picker tiles
//   variant 'card'   → lightweight thumbnail (video → poster still, to avoid
//                      running many <video>s at once in the library grid)
export default function BoardBackground({ type, variant = 'tile' }) {
  if (!type) return <div className="bg-solid" style={{ background: '#333' }} />;

  // Animated video canvas
  if (type.kind === 'video') {
    if (variant === 'card') {
      return <img className="bg-fill" src={asset(type.poster)} alt="" style={{ background: type.bg }} />;
    }
    return (
      <video
        className="bg-fill bg-video"
        autoPlay muted loop playsInline preload="auto"
        poster={type.poster ? asset(type.poster) : undefined}
        style={{ background: type.bg }}
      >
        <source src={asset(`${type.video}.webm`)} type="video/webm" />
        <source src={asset(`${type.video}.mp4`)} type="video/mp4" />
      </video>
    );
  }

  // Animated CSS canvas (e.g. aurora) — cheap enough to run everywhere
  if (type.kind === 'css') {
    return <div className={`bg-fill bg-anim bg-${type.css}`} style={{ background: type.bg }} />;
  }

  // Static texture image
  if (type.texture) {
    return <img className="bg-fill" src={asset(type.texture)} alt="" style={{ background: type.bg }} />;
  }

  // Solid color
  return <div className="bg-solid" style={{ background: type.bg }} />;
}
