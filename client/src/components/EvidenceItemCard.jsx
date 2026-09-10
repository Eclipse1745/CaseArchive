import React, { useState } from 'react';
import TransferCustodyForm from './TransferCustodyForm.jsx';

const STATUS_CLASS = {
  Collected: 'tag--neutral',
  'In Custody': 'tag--brass',
  'In Lab': 'tag--amber',
  'In Use': 'tag--amber',
  'In Court': 'tag--brass',
  Released: 'tag--green',
  Destroyed: 'tag--red',
};

export default function EvidenceItemCard({ item, actor, expanded, onToggle, onChanged, onToast }) {
  const [transferring, setTransferring] = useState(false);

  return (
    <div className="doc-card evidence-card">
      <button className="doc-card__header" onClick={() => onToggle(item.id)}>
        <div className="doc-card__heading">
          <span className="doc-card__type">{item.itemType} · #{item.evidenceNumber}</span>
          <span className="doc-card__title">{item.description}</span>
          <span className="doc-card__meta">
            Currently with <strong>{item.currentCustodian}</strong> · {item.currentLocation}
          </span>
        </div>
        <span className={`tag ${STATUS_CLASS[item.status] || 'tag--neutral'} evidence-card__status`}>
          {item.status}
        </span>
      </button>

      {expanded && (
        <div className="doc-card__body">
          <div className="insights__title">Custody history</div>
          <div className="custody-timeline">
            {item.custodyLog.slice().reverse().map((entry) => (
              <div className="custody-entry" key={entry.id}>
                <span className="custody-entry__time">
                  {new Date(entry.timestamp).toLocaleString(undefined, {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </span>
                <span className={`tag ${STATUS_CLASS[entry.status] || 'tag--neutral'}`}>{entry.status}</span>
                <span className="custody-entry__body">
                  With <strong>{entry.custodian}</strong> at {entry.location}
                  {entry.notes && <> — {entry.notes}</>}
                  <span className="custody-entry__actor"> · logged by {entry.actorName} ({entry.actorRole})</span>
                </span>
              </div>
            ))}
          </div>

          {actor.canLogEvidence && (
            <>
              {!transferring ? (
                <button className="btn btn--outline btn--sm" onClick={() => setTransferring(true)}>
                  Transfer Custody
                </button>
              ) : (
                <TransferCustodyForm
                  item={item}
                  actor={actor}
                  onToast={onToast}
                  onDone={() => {
                    setTransferring(false);
                    onChanged();
                  }}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
