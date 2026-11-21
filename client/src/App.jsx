import React, { useEffect, useState, useCallback } from 'react';
import { api, getToken, saveOwnerToken, clearToken, hasPendingInvite, hasInviteCode, redeemPendingInvite, confirmInvite, dropInvite, joinWithInvite } from './api.js';
import { inviteTokenFrom } from './invite.js';
import { ROLES } from './constants.js';
import LoginScreen from './components/LoginScreen.jsx';
import InviteWelcome from './components/InviteWelcome.jsx';
import CaseSidebar from './components/CaseSidebar.jsx';
import CaseView from './components/CaseView.jsx';
import NewCaseModal from './components/NewCaseModal.jsx';
import Toast from './components/Toast.jsx';
import AboutPanel from './components/AboutPanel.jsx';
import InviteModal from './components/InviteModal.jsx';

export default function App() {
  const [identity, setIdentity] = useState(null);
  const [authLoading, setAuthLoading] = useState(Boolean(getToken()) || hasInviteCode());
  const [pendingInvite, setPendingInvite] = useState(hasPendingInvite);
  const [inviteNotice, setInviteNotice] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [cases, setCases] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [caseDetail, setCaseDetail] = useState(null);
  const [auditEntries, setAuditEntries] = useState([]);
  const [loadingCases, setLoadingCases] = useState(true);
  const [loadingCase, setLoadingCase] = useState(false);
  const [toast, setToast] = useState(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [newCaseOpen, setNewCaseOpen] = useState(false);

  const actor = identity
    ? { ...ROLES.find((r) => r.key === identity.roleKey), name: identity.name }
    : null;

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type, id: Date.now() });
  }, []);

  const loadCases = useCallback(async () => {
    setLoadingCases(true);
    try {
      const data = await api.getCases();
      setCases(data.cases);
      return data.cases;
    } catch (e) {
      showToast(e.message, 'error');
      return [];
    } finally {
      setLoadingCases(false);
    }
  }, [showToast]);

  const loadCaseDetail = useCallback(
    async (caseId) => {
      if (!caseId) {
        setCaseDetail(null);
        setAuditEntries([]);
        return;
      }
      setLoadingCase(true);
      try {
        const [detail, audit] = await Promise.all([api.getCase(caseId), api.getAudit(caseId)]);
        setCaseDetail(detail);
        setAuditEntries(audit.entries);
      } catch (e) {
        showToast(e.message, 'error');
      } finally {
        setLoadingCase(false);
      }
    },
    [showToast]
  );

  // Ask the server who this token belongs to (name and role are decided there, not here).
  // If an invite link was opened, first trade its one-time code for a session token.
  const bootstrap = useCallback(
    () =>
      redeemPendingInvite()
        .catch((e) => setInviteNotice(e.message)) // already used, expired, or never existed
        .then(() => {
          if (!getToken()) return;
          return api.getMe().then((me) => {
            setIdentity({ name: me.name, roleKey: me.role, claimed: me.claimed });
            if (!me.claimed) setPendingInvite(true); // an invitee must type their own name first
          });
        })
        .catch(() => {})
        .finally(() => setAuthLoading(false)),
    []
  );

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  // A 401 means this token is dead. Drop it and fall back to the sign-in screen WITHOUT reloading the page:
  // a reload is what turned a dead token into an endless reload loop. Every pass removes one stored token,
  // so this always ends.
  useEffect(() => {
    const onSignedOut = () => {
      if (!getToken()) return; // already handled
      const wasInvite = hasPendingInvite();
      if (wasInvite) dropInvite();
      else clearToken();
      setIdentity(null);
      setPendingInvite(false);
      setCases([]);
      setSelectedCaseId(null);
      setCaseDetail(null);
      setInviteNotice(wasInvite ? 'That invite link is no longer valid. Ask the workspace owner for a new one.' : 'Your session ended. Please sign in again.');
      if (getToken()) {
        setAuthLoading(true);
        bootstrap(); // a second saved session (e.g. the owner's) is still in this browser: try it
      }
    };
    window.addEventListener('casearchive:signed-out', onSignedOut);
    return () => window.removeEventListener('casearchive:signed-out', onSignedOut);
  }, [bootstrap]);

  // Only start fetching once someone has signed in.
  useEffect(() => {
    if (!identity || pendingInvite) return;
    loadCases().then((list) => {
      if (list.length > 0) setSelectedCaseId(list[0].id);
    });
  }, [identity, pendingInvite, loadCases]);

  useEffect(() => {
    if (selectedCaseId) loadCaseDetail(selectedCaseId);
    else setCaseDetail(null);
  }, [selectedCaseId, loadCaseDetail]);

  const refreshCurrentCase = useCallback(async () => {
    await Promise.all([loadCases(), loadCaseDetail(selectedCaseId)]);
  }, [loadCases, loadCaseDetail, selectedCaseId]);

  const handleStart = async (name) => {
    const session = await api.startSession(name);
    saveOwnerToken(session.token);
    setIdentity({ name: session.name, roleKey: session.role });
  };

  const handleJoin = (text) => {
    const token = inviteTokenFrom(text);
    if (!token) throw new Error('That doesn’t look like an invite link. Paste the full link you were sent.');
    joinWithInvite(token);
  };

  const handleClaim = async (typedName, role) => {
    const me = await api.claimName(typedName, role);
    setIdentity({ name: me.name, roleKey: me.role, claimed: true });
    confirmInvite();
    setPendingInvite(false);
  };

  const handleSignOut = () => {
    if (
      actor.canCreateCase &&
      !window.confirm('Sign out? You can only get back into this workspace with your workspace link (see Invite).')
    ) {
      return;
    }
    clearToken();
    window.location.reload();
  };

  const handleCaseCreated = async (newCaseId) => {
    const list = await loadCases();
    setSelectedCaseId(newCaseId);
  };

  if (authLoading) {
    return <main className="login-screen"><p className="muted">Loading…</p></main>;
  }

  if (identity && pendingInvite) {
    return (
      <InviteWelcome
        name={identity.name}
        role={identity.roleKey}
        claimed={identity.claimed}
        onClaim={handleClaim}
        onContinue={() => {
          confirmInvite();
          setPendingInvite(false);
        }}
        onDecline={() => {
          dropInvite();
          window.location.reload();
        }}
      />
    );
  }

  if (!identity) {
    return <LoginScreen onStart={handleStart} onJoin={handleJoin} notice={inviteNotice} />;
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__brand">
          <span className="app-header__mark">⛓</span>
          <div>
            <h1>Case Archive</h1>
            <p>Secure Digital Case &amp; Evidence Management</p>
          </div>
        </div>
        <div className="app-header__actions">
          <button className="btn btn--ghost" onClick={() => setAboutOpen(true)}>
            About
          </button>
          <div className="identity-pill">
            <span className="identity-pill__name">{identity.name}</span>
            <span className="identity-pill__role">{actor.label}</span>
          </div>
          {actor.canCreateCase && (
            <button className="btn btn--outline" onClick={() => setInviteOpen(true)}>
              Invite
            </button>
          )}
          <button className="btn btn--outline" onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      </header>

      <div className="app-body">
        <CaseSidebar
          cases={cases}
          loading={loadingCases}
          selectedCaseId={selectedCaseId}
          onSelect={setSelectedCaseId}
          canCreateCase={actor.canCreateCase}
          onNewCase={() => setNewCaseOpen(true)}
        />
        <main className="app-main">
          <CaseView
            caseDetail={caseDetail}
            auditEntries={auditEntries}
            loading={loadingCase}
            actor={actor}
            onChanged={refreshCurrentCase}
            onToast={showToast}
          />
        </main>
      </div>

      {toast && <Toast toast={toast} onDone={() => setToast(null)} />}
      {aboutOpen && <AboutPanel onClose={() => setAboutOpen(false)} />}
      {inviteOpen && <InviteModal onClose={() => setInviteOpen(false)} onToast={showToast} />}
      {newCaseOpen && (
        <NewCaseModal
          actor={actor}
          onClose={() => setNewCaseOpen(false)}
          onCreated={handleCaseCreated}
          onToast={showToast}
        />
      )}
    </div>
  );
}
