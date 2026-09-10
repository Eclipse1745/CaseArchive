import React, { useState } from 'react';
import { ROLES } from '../constants.js';

export default function LoginScreen({ onLogin, initialName }) {
  const [name, setName] = useState(initialName || '');
  const [roleKey, setRoleKey] = useState(ROLES[0].key);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onLogin({ name: trimmed, roleKey });
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
          <label className="field">
            <span>Role</span>
            <select value={roleKey} onChange={(e) => setRoleKey(e.target.value)}>
              {ROLES.map((r) => (
                <option key={r.key} value={r.key}>{r.label}</option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn btn--primary login-card__submit" disabled={!name.trim()}>
            Access System
          </button>
        </form>

        <p className="login-card__note">
          Pilot environment — password authentication will be enabled ahead of full rollout.
        </p>
      </div>
    </div>
  );
}
