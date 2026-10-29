import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import DocPreview from './DocPreview.jsx';

function shortHash(h) {
  if (!h) return '—';
  return `${h.slice(0, 10)}…${h.slice(-6)}`;
}

export default function DocumentCard({ doc, actor, expanded, onToggle, onChanged, onToast }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const compromised = !doc.contentVerified || !doc.linkIntact;

  useEffect(() => {
    if (expanded && !detail) {
      setLoading(true);
      api
        .getDocument(doc.id)
        .then(setDetail)
        .catch((e) => onToast(e.message, 'error'))
        .finally(() => setLoading(false));
    }
  }, [expanded, doc.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (expanded) {
      api.getDocument(doc.id).then(setDetail).catch(() => {});
    }
  }, [doc.contentVerified, doc.linkIntact]); // eslint-disable-line react-hooks/exhaustive-deps

  const runAction = async (fn, successMsg) => {
    setBusy(true);
    try {
      await fn();
      await onChanged();
      onToast(successMsg, 'success');
    } catch (e) {
      onToast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`doc-card ${compromised ? 'doc-card--compromised' : ''}`}>
      <button className="doc-card__header" onClick={() => onToggle(doc.id)}>
        <div className="doc-card__heading">
          <span className="doc-card__type">{doc.docType}</span>
          <span className="doc-card__title">{doc.title}</span>
          <span className="doc-card__meta">
            Sealed {new Date(doc.sealedAt).toLocaleDateString()} · block #{doc.chainIndex} · {doc.uploader}
          </span>
        </div>
        <span className={`stamp ${compromised ? 'stamp--bad' : 'stamp--ok'}`}>
          {compromised ? 'Compromised' : 'Verified'}
        </span>
      </button>

      {expanded && (
        <div className="doc-card__body">
          {loading && <p className="muted">Loading document…</p>}

          {!loading && detail && (
            <>
              <div className="hash-grid">
                <div>
                  <span className="hash-grid__label">Sealed hash (SHA-256)</span>
                  <code>{shortHash(doc.originalHash)}</code>
                </div>
                <div>
                  <span className="hash-grid__label">Current hash</span>
                  <code className={compromised ? 'hash-mismatch' : ''}>{shortHash(doc.currentHash)}</code>
                </div>
                <div>
                  <span className="hash-grid__label">Chain link</span>
                  <code className={!doc.linkIntact ? 'hash-mismatch' : ''}>{doc.linkIntact ? 'Intact' : 'Broken'}</code>
                </div>
              </div>

              {compromised && (
                <div className="alert alert--danger">
                  Integrity check failed — the bytes on disk no longer match the sealed fingerprint
                  recorded at {new Date(doc.sealedAt).toLocaleString()}. This document has been altered
                  since it was sealed.
                </div>
              )}

              <DocPreview doc={doc} detail={detail} />

              {detail.insights && (
                <div className="insights">
                  <div className="insights__title">
                    Document insights <span className="insights__tag">rule-based, offline</span>
                  </div>
                  <div className="insights__chips">
                    {detail.insights.dates.map((d) => (
                      <span className="chip chip--date" key={d}>{d}</span>
                    ))}
                    {detail.insights.likelyNames.map((n) => (
                      <span className="chip chip--name" key={n}>{n}</span>
                    ))}
                    {detail.insights.flaggedKeywords.map((k) => (
                      <span className="chip chip--keyword" key={k}>{k}</span>
                    ))}
                    {detail.insights.dates.length === 0 &&
                      detail.insights.likelyNames.length === 0 &&
                      detail.insights.flaggedKeywords.length === 0 && (
                        <span className="muted">No patterns detected.</span>
                      )}
                  </div>
                </div>
              )}

              <div className="doc-card__actions">
                <button
                  className="btn btn--outline btn--sm"
                  disabled={busy}
                  onClick={() => runAction(() => api.verifyDocument(doc.id, actor), 'Integrity check complete.')}
                >
                  Verify Integrity
                </button>
                <a className="btn btn--outline btn--sm" href={api.downloadUrl(doc.id)}>
                  Download
                </a>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
