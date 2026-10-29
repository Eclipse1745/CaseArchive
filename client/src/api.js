const BASE = '/api';
const WS_KEY = 'casearchive.workspace';
const WS_PATTERN = /^[A-Za-z0-9_-]{6,64}$/;

// Each browser gets its own private workspace. Open the app with ?workspace=<code> to join a shared one.
function resolveWorkspaceId() {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('workspace');
    if (fromUrl && WS_PATTERN.test(fromUrl)) {
      localStorage.setItem(WS_KEY, fromUrl);
      return fromUrl;
    }
    let id = localStorage.getItem(WS_KEY);
    if (!id || !WS_PATTERN.test(id)) {
      id = (crypto.randomUUID ? crypto.randomUUID() : Date.now() + Math.random().toString(36).slice(2))
        .replace(/[^A-Za-z0-9_-]/g, '');
      localStorage.setItem(WS_KEY, id);
    }
    return id;
  } catch (e) {
    return 'default-workspace';
  }
}

export const WORKSPACE_ID = resolveWorkspaceId();

async function request(method, url, { body, actor, isForm } = {}) {
  const headers = { 'x-workspace-id': WORKSPACE_ID };
  if (actor) {
    headers['x-actor-role'] = actor.role;
    headers['x-actor-name'] = actor.name;
  }
  if (body && !isForm) headers['Content-Type'] = 'application/json';

  const res = await fetch(BASE + url, {
    method,
    headers,
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data.error) message = data.error;
    } catch (e) {
      
    }
    throw new Error(message);
  }
  return res.json();
}

export const api = {
  getCases: () => request('GET', '/cases'),
  createCase: (payload, actor) => request('POST', '/cases', { body: payload, actor }),
  getCase: (id) => request('GET', `/cases/${id}`),
  getAudit: (caseId) => request('GET', `/cases/${caseId}/audit`),

  getDocument: (id) => request('GET', `/documents/${id}`),
  verifyDocument: (id, actor) => request('POST', `/documents/${id}/verify`, { actor }),
  tamperDocument: (id, actor) => request('POST', `/documents/${id}/tamper`, { actor }),
  restoreDocument: (id, actor) => request('POST', `/documents/${id}/restore`, { actor }),
  uploadDocument: (caseId, formData, actor) =>
    request('POST', `/cases/${caseId}/documents`, { body: formData, actor, isForm: true }),
  downloadUrl: (id) => `${BASE}/documents/${id}/download?ws=${WORKSPACE_ID}`,
  viewUrl: (id) => `${BASE}/documents/${id}/view?ws=${WORKSPACE_ID}`,

  getEvidenceList: (caseId) => request('GET', `/cases/${caseId}/evidence`),
  getEvidenceDetail: (id) => request('GET', `/evidence/${id}`),
  createEvidence: (caseId, payload, actor) =>
    request('POST', `/cases/${caseId}/evidence`, { body: payload, actor }),
  transferEvidence: (id, payload, actor) =>
    request('POST', `/evidence/${id}/transfer`, { body: payload, actor }),

  resetEnvironment: () => request('POST', '/reset'),
};
