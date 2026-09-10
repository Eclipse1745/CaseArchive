import React from 'react';

export default function CaseSidebar({ cases, loading, selectedCaseId, onSelect, canCreateCase, onNewCase }) {
  return (
    <aside className="case-sidebar">
      <div className="case-sidebar__top">
        <div className="case-sidebar__heading">Case Index</div>
        {canCreateCase && (
          <button className="btn btn--outline btn--sm case-sidebar__new" onClick={onNewCase}>
            + New Case
          </button>
        )}
      </div>

      {loading && <div className="case-sidebar__empty">Loading cases…</div>}
      {!loading && cases.length === 0 && (
        <div className="case-sidebar__empty">
          No cases yet.
          {canCreateCase ? ' File your first case to get started.' : ' Ask an investigator to file a case.'}
        </div>
      )}

      <nav className="case-sidebar__list">
        {cases.map((c) => (
          <button
            key={c.id}
            className={`case-tab ${c.id === selectedCaseId ? 'case-tab--active' : ''}`}
            onClick={() => onSelect(c.id)}
          >
            <span
              className={`status-dot ${c.integrityStatus === 'verified' ? 'status-dot--ok' : 'status-dot--bad'}`}
              title={c.integrityStatus === 'verified' ? 'All documents verified' : 'Integrity issue detected'}
            />
            <span className="case-tab__body">
              <span className="case-tab__number">{c.caseNumber}</span>
              <span className="case-tab__title">{c.title}</span>
              <span className="case-tab__meta">{c.documentCount} documents · {c.evidenceCount} evidence</span>
            </span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
