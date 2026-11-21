import React, { useState } from 'react';
import ChainVisual from './ChainVisual.jsx';
import DocumentCard from './DocumentCard.jsx';
import AuditTrail from './AuditTrail.jsx';
import UploadModal from './UploadModal.jsx';
import EvidenceSection from './EvidenceSection.jsx';
import EditCaseModal from './EditCaseModal.jsx';
import CaseReport from './CaseReport.jsx';
import { api } from '../api.js';

export default function CaseView({ caseDetail, auditEntries, loading, actor, onChanged, onToast }) {
  const [expandedId, setExpandedId] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [tab, setTab] = useState('documents');
  const [editOpen, setEditOpen] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [verifyingAll, setVerifyingAll] = useState(false);

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

  const handleVerifyAll = async () => {
    setVerifyingAll(true);
    try {
      const r = await api.verifyAll(c.id);
      if (r.total === 0) onToast('No documents to verify yet.', 'info');
      else if (r.failed === 0 && r.chainIntact) onToast(`All ${r.total} document(s) verified — chain intact.`, 'success');
      else onToast(`${r.failed} of ${r.total} document(s) failed verification.`, 'error');
      await onChanged();
    } catch (e) {
      onToast(e.message, 'error');
    } finally {
      setVerifyingAll(false);
    }
  };

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

      {!actor.canCreateCase && (
        <div className="readonly-banner">
          Read-only review — signed in as {actor.label}. You can verify, download and read the audit
          trail, but not change any record.
        </div>
      )}

      <div className="case-view__tools">
        <button className="btn btn--outline btn--sm" onClick={handleVerifyAll} disabled={verifyingAll}>
          {verifyingAll ? 'Verifying…' : 'Verify All Documents'}
        </button>
        <button className="btn btn--outline btn--sm" onClick={() => setPrinting(true)} disabled={printing}>
          Print Case Report
        </button>
        {actor.canCreateCase && (
          <button className="btn btn--outline btn--sm" onClick={() => setEditOpen(true)}>
            Edit Case
          </button>
        )}
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

      {editOpen && (
        <EditCaseModal caseData={c} onClose={() => setEditOpen(false)} onSaved={onChanged} onToast={onToast} />
      )}
      {printing && (
        <CaseReport
          caseDetail={caseDetail}
          auditEntries={auditEntries}
          actor={actor}
          onDone={() => {
            setPrinting(false);
            onChanged();
          }}
          onToast={onToast}
        />
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
