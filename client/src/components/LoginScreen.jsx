import React, { useState } from 'react';

const errorStyle = { color: '#e0675a' };

export default function LoginScreen({ onStart, onJoin, notice }) {
  const [name, setName] = useState('');
  const [invite, setInvite] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [joinError, setJoinError] = useState('');

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

  const handleJoin = (e) => {
    e.preventDefault();
    setJoinError('');
    try {
      onJoin(invite);
    } catch (err) {
      setJoinError(err.message);
    }
  };

  return (
    <main className="login-screen">
      <div className="login-card">
        <div className="login-card__mark">⛓</div>
        <h1>Case Archive</h1>
        <p className="muted">Secure Digital Case &amp; Evidence Management</p>

        {notice && <p className="login-card__hint" style={errorStyle} role="alert">{notice}</p>}

        <form onSubmit={handleSubmit}>
          <h2 className="login-card__heading">Start a new workspace</h2>
          <p className="login-card__hint">
            You’ll be its Investigator and owner. Once you’re in, you can invite a Prosecutor or a Court
            Clerk.
          </p>
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
          {error && <p className="login-card__hint" style={errorStyle} role="alert">{error}</p>}
          <button type="submit" className="btn btn--primary login-card__submit" disabled={busy || !name.trim()}>
            {busy ? 'Starting…' : 'Start a Case Workspace'}
          </button>
        </form>

        <div className="login-divider" aria-hidden="true">or</div>

        <form onSubmit={handleJoin}>
          <h2 className="login-card__heading">I have an invite</h2>
          <p className="login-card__hint">
            Paste the invite link you were sent to join someone else’s workspace as a Prosecutor or Court
            Clerk.
          </p>
          <label className="field">
            <span>Invite link</span>
            <input
              type="text"
              placeholder="https://…/?invite=…"
              value={invite}
              onChange={(e) => setInvite(e.target.value)}
            />
          </label>
          {joinError && <p className="login-card__hint" style={errorStyle} role="alert">{joinError}</p>}
          <button type="submit" className="btn btn--outline login-card__submit" disabled={!invite.trim()}>
            Join workspace
          </button>
        </form>

        <p className="login-card__note">
          If the system is slow to respond after a period of inactivity, please wait a moment and reload the page.
        </p>
      </div>
    </main>
  );
}
