import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';
import EvidenceItemCard from './EvidenceItemCard.jsx';
import LogEvidenceModal from './LogEvidenceModal.jsx';

export default function EvidenceSection({ caseId, actor, onToast, onChanged }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [logOpen, setLogOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getEvidenceList(caseId);
      setItems(data.evidence);
    } catch (e) {
      onToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [caseId, onToast]);

  useEffect(() => {
    load();
  }, [load]);

  const refreshAll = useCallback(async () => {
    await load();
    if (onChanged) await onChanged();
  }, [load, onChanged]);

  return (
    <div className="evidence-section">
      <div className="evidence-section__header">
        <p className="muted">
          Physical and digital evidence items, tracked by who currently has them and where.
        </p>
        {actor.canLogEvidence && (
          <button className="btn btn--primary btn--sm" onClick={() => setLogOpen(true)}>
            + Log New Evidence
          </button>
        )}
      </div>

      {loading && <p className="muted">Loading evidence…</p>}

      {!loading && items.length === 0 && (
        <div className="empty-state empty-state--inline">
          No evidence logged for this case yet.
          {actor.canLogEvidence
            ? ' Use "Log New Evidence" to add the first item — a drive, sample, or physical object.'
            : ''}
        </div>
      )}

      <div className="doc-list">
        {items.map((item) => (
          <EvidenceItemCard
            key={item.id}
            item={item}
            actor={actor}
            expanded={expandedId === item.id}
            onToggle={(id) => setExpandedId(expandedId === id ? null : id)}
            onChanged={refreshAll}
            onToast={onToast}
          />
        ))}
      </div>

      {logOpen && (
        <LogEvidenceModal
          caseId={caseId}
          actor={actor}
          onClose={() => setLogOpen(false)}
          onLogged={refreshAll}
          onToast={onToast}
        />
      )}
    </div>
  );
}
