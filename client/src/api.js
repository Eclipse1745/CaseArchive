const BASE = '/api';

async function request(method, url, { body, actor, isForm } = {}) {
  const headers = {};
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
  downloadUrl: (id) => `${BASE}/documents/${id}/download`,
  viewUrl: (id) => `${BASE}/documents/${id}/view`,

  getEvidenceList: (caseId) => request('GET', `/cases/${caseId}/evidence`),
  getEvidenceDetail: (id) => request('GET', `/evidence/${id}`),
  createEvidence: (caseId, payload, actor) =>
    request('POST', `/cases/${caseId}/evidence`, { body: payload, actor }),
  transferEvidence: (id, payload, actor) =>
    request('POST', `/evidence/${id}/transfer`, { body: payload, actor }),

  resetEnvironment: () => request('POST', '/reset'),
};
