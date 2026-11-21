import React, { useState } from 'react';
import { ROLES } from '../constants.js';

const errorStyle = { color: '#e0675a' };

export default function InviteWelcome({ name, role, claimed, onContinue, onClaim, onDecline }) {
  const [typed, setTyped] = useState('');
  const [chosen, setChosen] = useState('Prosecutor');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const readOnly = !ROLES.find((r) => r.key === role)?.canUpload;

  const readOnlyNote = readOnly && (
    <p className="login-card__hint">
      This role is read-only: you can view cases, documents, evidence and the audit trail, but you
      can’t change anything.
    </p>
  );

  // The name was already confirmed (invite re-opened later): just let them continue.
  if (claimed) {
    return (
      <main className="login-screen">
        <div className="login-card">
          <div className="login-card__mark">⛓</div>
          <h1>You’ve been invited</h1>
          <p className="login-card__hint">
            You’re joining a Case Archive workspace as <strong>{name}</strong>, with the role of{' '}
            <strong>{role}</strong>.
          </p>
          {readOnlyNote}
          <button className="btn btn--primary login-card__submit" onClick={onContinue} autoFocus>
            Continue as {name}
          </button>
          <button className="btn btn--ghost login-card__submit" onClick={onDecline}>
            This isn’t me
          </button>
        </div>
      </main>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!typed.trim()) return;
    setBusy(true);
    setError('');
    try {
      await onClaim(typed.trim(), chosen);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <main className="login-screen">
      <div className="login-card">
        <div className="login-card__mark">⛓</div>
        <h1>You’ve been invited</h1>
        <p className="login-card__hint">
          You’re joining a Case Archive workspace. Both roles below are read-only: you can view cases,
          documents, evidence and the audit trail, but you can’t change anything.
        </p>
        <form onSubmit={handleSubmit}>
          <label className="field">
            <span>Your full name</span>
            <input type="text" value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus />
          </label>
          <label className="field">
            <span>Your role</span>
            <select value={chosen} onChange={(e) => setChosen(e.target.value)}>
              {ROLES.filter((r) => !r.canUpload).map((r) => (
                <option key={r.key} value={r.key}>{r.label}</option>
              ))}
            </select>
          </label>
          <p className="login-card__hint">
            This is how you’ll appear in the workspace records. You choose it yourself and it isn’t
            verified, so please be accurate. Neither can be changed afterwards.
          </p>
          {error && <p className="login-card__hint" style={errorStyle} role="alert">{error}</p>}
          <button type="submit" className="btn btn--primary login-card__submit" disabled={busy || !typed.trim()}>
            {busy ? 'Joining…' : `Join as ${chosen}`}
          </button>
        </form>
        <button className="btn btn--ghost login-card__submit" onClick={onDecline}>
          Cancel
        </button>
      </div>
    </main>
  );
}
