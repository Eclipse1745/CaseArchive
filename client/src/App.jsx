import React, { useEffect, useState, useCallback } from 'react';
import { api } from './api.js';
import { ROLES } from './constants.js';
import LoginScreen from './components/LoginScreen.jsx';
import CaseSidebar from './components/CaseSidebar.jsx';
import CaseView from './components/CaseView.jsx';
import NewCaseModal from './components/NewCaseModal.jsx';
import Toast from './components/Toast.jsx';
import AboutPanel from './components/AboutPanel.jsx';

const IDENTITY_KEY = 'custodychain.identity';

function loadIdentity() {
  try {
    const raw = localStorage.getItem(IDENTITY_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export default function App() {
  const [identity, setIdentity] = useState(loadIdentity);
  const [cases, setCases] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [caseDetail, setCaseDetail] = useState(null);
  const [auditEntries, setAuditEntries] = useState([]);
  const [loadingCases, setLoadingCases] = useState(true);
  const [loadingCase, setLoadingCase] = useState(false);
  const [toast, setToast] = useState(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [newCaseOpen, setNewCaseOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

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

  // Only start fetching once someone has "logged in".
  useEffect(() => {
    if (!identity) return;
    loadCases().then((list) => {
      if (list.length > 0) setSelectedCaseId(list[0].id);
    });
  }, [identity, loadCases]);

  useEffect(() => {
    if (selectedCaseId) loadCaseDetail(selectedCaseId);
    else setCaseDetail(null);
  }, [selectedCaseId, loadCaseDetail]);

  const refreshCurrentCase = useCallback(async () => {
    await Promise.all([loadCases(), loadCaseDetail(selectedCaseId)]);
  }, [loadCases, loadCaseDetail, selectedCaseId]);

  const handleLogin = (newIdentity) => {
    localStorage.setItem(IDENTITY_KEY, JSON.stringify(newIdentity));
    setIdentity(newIdentity);
  };

  const handleSwitchUser = () => {
    localStorage.removeItem(IDENTITY_KEY);
    setIdentity(null);
    setSelectedCaseId(null);
    setCaseDetail(null);
    setCases([]);
  };

  const handleCaseCreated = async (newCaseId) => {
    const list = await loadCases();
    setSelectedCaseId(newCaseId);
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      await api.resetEnvironment();
      setSelectedCaseId(null);
      setCaseDetail(null);
      await loadCases();
      showToast('Environment reset — all cases, documents, and evidence cleared.', 'success');
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setResetting(false);
    }
  };

  if (!identity) {
    return <LoginScreen onLogin={handleLogin} />;
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
          <button className="btn btn--outline" onClick={handleSwitchUser}>
            Switch User
          </button>
          <button className="btn btn--outline" onClick={handleReset} disabled={resetting}>
            {resetting ? 'Resetting…' : 'Reset Environment'}
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
