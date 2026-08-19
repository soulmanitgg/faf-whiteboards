import React from 'react';
import { asset } from '../data/boardTypes.js';

export default function HomeLauncher({ boardCount, onNewBoard, onTemplates, onManageBoards, onSettings, onTutorial }) {
  return (
    <div className="launcher">
      <div className="launcher-brand">
        <img className="launcher-logo" src={asset('icon.png')} alt="" />
        <span className="launcher-name">FAF Whiteboards</span>
      </div>

      <div className="launcher-center">
        <h1 className="launcher-hero-text">Where should we start?</h1>

        <div className="launcher-cards">
          <button className="launch-card launch-card-primary" onClick={() => onNewBoard()}>
            <img className="launch-card-icon" src={asset('newboard.png')} alt="" />
            <span className="launch-card-title">New board</span>
            <span className="launch-card-sub">start a fresh whiteboard</span>
          </button>

          <button className="launch-card" onClick={onTemplates}>
            <img className="launch-card-icon" src={asset('template.png')} alt="" />
            <span className="launch-card-title">Start with a template</span>
            <span className="launch-card-sub">kanban, flowchart, planner &amp; more</span>
          </button>

          <button className="launch-card" onClick={onManageBoards}>
            <img className="launch-card-icon" src={asset('manageboards.png')} alt="" />
            <span className="launch-card-title">Manage boards</span>
            <span className="launch-card-sub">{boardCount} board{boardCount !== 1 ? 's' : ''} in your library</span>
          </button>
        </div>
      </div>

      <div className="launcher-foot">
        <button className="launch-pill" onClick={onSettings}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="8" cy="8" r="2.2" /><path d="M8 1.5v1.6M8 12.9v1.6M14.5 8h-1.6M3.1 8H1.5M12.6 3.4l-1.1 1.1M4.5 11.5l-1.1 1.1M12.6 12.6l-1.1-1.1M4.5 4.5L3.4 3.4" strokeLinecap="round" /></svg>
          Settings
        </button>
        <button className="launch-pill" onClick={onTutorial}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="8" cy="8" r="6.5" /><path d="M6.3 6.2a1.8 1.8 0 113.1 1.2c-.6.5-1.4.7-1.4 1.6M8 11.4v.1" strokeLinecap="round" /></svg>
          Tutorial
        </button>
      </div>
    </div>
  );
}
