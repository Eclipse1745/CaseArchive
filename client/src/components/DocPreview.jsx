import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function DocPreview({ doc, detail }) {
  const fileType = detail?.document?.fileType;
  const [src, setSrc] = useState(null);

  useEffect(() => {
    if (fileType !== 'pdf' && fileType !== 'image') return undefined;
    let cancelled = false;
    let objectUrl = null;
    api
      .fetchFileUrl(doc.id)
      .then((u) => {
        if (cancelled) URL.revokeObjectURL(u);
        else {
          objectUrl = u;
          setSrc(u);
        }
      })
      .catch(() => setSrc(null));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [doc.id, fileType]);

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
        {src ? <iframe src={src} title={doc.title} /> : <p className="muted">Loading preview…</p>}
      </div>
    );
  }

  if (fileType === 'image') {
    return (
      <div className="doc-viewer doc-viewer--image">
        {src ? <img src={src} alt={doc.title} /> : <p className="muted">Loading preview…</p>}
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
