import React, { useState } from 'react';
import { api, getToken } from '../api.js';

export default function InviteModal({ onClose, onToast }) {
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState('');

  const linkFor = (code) => `${window.location.origin}/?invite=${code}`;
  const restoreLinkFor = (token) => `${window.location.origin}/?restore=${token}`;

  const copy = async (text, message) => {
    try {
      await navigator.clipboard.writeText(text);
      onToast(message, 'success');
    } catch (e) {
      onToast('Could not copy automatically — select the link and copy it.', 'error');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const invite = await api.createInvite();
      setLink(linkFor(invite.token));
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
        <h2>Invite a colleague</h2>
        <p className="muted">
          The link opens this workspace as read-only. It works only once: the first person to open it types
          their own name and picks Prosecutor or Court Clerk (both read-only; neither is verified, and the
          records say so), and the link then stops working for everyone else. An unused link expires after
          7 days. Send it privately.
        </p>

        <form onSubmit={handleCreate}>
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? 'Creating…' : 'Create invite link'}
          </button>
        </form>

        {link && (
          <div className="invite-result">
            <input type="text" readOnly value={link} onFocus={(e) => e.target.select()} />
            <button className="btn btn--outline btn--sm" onClick={() => copy(link, 'Invite link copied.')}>
              Copy
            </button>
          </div>
        )}

        <h3>Your own workspace link</h3>
        <p className="muted">
          Save this somewhere private. It is the only way back into this workspace if you clear your
          browser data.
        </p>
        <button className="btn btn--outline btn--sm" onClick={() => copy(restoreLinkFor(getToken()), 'Your workspace link copied.')}>
          Copy my workspace link
        </button>

        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
