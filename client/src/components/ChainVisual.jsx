import React from 'react';

const TYPE_INITIALS = {
  FIR: 'FIR',
  'Witness Statement': 'WS',
  'Forensic Report': 'FR',
  'Charge Sheet': 'CS',
  'Evidence Log': 'EL',
  'Court Filing': 'CF',
  Other: 'DOC',
};

export default function ChainVisual({ documents, activeId, onSelect }) {
  return (
    <div className="chain-visual" role="list" aria-label="Document hash chain">
      {documents.map((doc, i) => {
        const broken = !doc.contentVerified || !doc.linkIntact;
        const nextBroken = documents[i + 1] && (!documents[i + 1].contentVerified || !documents[i + 1].linkIntact);
        return (
          <React.Fragment key={doc.id}>
            <button
              role="listitem"
              className={`chain-link ${broken ? 'chain-link--broken' : 'chain-link--ok'} ${doc.id === activeId ? 'chain-link--active' : ''}`}
              onClick={() => onSelect(doc.id)}
              title={doc.title}
            >
              <span className="chain-link__type">{TYPE_INITIALS[doc.docType] || 'DOC'}</span>
              <span className="chain-link__status">{broken ? '✕' : '✓'}</span>
            </button>
            {i < documents.length - 1 && (
              <span className={`chain-thread ${broken || nextBroken ? 'chain-thread--broken' : ''}`} aria-hidden="true" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
