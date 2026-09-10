import React from 'react';

export default function AboutPanel({ onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
        <h2>About Case Archive</h2>
        <p className="muted">
          Case Archive tracks the full lifecycle of case documents and physical evidence, with a
          verifiable chain of custody for both.
        </p>

        <h3>Core capabilities</h3>
        <ul>
          <li>Documents are fingerprinted with SHA-256 the moment they're sealed into a case.</li>
          <li>Each document forms a block in a per-case hash chain, so any change after sealing is detectable.</li>
          <li>Integrity checks recompute the current hash on demand and compare it against the sealed fingerprint.</li>
          <li>A full audit trail records every action taken on a case, document, or evidence item.</li>
          <li>Document insights (dates, names, flagged terms) are extracted automatically on upload.</li>
          <li>Evidence items carry an append-only custody log — every transfer of custodian or location is recorded permanently.</li>
          <li>Inline preview for text, PDF, and image formats.</li>
        </ul>

        <h3>Roadmap</h3>
        <ul>
          <li>Password-based authentication and single sign-on.</li>
          <li>Multi-node verification for distributed deployments.</li>
          <li>NLP-based document analysis, extending today's pattern-based extraction.</li>
          <li>Encryption at rest.</li>
        </ul>

        <div className="modal__actions">
          <button className="btn btn--primary" onClick={onClose}>Got it</button>
        </div>
      </div>
    </div>
  );
}
