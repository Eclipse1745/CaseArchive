import React, { useState } from 'react';
import { api } from '../api.js';
import { EVIDENCE_STATUSES } from '../constants.js';

export default function TransferCustodyForm({ item, actor, onDone, onToast }) {
  const [status, setStatus] = useState(item.status);
  const [custodian, setCustodian] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!custodian.trim() || !location.trim()) {
      onToast('Custodian and location are required to record a transfer.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await api.transferEvidence(item.id, { status, custodian, location, notes }, actor);
      onToast(`Custody of "${item.evidenceNumber}" updated.`, 'success');
      onDone();
    } catch (e2) {
      onToast(e2.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="transfer-form" onSubmit={handleSubmit}>
      <div className="transfer-form__grid">
        <label className="field">
          <span>New status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {EVIDENCE_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Transfer to (custodian)</span>
          <input
            type="text"
            placeholder="e.g. Forensics Lab, or SO Priya Rao"
            value={custodian}
            onChange={(e) => setCustodian(e.target.value)}
          />
        </label>
        <label className="field">
          <span>New location</span>
          <input
            type="text"
            placeholder="e.g. District Forensic Lab"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </label>
      </div>
      <label className="field">
        <span>Notes (optional)</span>
        <input
          type="text"
          placeholder="e.g. Handed over for DNA analysis"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>
      <div className="modal__actions">
        <button type="submit" className="btn btn--primary btn--sm" disabled={submitting}>
          {submitting ? 'Recording…' : 'Record Transfer'}
        </button>
      </div>
    </form>
  );
}
