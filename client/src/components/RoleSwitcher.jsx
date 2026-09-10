import React from 'react';
import { ROLES } from '../constants.js';

export default function RoleSwitcher({ roleKey, onChange }) {
  return (
    <label className="role-switcher">
      <span className="role-switcher__label">Viewing as</span>
      <select value={roleKey} onChange={(e) => onChange(e.target.value)}>
        {ROLES.map((r) => (
          <option key={r.key} value={r.key}>
            {r.label}
          </option>
        ))}
      </select>
    </label>
  );
}
