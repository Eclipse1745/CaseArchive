import React, { useState } from 'react';
import { api } from '../api.js';
import { EVIDENCE_TYPES, EVIDENCE_STATUSES } from '../constants.js';

export default function LogEvidenceModal({ caseId, actor, onClose, onLogged, onToast }) {
  const [evidenceNumber, setEvidenceNumber] = useState('');
  const [itemType, setItemType] = useState(EVIDENCE_TYPES[0]);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState(EVIDENCE_STATUSES[0]);
  const [custodian, setCustodian] = useState(actor.name);
  const [location, setLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!evidenceNumber.trim() || !description.trim()) {
      onToast('Evidence number and description are required.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await api.createEvidence(
        caseId,
        { evidenceNumber, itemType, description, status, custodian, location },
        actor
      );
      onToast(`Evidence "${evidenceNumber}" logged.`, 'success');
      onLogged();
      onClose();
    } catch (e2) {
      onToast(e2.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Log new evidence</h2>
        <p className="muted">
          Track a physical or digital item — a drive, sample, object, or recording — and who
          currently has it.
        </p>
        <form onSubmit={handleSubmit}>
          <label className="field">
            <span>Evidence number / tag</span>
            <input
              type="text"
              placeholder='e.g. "EX-14" or "514"'
              value={evidenceNumber}
              onChange={(e) => setEvidenceNumber(e.target.value)}
              autoFocus
            />
          </label>
          <label className="field">
            <span>Item type</span>
            <select value={itemType} onChange={(e) => setItemType(e.target.value)}>
              {EVIDENCE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Description</span>
            <input
              type="text"
              placeholder="e.g. USB recording drive from patrol car dashcam"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Current status</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {EVIDENCE_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Currently with (custodian)</span>
            <input
              type="text"
              placeholder="e.g. SI Kabir Malhotra, or Forensics Lab"
              value={custodian}
              onChange={(e) => setCustodian(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Location</span>
            <input
              type="text"
              placeholder="e.g. Evidence Locker A3, or District Forensic Lab"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </label>
          <div className="modal__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? 'Logging…' : 'Log Evidence'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
