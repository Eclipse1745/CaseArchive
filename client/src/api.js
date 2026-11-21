const BASE = '/api';
const TOKEN_KEY = 'casearchive.token';
const PENDING_KEY = 'casearchive.pendingInvite'; // set until the invitee confirms on the welcome screen
const CODE_KEY = 'casearchive.inviteCode'; // one-time invite code, only held until it is redeemed

// An invite link looks like /?invite=CODE. The code is NOT a login: redeemPendingInvite() trades it, once, for a
// session token. It is kept per tab (sessionStorage), so opening an invite never overwrites the owner's own
// saved session in the same browser.
(function adoptInvite() {
  try {
    const url = new URL(window.location.href);
    const invite = url.searchParams.get('invite');
    const restore = url.searchParams.get('restore'); // the owner's own saved link: /?restore=SESSION_TOKEN
    if (!invite && !restore) return;
    if (invite) storeInvite(invite);
    if (restore) localStorage.setItem(TOKEN_KEY, restore);
    url.searchParams.delete('invite');
    url.searchParams.delete('restore');
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
  } catch (e) {
    // storage blocked: the person simply has to sign in normally
  }
})();

function storeInvite(code) {
  sessionStorage.setItem(CODE_KEY, code);
}

export function hasInviteCode() {
  try {
    return Boolean(sessionStorage.getItem(CODE_KEY));
  } catch (e) {
    return false;
  }
}

// Redeems the pending invite code (if any) and stores the session token it returns. The code is single-use,
// so this must run only once: the promise is cached because React StrictMode runs effects twice in dev.
let redeeming = null;
export function redeemPendingInvite() {
  if (redeeming) return redeeming;
  let code = null;
  try {
    code = sessionStorage.getItem(CODE_KEY);
  } catch (e) {
    // storage blocked
  }
  if (!code) return Promise.resolve(false);

  redeeming = (async () => {
    try {
      const res = await fetch(BASE + '/session/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      // 401/404 here means the server has no /redeem route yet (not redeployed), not that the person was signed out.
      if (res.status === 401 || res.status === 404) throw new Error('The server could not open this invite yet. It may still be updating: wait a minute and open the link again.');
      if (!res.ok) throw await errorFrom(res, true);
      const { token } = await res.json();
      sessionStorage.setItem(TOKEN_KEY, token);
      sessionStorage.setItem(PENDING_KEY, '1');
      return true;
    } finally {
      sessionStorage.removeItem(CODE_KEY); // spent either way: never retry on reload
    }
  })();
  return redeeming;
}

export function hasPendingInvite() {
  try {
    return sessionStorage.getItem(PENDING_KEY) === '1';
  } catch (e) {
    return false;
  }
}

export function confirmInvite() {
  try {
    sessionStorage.removeItem(PENDING_KEY);
  } catch (e) {
    // nothing to clear
  }
}

// Used when someone pastes an invite on the sign-in screen: same as opening the link.
export function joinWithInvite(token) {
  storeInvite(token);
  window.location.reload();
}

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

// Forget an invite that was declined or is no longer valid.
export function dropInvite() {
  confirmInvite();
  clearToken();
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

// quiet: a failure that must not be treated as "your session died" (e.g. a bad invite link).
async function errorFrom(res, quiet = false) {
  let message = `Request failed (${res.status})`;
  try {
    const data = await res.json();
    if (data.error) message = data.error;
  } catch (e) {
    // keep the default message
  }
  if (res.status === 401 && !quiet) window.dispatchEvent(new Event('casearchive:signed-out'));
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
  claimName: (name, role) => request('POST', '/session/claim', { body: { name, role } }),
  createInvite: (payload) => request('POST', '/session/invites', { body: payload }),

  getCases: () => request('GET', '/cases'),
  createCase: (payload) => request('POST', '/cases', { body: payload }),
  updateCase: (id, payload) => request('PATCH', `/cases/${id}`, { body: payload }),
  verifyAll: (id, purpose) => request('POST', `/cases/${id}/verify-all`, purpose ? { body: { purpose } } : {}),
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
