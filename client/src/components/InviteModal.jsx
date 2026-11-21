import React, { useState } from 'react';
import { api, getToken } from '../api.js';

export default function InviteModal({ onClose, onToast }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('Prosecutor');
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState('');

  const linkFor = (token) => `${window.location.origin}/?invite=${token}`;

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
    if (!name.trim()) return;
    setBusy(true);
    try {
      const invite = await api.createInvite({ name: name.trim(), role });
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
          The link opens this workspace as read-only. Their name and role are fixed inside the link and
          enforced by the server, so they cannot change either. Anyone holding the link gets that access,
          so send it privately.
        </p>

        <form onSubmit={handleCreate}>
          <label className="field">
            <span>Their name</span>
            <input type="text" placeholder="e.g. Adv. Meera Sharma" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </label>
          <label className="field">
            <span>Role</span>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option>Prosecutor</option>
              <option>Court Clerk</option>
            </select>
          </label>
          <button type="submit" className="btn btn--primary" disabled={busy || !name.trim()}>
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
        <button className="btn btn--outline btn--sm" onClick={() => copy(linkFor(getToken()), 'Your workspace link copied.')}>
          Copy my workspace link
        </button>

        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
