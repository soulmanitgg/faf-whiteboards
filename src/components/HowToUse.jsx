import React, { useEffect, useState } from 'react';
import { asset } from '../data/boardTypes.js';

// Official Excalidraw tutorial videos on YouTube — we point to the ones the
// Excalidraw team already made rather than reinventing them.
const VIDEOS = [
  { id: 'MayTRZAh0QE', title: 'Basic shapes', tag: 'Tutorial #1', icon: 'tutorial/shapes.png' },
  { id: 'flAkxOidX5Q', title: 'The line tool', tag: 'Tutorial #3', icon: 'tutorial/lines.png' },
  { id: 'h4tEcQUHsCE', title: 'The text tool', tag: 'Tutorial #4', icon: 'tutorial/text.png' },
  { id: 'XBvPQAOjDVc', title: 'Creating charts', tag: 'Tutorial #7', icon: 'tutorial/charts.png' },
  { id: '8qs4V8AmOBA', title: 'Working with elements', tag: 'Tutorial #17', icon: 'tutorial/arrows.png' },
];

function openInBrowser(id) {
  // Electron opens http(s) links in the system browser via the window-open handler.
  window.open(`https://www.youtube.com/watch?v=${id}`, '_blank', 'noopener');
}

// In-app YouTube player overlay, with an "Open in browser" escape hatch.
function VideoModal({ video, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="video-modal-bg" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="video-modal">
        <div className="video-modal-head">
          <span className="video-modal-title">{video.title}</span>
          <div className="video-modal-actions">
            <button className="ed-btn ed-btn-ghost" onClick={() => openInBrowser(video.id)}>Open in browser ↗</button>
            <button className="video-modal-close" onClick={onClose} aria-label="Close">✕</button>
          </div>
        </div>
        <div className="video-modal-frame">
          {/* Clean embed player. Works because the app is served from a real
              http origin (127.0.0.1) rather than file://. */}
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}

export default function HowToUse({ onHome, onNewBoard, onManageBoards }) {
  const [playing, setPlaying] = useState(null);
  return (
    <div className="screen how-to">
      <div className="screen-header">
        <button className="ghost-back" onClick={onHome}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><path d="M10 3L5 8l5 5" /></svg>
          Home
        </button>
        <span className="screen-title">How to use</span>
        <span className="screen-header-spacer" />
      </div>

      <div className="how-to-body">
        <p className="how-to-intro">Quick video guides from the Excalidraw team. Click any card to watch it right here.</p>

        <div className="how-to-grid">
          {VIDEOS.map((v) => (
            <button className="video-card" key={v.id} onClick={() => setPlaying(v)}>
              <div className="video-thumb">
                <img className="video-icon" src={asset(v.icon)} alt="" />
                <span className="video-play">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M8 5v14l11-7z" /></svg>
                </span>
              </div>
              <div className="video-meta">
                <span className="video-title">{v.title}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="how-to-actions">
          <button className="btn btn-primary" onClick={() => onNewBoard()}>Start a new board</button>
          <button className="btn btn-ghost" onClick={onManageBoards}>Manage boards</button>
        </div>
      </div>

      {playing && <VideoModal video={playing} onClose={() => setPlaying(null)} />}
    </div>
  );
}
