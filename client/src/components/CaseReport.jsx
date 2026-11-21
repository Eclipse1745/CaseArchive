import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api.js';

// Printable case record. It re-verifies every document first, so the printed result is fresh,
// then opens the browser's print dialog (choose "Save as PDF").
export default function CaseReport({ caseDetail, auditEntries, actor, onDone, onToast }) {
  const [data, setData] = useState(null);
  const { case: c, documents } = caseDetail;

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.verifyAll(c.id), api.getEvidenceList(c.id)])
      .then(([verification, ev]) => {
        if (cancelled) return;
        setData({ verification, evidence: ev.evidence, at: new Date() });
      })
      .catch((e) => {
        onToast(e.message, 'error');
        onDone();
      });
    return () => {
      cancelled = true;
    };
  }, [c.id]);

  useEffect(() => {
    if (!data) return undefined;
    const t = setTimeout(() => {
      window.print();
      onDone();
    }, 300);
    return () => clearTimeout(t);
  }, [data]);

  if (!data) return null;
  const { verification, evidence, at } = data;
  const failed = new Set(verification.failedDocumentIds);
  const ok = verification.failed === 0 && verification.chainIntact;
  const fmt = (v) => new Date(v).toLocaleString();

  return createPortal(
    <div className="print-report">
      <h1>Case Report — {c.caseNumber}</h1>
      <p>
        {c.title}<br />
        Status: {c.status} · Filed {fmt(c.createdAt)} by {c.createdBy}<br />
        {c.description}
      </p>
      <p className="print-report__meta">Generated {at.toLocaleString()} by {actor.name} ({actor.label})</p>

      <h2>Chain verification</h2>
      <p className={ok ? 'print-ok' : 'print-bad'}>
        <strong>{ok ? 'VERIFIED' : 'COMPROMISED'}</strong> — {verification.total - verification.failed} of{' '}
        {verification.total} document(s) match their sealed fingerprint; hash chain{' '}
        {verification.chainIntact ? 'intact' : 'broken'}. Checked {at.toLocaleString()}.
      </p>

      <h2>Sealed documents</h2>
      <table>
        <thead>
          <tr><th>#</th><th>Title</th><th>Type</th><th>Sealed</th><th>Uploaded by</th><th>Result</th></tr>
        </thead>
        <tbody>
          {documents.map((d) => (
            <React.Fragment key={d.id}>
              <tr>
                <td>{d.chainIndex}</td><td>{d.title}</td><td>{d.docType}</td>
                <td>{fmt(d.sealedAt)}</td><td>{d.uploader}</td>
                <td>{failed.has(d.id) ? 'ALTERED' : 'Verified'}</td>
              </tr>
              <tr>
                <td></td>
                <td colSpan="5" className="print-hash">
                  SHA-256: {d.originalHash}<br />Block: {d.blockHash}
                </td>
              </tr>
            </React.Fragment>
          ))}
          {documents.length === 0 && <tr><td colSpan="6">No documents sealed.</td></tr>}
        </tbody>
      </table>

      <h2>Evidence and custody</h2>
      {evidence.length === 0 && <p>No evidence logged.</p>}
      {evidence.map((e) => (
        <div key={e.id} className="print-evidence">
          <strong>{e.evidenceNumber}</strong> — {e.itemType}: {e.description}<br />
          Now: {e.status}, with {e.currentCustodian} ({e.currentLocation})
          <ul>
            {e.custodyLog.map((l) => (
              <li key={l.id}>{fmt(l.timestamp)} — {l.status}, {l.custodian}, {l.location} (by {l.actorName})</li>
            ))}
          </ul>
        </div>
      ))}

      <h2>Audit trail</h2>
      <p>Names are typed by each user and are not verified.</p>
      <table>
        <thead><tr><th>Time</th><th>Action</th><th>By</th><th>Details</th></tr></thead>
        <tbody>
          {auditEntries.map((a) => (
            <tr key={a.id}>
              <td>{fmt(a.timestamp)}</td><td>{a.action}</td><td>{a.actorName} ({a.actorRole}){a.actorNote ? ` · ${a.actorNote}` : ''}</td><td>{a.details}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="print-report__meta">
        Method: SHA-256 fingerprints; block_hash = SHA-256(chainIndex | prevBlockHash | originalHash | sealedAt | documentId).
      </p>
    </div>,
    document.body
  );
}
