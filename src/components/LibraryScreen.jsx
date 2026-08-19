import React, { useEffect, useMemo, useState } from 'react';
import BoardCard from './BoardCard.jsx';

const PAGE_SIZE = 12;

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'whiteboard', label: 'White' },
  { key: 'blueboard', label: 'Blue' },
  { key: 'chalkboard', label: 'Green' },
  { key: 'blackboard', label: 'Black' },
  { key: 'custom', label: 'Custom' },
];

export default function LibraryScreen({
  boards, allTypes, customTypes, filter, onFilter, tagFilter, onTagFilter, allTags = [],
  search, onSearch, onOpenBoard, onDeleteBoard, onImport, onHome, onNewBoard,
}) {
  const [sort, setSort] = useState('recent');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = boards.filter((b) => {
      const typeLabel = (allTypes[b.type]?.label || b.type).toLowerCase();
      const matchType =
        filter === 'all' ||
        b.type === filter ||
        (filter === 'custom' && !!customTypes[b.type]);
      const matchTag = !tagFilter || (b.tags || []).includes(tagFilter);
      const matchQ = !q || b.title.toLowerCase().includes(q) || typeLabel.includes(q) || (b.tags || []).some((t) => t.toLowerCase().includes(q));
      return matchType && matchTag && matchQ;
    });
    if (sort === 'alpha') list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    else if (sort === 'type') list = [...list].sort((a, b) => (allTypes[a.type]?.label || a.type).localeCompare(allTypes[b.type]?.label || b.type));
    else list = [...list].sort((a, b) => b.modified - a.modified);
    return list;
  }, [boards, allTypes, customTypes, filter, tagFilter, search, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  // Keep the current page valid when the result set shrinks.
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="screen screen-library">
      <div className="screen-header">
        <button className="ghost-back" onClick={onHome}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><path d="M10 3L5 8l5 5" /></svg>
          Home
        </button>
        <span className="screen-title">Manage boards</span>
        <button className="btn btn-primary btn-sm" onClick={onNewBoard}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" width="11" height="11"><line x1="8" y1="2" x2="8" y2="14" /><line x1="2" y1="8" x2="14" y2="8" /></svg>
          New board
        </button>
      </div>
      <div className="library-bar">
        <div className="lib-search">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="6.5" cy="6.5" r="4.5" /><line x1="10" y1="10" x2="14" y2="14" />
          </svg>
          <input
            type="text"
            placeholder="Search by name, type…"
            value={search}
            onChange={(e) => { onSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="filter-group">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={`filter-pill ${filter === f.key ? 'active' : ''}`}
              onClick={() => { onFilter(f.key); setPage(1); }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <select className="sort-select" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="recent">Most Recent</option>
          <option value="alpha">A → Z</option>
          <option value="type">By Type</option>
        </select>
        <button className="btn btn-ghost btn-sm lib-import" onClick={onImport}>Import…</button>
      </div>

      {allTags.length > 0 && (
        <div className="lib-tags">
          <span className="lib-tags-label">Tags:</span>
          {allTags.map((t) => (
            <button
              key={t}
              className={`tag-chip ${tagFilter === t ? 'active' : ''}`}
              onClick={() => { onTagFilter(tagFilter === t ? null : t); setPage(1); }}
            >{t}</button>
          ))}
          {tagFilter && <button className="tag-chip tag-clear" onClick={() => { onTagFilter(null); setPage(1); }}>Clear ✕</button>}
        </div>
      )}

      {pageItems.length ? (
        <div className="boards-grid">
          {pageItems.map((b) => (
            <BoardCard key={b.id} board={b} type={allTypes[b.type]} onOpen={onOpenBoard} onDelete={onDeleteBoard} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-title">No boards found</div>
          <div className="empty-sub">Try a different filter or search</div>
        </div>
      )}

      <div className="lib-footer">
        <span className="lib-count">{filtered.length} board{filtered.length !== 1 ? 's' : ''}</span>
        {totalPages > 1 && (
          <div className="pagination">
            <button className="page-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
            {pageNumbers.map((n) => (
              <button key={n} className={`page-btn ${page === n ? 'active' : ''}`} onClick={() => setPage(n)}>{n}</button>
            ))}
            <button className="page-btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
          </div>
        )}
      </div>
    </div>
  );
}
