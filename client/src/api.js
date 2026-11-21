const BASE = '/api';
const TOKEN_KEY = 'casearchive.token';

// An invite link looks like /?invite=TOKEN. It is kept per tab (sessionStorage), so opening an invite
// never overwrites the owner's own saved session in the same browser.
(function adoptInvite() {
  try {
    const url = new URL(window.location.href);
    const invite = url.searchParams.get('invite');
    if (!invite) return;
    sessionStorage.setItem(TOKEN_KEY, invite);
    url.searchParams.delete('invite');
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
  } catch (e) {
    // storage blocked: the person simply has to sign in normally
  }
})();

export function getToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
  } catch (e) {
    return null;
  }
}

export function saveOwnerToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

// Signs out whichever session this tab is using (an invite session first, otherwise the owner's).
export function clearToken() {
  try {
    if (sessionStorage.getItem(TOKEN_KEY)) sessionStorage.removeItem(TOKEN_KEY);
    else localStorage.removeItem(TOKEN_KEY);
  } catch (e) {
    // nothing to clear
  }
}

function authHeaders() {
  const token = getToken();
  return token ? { 'x-access-token': token } : {};
}

async function errorFrom(res) {
  let message = `Request failed (${res.status})`;
  try {
    const data = await res.json();
    if (data.error) message = data.error;
  } catch (e) {
    // keep the default message
  }
  if (res.status === 401) window.dispatchEvent(new Event('casearchive:signed-out'));
  return new Error(message);
}

// The `actor` arguments some callers still pass are ignored: the server takes name and role from the token.
async function request(method, url, { body, isForm } = {}) {
  const headers = authHeaders();
  if (body && !isForm) headers['Content-Type'] = 'application/json';

  const res = await fetch(BASE + url, {
    method,
    headers,
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw await errorFrom(res);
  return res.json();
}

async function fetchFile(url) {
  const res = await fetch(BASE + url, { headers: authHeaders() });
  if (!res.ok) throw await errorFrom(res);
  return res;
}

export const api = {
  startSession: (name) => request('POST', '/session/start', { body: { name } }),
  getMe: () => request('GET', '/session/me'),
  createInvite: (payload) => request('POST', '/session/invites', { body: payload }),

  getCases: () => request('GET', '/cases'),
  createCase: (payload) => request('POST', '/cases', { body: payload }),
  updateCase: (id, payload) => request('PATCH', `/cases/${id}`, { body: payload }),
  verifyAll: (id) => request('POST', `/cases/${id}/verify-all`),
  getCase: (id) => request('GET', `/cases/${id}`),
  getAudit: (caseId) => request('GET', `/cases/${caseId}/audit`),

  getDocument: (id) => request('GET', `/documents/${id}`),
  verifyDocument: (id) => request('POST', `/documents/${id}/verify`),
  uploadDocument: (caseId, formData) =>
    request('POST', `/cases/${caseId}/documents`, { body: formData, isForm: true }),

  // Files need the token, so they are fetched with it and shown from a temporary blob URL.
  fetchFileUrl: async (id) => URL.createObjectURL(await (await fetchFile(`/documents/${id}/view`)).blob()),
  downloadFile: async (id) => {
    const res = await fetchFile(`/documents/${id}/download`);
    const match = /filename="?([^";]+)"?/.exec(res.headers.get('content-disposition') || '');
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = url;
    a.download = match ? match[1] : `document-${id}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  getEvidenceList: (caseId) => request('GET', `/cases/${caseId}/evidence`),
  getEvidenceDetail: (id) => request('GET', `/evidence/${id}`),
  createEvidence: (caseId, payload) => request('POST', `/cases/${caseId}/evidence`, { body: payload }),
  transferEvidence: (id, payload) => request('POST', `/evidence/${id}/transfer`, { body: payload }),
};
