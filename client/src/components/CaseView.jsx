import React, { useState } from 'react';
import ChainVisual from './ChainVisual.jsx';
import DocumentCard from './DocumentCard.jsx';
import AuditTrail from './AuditTrail.jsx';
import UploadModal from './UploadModal.jsx';
import EvidenceSection from './EvidenceSection.jsx';

export default function CaseView({ caseDetail, auditEntries, loading, actor, onChanged, onToast }) {
  const [expandedId, setExpandedId] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [tab, setTab] = useState('documents');

  if (loading && !caseDetail) {
    return <div className="empty-state">Loading case file…</div>;
  }
  if (!caseDetail) {
    return (
      <div className="empty-state">
        No case selected. File a new case from the sidebar, or pick one from the index.
      </div>
    );
  }

  const { case: c, documents, chain } = caseDetail;
  const compromised = c.integrityStatus !== 'verified';
  const hasDocuments = documents.length > 0;

  return (
    <div className="case-view">
      <div className="case-view__header">
        <div>
          <div className="case-view__number">{c.caseNumber}</div>
          <h2>{c.title}</h2>
          <p className="muted">{c.description || 'No description provided.'}</p>
        </div>
        <div className={`integrity-banner ${compromised ? 'integrity-banner--bad' : 'integrity-banner--ok'}`}>
          <span className="integrity-banner__icon">{compromised ? '✕' : '✓'}</span>
          <div>
            <strong>{compromised ? 'Chain of custody compromised' : hasDocuments ? 'Chain of custody verified' : 'No documents sealed yet'}</strong>
            <span>{documents.length} sealed documents · chain {chain.chainIntact ? 'intact' : 'broken'}</span>
          </div>
        </div>
      </div>

      {hasDocuments ? (
        <ChainVisual documents={documents} activeId={expandedId} onSelect={setExpandedId} />
      ) : (
        <div className="empty-state empty-state--inline">
          No documents sealed into this case yet. Seal the first one below to start its hash chain.
        </div>
      )}

      <div className="case-view__tabs">
        <button className={tab === 'documents' ? 'tab tab--active' : 'tab'} onClick={() => setTab('documents')}>
          Documents
        </button>
        <button className={tab === 'evidence' ? 'tab tab--active' : 'tab'} onClick={() => setTab('evidence')}>
          Evidence
        </button>
        <button className={tab === 'audit' ? 'tab tab--active' : 'tab'} onClick={() => setTab('audit')}>
          Audit Trail
        </button>
        {tab === 'documents' && actor.canUpload && (
          <button className="btn btn--primary btn--sm case-view__upload" onClick={() => setUploadOpen(true)}>
            + Seal New Document
          </button>
        )}
      </div>

      {tab === 'documents' && (
        <div className="doc-list">
          {documents.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              actor={actor}
              expanded={expandedId === doc.id}
              onToggle={(id) => setExpandedId(expandedId === id ? null : id)}
              onChanged={onChanged}
              onToast={onToast}
            />
          ))}
        </div>
      )}

      {tab === 'evidence' && (
        <EvidenceSection caseId={c.id} actor={actor} onToast={onToast} onChanged={onChanged} />
      )}

      {tab === 'audit' && (
        <div className="audit-panel">
          <AuditTrail entries={auditEntries} />
        </div>
      )}

      {uploadOpen && (
        <UploadModal
          caseId={c.id}
          actor={actor}
          onClose={() => setUploadOpen(false)}
          onUploaded={onChanged}
          onToast={onToast}
        />
      )}
    </div>
  );
}
