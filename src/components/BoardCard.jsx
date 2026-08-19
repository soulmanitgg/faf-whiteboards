import React from 'react';
import BoardBackground from './BoardBackground.jsx';
import { relativeTime } from '../utils.js';

export default function BoardCard({ board, type, onOpen, onDelete }) {
  const t = type || { label: 'Custom', chipClass: 'chip-custom', bg: '#333', texture: null };
  return (
    <div className="board-card" onClick={() => onOpen(board.id)} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen(board.id); }}>
      <div className="board-thumb">
        {board.cover
          ? <img src={board.cover} alt="" />
          : <BoardBackground type={t} variant="card" />}
      </div>
      <div className="board-info">
        <div className="board-name" title={board.title}>{board.title}</div>
        <div className="board-meta">{relativeTime(board.modified)}</div>
        {board.tags?.length > 0 && (
          <div className="board-tags">
            {board.tags.slice(0, 3).map((t) => <span key={t} className="board-tag">{t}</span>)}
            {board.tags.length > 3 && <span className="board-tag more">+{board.tags.length - 3}</span>}
          </div>
        )}
        <div className="board-info-foot">
          <span className={`board-type-chip ${t.chipClass || 'chip-custom'}`}>{t.label || board.type}</span>
          {onDelete && (
            <button
              className="board-del"
              title="Delete board"
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`Delete "${board.title}"? This can't be undone.`)) onDelete(board.id);
              }}
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="13" height="13">
                <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
