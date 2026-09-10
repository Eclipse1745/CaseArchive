import React from 'react';
import { api } from '../api.js';

export default function DocPreview({ doc, detail }) {
  const fileType = detail?.document?.fileType;

  if (fileType === 'text') {
    return (
      <div className="doc-viewer">
        <pre>{detail.content}</pre>
      </div>
    );
  }

  if (fileType === 'pdf') {
    return (
      <div className="doc-viewer doc-viewer--pdf">
        <iframe src={api.viewUrl(doc.id)} title={doc.title} />
      </div>
    );
  }

  if (fileType === 'image') {
    return (
      <div className="doc-viewer doc-viewer--image">
        <img src={api.viewUrl(doc.id)} alt={doc.title} />
      </div>
    );
  }

  return (
    <div className="doc-viewer doc-viewer--fallback">
      <p>
        No inline preview for this file type yet — use <strong>Download</strong> to open it, or{' '}
        <strong>Verify Integrity</strong> to check its fingerprint without opening it.
      </p>
    </div>
  );
}
