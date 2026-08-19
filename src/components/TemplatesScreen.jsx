import React from 'react';
import { TEMPLATES } from '../data/templates.js';

export default function TemplatesScreen({ onHome, onPick }) {
  return (
    <div className="screen templates-screen">
      <div className="screen-header">
        <button className="ghost-back" onClick={onHome}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><path d="M10 3L5 8l5 5" /></svg>
          Home
        </button>
        <span className="screen-title">Start with a template</span>
        <span className="screen-header-spacer" />
      </div>

      <div className="templates-body">
        <p className="templates-intro">Pick a starting point — it opens as a new board you can make your own.</p>
        <div className="templates-grid">
          {TEMPLATES.map((t) => (
            <button className="template-card" key={t.id} onClick={() => onPick(t)}>
              <div className={`template-thumb tpl-${t.id}`} aria-hidden="true" />
              <div className="template-meta">
                <span className="template-name">{t.name}</span>
                <span className="template-desc">{t.desc}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
