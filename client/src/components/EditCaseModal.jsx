import React, { useState } from 'react';
import { api } from '../api.js';
import { CASE_STATUSES } from '../constants.js';

export default function EditCaseModal({ caseData, onClose, onSaved, onToast }) {
  const [status, setStatus] = useState(caseData.status);
  const [description, setDescription] = useState(caseData.description || '');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.updateCase(caseData.id, { status, description });
      onToast('Case updated.', 'success');
      await onSaved();
      onClose();
    } catch (err) {
      onToast(err.message, 'error');
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Edit case {caseData.caseNumber}</h2>
        <p className="muted">The case number and title stay fixed. Every edit is written to the audit trail.</p>
        <form onSubmit={handleSubmit}>
          <label className="field">
            <span>Status</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {CASE_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Description</span>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <div className="modal__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn--primary" disabled={busy}>
              {busy ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
