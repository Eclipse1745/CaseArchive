import React from 'react';

const ACTION_LABEL = {
  CASE_CREATED: 'Case Filed',
  DOCUMENT_SEALED: 'Sealed',
  DOCUMENT_UPLOADED: 'Uploaded',
  DOCUMENT_DOWNLOADED: 'Downloaded',
  INTEGRITY_VERIFIED_PASS: 'Verify · Pass',
  INTEGRITY_VERIFIED_FAIL: 'Verify · Fail',
  TAMPER_SIMULATED: 'Integrity Self-Test',
  DOCUMENT_RESTORED: 'Restored',
  EVIDENCE_LOGGED: 'Evidence Logged',
  EVIDENCE_CUSTODY_UPDATED: 'Custody Transfer',
};

const ACTION_CLASS = {
  CASE_CREATED: 'tag--brass',
  DOCUMENT_SEALED: 'tag--brass',
  DOCUMENT_UPLOADED: 'tag--brass',
  DOCUMENT_DOWNLOADED: 'tag--neutral',
  INTEGRITY_VERIFIED_PASS: 'tag--green',
  INTEGRITY_VERIFIED_FAIL: 'tag--red',
  TAMPER_SIMULATED: 'tag--red',
  DOCUMENT_RESTORED: 'tag--amber',
  EVIDENCE_LOGGED: 'tag--brass',
  EVIDENCE_CUSTODY_UPDATED: 'tag--amber',
};

export default function AuditTrail({ entries }) {
  if (entries.length === 0) {
    return <p className="muted">No activity recorded yet for this case.</p>;
  }
  return (
    <div className="audit-trail">
      {entries.map((e) => (
        <div className="audit-row" key={e.id}>
          <span className="audit-row__time">
            {new Date(e.timestamp).toLocaleString(undefined, {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
            })}
          </span>
          <span className={`tag ${ACTION_CLASS[e.action] || 'tag--neutral'}`}>
            {ACTION_LABEL[e.action] || e.action}
          </span>
          <span className="audit-row__actor">{e.actorName} <em>({e.actorRole})</em></span>
          <span className="audit-row__details">{e.details}</span>
        </div>
      ))}
    </div>
  );
}
