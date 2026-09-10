import React, { useState } from 'react';
import { api } from '../api.js';
import { DOC_TYPES } from '../constants.js';

export default function UploadModal({ caseId, actor, onClose, onUploaded, onToast }) {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      onToast('Choose a file to seal into the case.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title || file.name);
      formData.append('docType', docType);
      await api.uploadDocument(caseId, formData, actor);
      onToast('Document hashed and sealed into the case chain.', 'success');
      onUploaded();
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
        <h2>Seal a new document</h2>
        <p className="muted">
          The file is hashed with SHA-256 the moment it's added and becomes the next block in this
          case's chain. Any later change to its bytes will be detectable.
        </p>
        <form onSubmit={handleSubmit}>
          <label className="field">
            <span>Document type</span>
            <select value={docType} onChange={(e) => setDocType(e.target.value)}>
              {DOC_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Title</span>
            <input
              type="text"
              placeholder="e.g. Supplementary Witness Statement"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="field">
            <span>File</span>
            <input type="file" onChange={(e) => setFile(e.target.files[0])} />
          </label>
          <div className="modal__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? 'Sealing…' : 'Seal Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
