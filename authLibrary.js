// ═══════════════════════════════════════════════════════════════════
// AuthManager v3 - Email+Code Auth + Cloud Sync voor Wandel met Mij
// ═══════════════════════════════════════════════════════════════════
// NIEUW in v3: Cloud sync van localStorage data
//  - syncToCloud(): upload wmm_* / fsy_* keys naar Firestore
//  - restoreFromCloud(): download en zet terug in localStorage
//  - auto-sync bij login + elke 30s + bij page unload
// ═══════════════════════════════════════════════════════════════════

const AuthLibrary = (() => {
  const FUNCTIONS_URL = window.location.hostname === 'localhost'
    ? 'http://127.0.0.1:5001/fsy-prep/us-central1'
    : 'https://us-central1-fsy-prep.cloudfunctions.net';

  // Storage keys
  const KEY_PENDING_EMAIL = 'wmm_email_auth';
  const KEY_SESSION_EMAIL = 'wmm_session_token';
  const KEY_SESSION_META  = 'wmm_session_meta';
  const KEY_LAST_SYNC     = 'wmm_last_sync';
  const KEY_SYNC_HASH     = 'wmm_sync_hash';

  // Prefixes to sync (alleen deze keys worden gesynced)
  const SYNC_PREFIXES = ['wmm_', 'fsy_'];

  // Keys die NOOIT gesynced worden (auth state + sync internals)
  const SYNC_BLOCKLIST = new Set([
    KEY_PENDING_EMAIL, KEY_SESSION_EMAIL, KEY_SESSION_META,
    KEY_LAST_SYNC, KEY_SYNC_HASH
  ]);

  // Internal state
  let _autoSyncInterval = null;
  let _syncInProgress = false;
  let _onSyncListeners = [];

  // ─────────────────────────────────────────────────────────────
  // HTTP wrapper
  // ─────────────────────────────────────────────────────────────
  async function _post(endpoint, body) {
    const response = await fetch(`${FUNCTIONS_URL}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    return data;
  }

  // ─────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────
  function _translateError(msg) {
    if (!msg) return 'Er ging iets mis. Probeer opnieuw.';
    const m = msg.toLowerCase();
    if (m.includes('too many')) return 'Te veel pogingen. Probeer het over 15 min opnieuw.';
    if (m.includes('invalid code')) return 'Code klopt niet. Probeer opnieuw.';
    if (m.includes('expired')) return 'Code is verlopen. Vraag een nieuwe aan.';
    if (m.includes('no code')) return 'Geen code gevonden. Vraag eerst een nieuwe aan.';
    if (m.includes('failed to fetch')) return 'Geen verbinding. Check je internet.';
    if (m.includes('valid email')) return 'Vul een geldig e-mailadres in.';
    if (m.includes('too large')) return 'Je hebt veel data. Opschonen nodig.';
    return msg;
  }

  // ─────────────────────────────────────────────────────────────
  // Core: sendCode, verifyCode, getAccount
  // ─────────────────────────────────────────────────────────────
  async function sendCode(email) {
    if (!email || !email.includes('@')) {
      return { success: false, message: 'Vul een geldig e-mailadres in' };
    }
    try {
      const data = await _post('sendCode', { email: email.trim().toLowerCase() });
      if (data.success) {
        localStorage.setItem(KEY_PENDING_EMAIL, email.trim().toLowerCase());
        return { success: true, message: data.message, code: data.code, expiresAt: data.expiresAt };
      }
      return { success: false, message: data.error || 'Verzenden mislukt' };
    } catch (err) {
      return { success: false, message: _translateError(err.message) };
    }
  }

  async function verifyCode(code, options = {}) {
    const email = localStorage.getItem(KEY_PENDING_EMAIL);
    if (!email) return { success: false, message: 'Geen e-mail gevonden.' };
    if (!code || code.length !== 6) {
      return { success: false, message: 'Vul de 6-cijferige code in' };
    }

    const anonymousId = options.anonymousId || window._wmm_authUid || null;

    try {
      const data = await _post('verifyCode', { email, code: code.trim(), anonymousId });
      if (data.success) {
        localStorage.setItem(KEY_SESSION_EMAIL, data.email);
        localStorage.setItem(KEY_SESSION_META, JSON.stringify({
          email: data.email,
          isNewAccount: data.isNewAccount,
          loggedInAt: new Date().toISOString(),
          anonymousId
        }));
        localStorage.removeItem(KEY_PENDING_EMAIL);

        // ✨ NIEUW: Cloud sync logica na login
        let dataAction = 'none';
        try {
          if (data.isNewAccount) {
            // Nieuw account → upload huidige localStorage
            const uploadResult = await syncToCloud();
            if (uploadResult.success) dataAction = 'uploaded';
          } else {
            // Bestaand account → eerst checken of er cloud data is
            const restoreResult = await restoreFromCloud();
            if (restoreResult.hasData) {
              dataAction = 'restored';
            } else {
              // Account bestaat maar nog geen cloud data → upload
              const uploadResult = await syncToCloud();
              if (uploadResult.success) dataAction = 'uploaded';
            }
          }
        } catch (syncErr) {
          console.warn('[AuthLibrary] Sync na login mislukt:', syncErr);
        }

        // Start auto-sync
        startAutoSync();

        return {
          success: true,
          email: data.email,
          isNewAccount: data.isNewAccount,
          dataAction, // 'uploaded', 'restored', 'none'
          message: data.isNewAccount ? 'Welkom! Account aangemaakt.' : 'Welkom terug!'
        };
      }
      return { success: false, message: data.error || 'Verificatie mislukt' };
    } catch (err) {
      return { success: false, message: _translateError(err.message) };
    }
  }

  async function getAccount(email) {
    try {
      return await _post('getAccount', { email });
    } catch (err) {
      return { exists: false, error: err.message };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // ✨ NIEUW: Cloud sync functies
  // ─────────────────────────────────────────────────────────────

  // Haal alle localStorage keys die relevant zijn
  function _getLocalStorageToSync() {
    const storage = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (SYNC_BLOCKLIST.has(key)) continue;
      // Alleen keys met toegestane prefix syncen
      if (SYNC_PREFIXES.some(prefix => key.startsWith(prefix))) {
        storage[key] = localStorage.getItem(key);
      }
    }
    return storage;
  }

  // Simpele hash om wijzigingen te detecteren (voorkom onnodige syncs)
  function _hashStorage(storage) {
    const str = JSON.stringify(storage);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return `${str.length}_${hash}`;
  }

  // Upload localStorage naar cloud
  async function syncToCloud(options = {}) {
    if (_syncInProgress && !options.force) {
      return { success: false, skipped: true, reason: 'already in progress' };
    }
    const email = getEmailSession();
    if (!email) return { success: false, reason: 'not logged in' };

    _syncInProgress = true;
    try {
      const storage = _getLocalStorageToSync();
      const hash = _hashStorage(storage);
      const lastHash = localStorage.getItem(KEY_SYNC_HASH);

      if (!options.force && hash === lastHash) {
        return { success: true, skipped: true, reason: 'no changes' };
      }

      const data = await _post('syncData', { email, storage });
      localStorage.setItem(KEY_LAST_SYNC, new Date().toISOString());
      localStorage.setItem(KEY_SYNC_HASH, hash);
      _notifyListeners('synced', { keys: data.syncedKeys, size: data.size });
      console.log(`[AuthLibrary] Sync → cloud OK (${data.syncedKeys} keys)`);
      return { success: true, syncedKeys: data.syncedKeys, size: data.size };
    } catch (err) {
      console.error('[AuthLibrary] Sync failed:', err);
      _notifyListeners('error', { error: err.message });
      return { success: false, message: _translateError(err.message) };
    } finally {
      _syncInProgress = false;
    }
  }

  // Download van cloud naar localStorage
  async function restoreFromCloud() {
    const email = getEmailSession();
    if (!email) return { success: false, reason: 'not logged in' };

    try {
      const data = await _post('restoreData', { email });
      if (!data.hasData) {
        return { success: true, hasData: false };
      }
      // Schrijf alle restored keys naar localStorage
      Object.entries(data.storage).forEach(([key, value]) => {
        try { localStorage.setItem(key, value); } catch (e) { console.warn('setItem fail:', key, e); }
      });
      // Update sync tracking
      const hash = _hashStorage(data.storage);
      localStorage.setItem(KEY_LAST_SYNC, new Date().toISOString());
      localStorage.setItem(KEY_SYNC_HASH, hash);
      _notifyListeners('restored', { keys: Object.keys(data.storage).length });
      console.log(`[AuthLibrary] Restored ${Object.keys(data.storage).length} keys from cloud`);
      return { success: true, hasData: true, keyCount: Object.keys(data.storage).length };
    } catch (err) {
      console.error('[AuthLibrary] Restore failed:', err);
      return { success: false, message: _translateError(err.message) };
    }
  }

  // Auto-sync starten (elke 30 sec + bij page unload)
  function startAutoSync() {
    if (_autoSyncInterval) return;
    _autoSyncInterval = setInterval(() => {
      if (isEmailAuthenticated()) {
        syncToCloud().catch(e => console.warn('Auto-sync error:', e));
      }
    }, 30000);
    // Sync bij page close
    window.addEventListener('beforeunload', _unloadSync);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && isEmailAuthenticated()) {
        syncToCloud().catch(() => {});
      }
    });
    console.log('[AuthLibrary] Auto-sync started (30s interval)');
  }

  function stopAutoSync() {
    if (_autoSyncInterval) {
      clearInterval(_autoSyncInterval);
      _autoSyncInterval = null;
    }
    window.removeEventListener('beforeunload', _unloadSync);
  }

  function _unloadSync() {
    // Beste poging - sendBeacon zou beter zijn maar fetch werkt soms ook
    if (isEmailAuthenticated()) {
      const storage = _getLocalStorageToSync();
      const hash = _hashStorage(storage);
      if (hash !== localStorage.getItem(KEY_SYNC_HASH)) {
        try {
          navigator.sendBeacon?.(
            `${FUNCTIONS_URL}/syncData`,
            new Blob([JSON.stringify({ email: getEmailSession(), storage })], { type: 'application/json' })
          );
        } catch {}
      }
    }
  }

  // Event listener voor sync events (UI kan erop reageren)
  function onSync(callback) {
    _onSyncListeners.push(callback);
    return () => { _onSyncListeners = _onSyncListeners.filter(cb => cb !== callback); };
  }
  function _notifyListeners(event, data) {
    _onSyncListeners.forEach(cb => { try { cb(event, data); } catch {} });
  }

  // ─────────────────────────────────────────────────────────────
  // Session management
  // ─────────────────────────────────────────────────────────────
  function getEmailSession() { return localStorage.getItem(KEY_SESSION_EMAIL); }
  function getSessionMeta() { try { return JSON.parse(localStorage.getItem(KEY_SESSION_META) || 'null'); } catch { return null; } }
  function isEmailAuthenticated() { return !!getEmailSession(); }
  function getLastSync() { return localStorage.getItem(KEY_LAST_SYNC); }

  function logout(options = {}) {
    // ✨ Belangrijk: localStorage data (wmm_*) blijft BEHOUDEN
    // Alleen auth-gerelateerde keys worden gewist
    localStorage.removeItem(KEY_SESSION_EMAIL);
    localStorage.removeItem(KEY_SESSION_META);
    localStorage.removeItem(KEY_PENDING_EMAIL);
    stopAutoSync();
    if (options.clearData) {
      // Als expliciet gevraagd: wis ook alle app-data
      const toRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && SYNC_PREFIXES.some(p => key.startsWith(p)) && !SYNC_BLOCKLIST.has(key)) {
          toRemove.push(key);
        }
      }
      toRemove.forEach(k => localStorage.removeItem(k));
      localStorage.removeItem(KEY_LAST_SYNC);
      localStorage.removeItem(KEY_SYNC_HASH);
    }
    console.log('[AuthLibrary] Logged out', options.clearData ? '(data cleared)' : '(data kept)');
    return { success: true };
  }

  function clearSession() { return logout(); }
  function getPendingEmail() { return localStorage.getItem(KEY_PENDING_EMAIL); }
  function cancelPending() { localStorage.removeItem(KEY_PENDING_EMAIL); }

  // ─────────────────────────────────────────────────────────────
  // Auto-start sync als user al ingelogd is bij page load
  // ─────────────────────────────────────────────────────────────
  if (typeof window !== 'undefined') {
    setTimeout(() => {
      if (isEmailAuthenticated()) {
        startAutoSync();
      }
    }, 2000); // wacht tot app geladen is
  }

  // ─────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────
  return {
    // Core
    sendCode, verifyCode, getAccount,
    // Session
    getEmailSession, getSessionMeta, isEmailAuthenticated, logout, clearSession,
    // Pending flow
    getPendingEmail, cancelPending,
    // Sync
    syncToCloud, restoreFromCloud, startAutoSync, stopAutoSync,
    getLastSync, onSync,
    // Config
    FUNCTIONS_URL, SYNC_PREFIXES
  };
})();

window.AuthLibrary = AuthLibrary;
console.log('[AuthLibrary] v3 loaded with cloud sync. Session:', AuthLibrary.getEmailSession() || 'none');
