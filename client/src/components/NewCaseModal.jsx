import React, { useState } from 'react';
import { api } from '../api.js';
import { CASE_STATUSES } from '../constants.js';

export default function NewCaseModal({ actor, onClose, onCreated, onToast }) {
  const [caseNumber, setCaseNumber] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState(CASE_STATUSES[0]);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!caseNumber.trim() || !title.trim()) {
      onToast('Case number and title are required.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const { case: created } = await api.createCase(
        { caseNumber, title, description, status },
        actor
      );
      onToast(`Case "${created.caseNumber}" filed.`, 'success');
      onCreated(created.id);
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
        <h2>File a new case</h2>
        <p className="muted">
          This creates an empty case file. You'll add documents and evidence to it yourself
          from the case view.
        </p>
        <form onSubmit={handleSubmit}>
          <label className="field">
            <span>Case number</span>
            <input
              type="text"
              placeholder="e.g. FIR-2026-0142"
              value={caseNumber}
              onChange={(e) => setCaseNumber(e.target.value)}
              autoFocus
            />
          </label>
          <label className="field">
            <span>Title</span>
            <input
              type="text"
              placeholder="e.g. Theft at Green Park Market"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Description</span>
            <input
              type="text"
              placeholder="Brief summary of the case"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Status</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {CASE_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <div className="modal__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? 'Filing…' : 'File Case'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
