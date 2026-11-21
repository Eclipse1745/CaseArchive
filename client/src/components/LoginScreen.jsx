import React, { useState } from 'react';

export default function LoginScreen({ onStart }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    setError('');
    try {
      await onStart(trimmed);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-card__mark">⛓</div>
        <h1>Case Archive</h1>
        <p className="muted">Secure Digital Case &amp; Evidence Management</p>

        <form onSubmit={handleSubmit}>
          <label className="field">
            <span>Full name</span>
            <input
              type="text"
              placeholder="e.g. SI Kabir Malhotra"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </label>
          {error && <p className="login-card__note" style={{ color: '#c0392b' }}>{error}</p>}
          <button type="submit" className="btn btn--primary login-card__submit" disabled={busy || !name.trim()}>
            {busy ? 'Starting…' : 'Start a Case Workspace'}
          </button>
        </form>

        <p className="login-card__note">
          You start as the Investigator of your own workspace. To join someone else's workspace as a
          Prosecutor or Court Clerk, open the invite link they sent you.
        </p>
        <p className="login-card__note">
          If the system is slow to respond after a period of inactivity, please wait a moment and reload the page.
        </p>
      </div>
    </div>
  );
}
