// Email+Code Authentication Library
const AuthLibrary = (() => {
  const FUNCTIONS_URL = window.location.hostname === 'localhost'
    ? 'http://127.0.0.1:5001/fsy-prep/us-central1'
    : 'https://us-central1-fsy-prep.cloudfunctions.net';

  async function sendCode(email) {
    try {
      const response = await fetch(`${FUNCTIONS_URL}/sendCode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      if (data.result) {
        localStorage.setItem('wmm_email_auth', email);
        return { success: true, code: data.result.code, message: 'Code sent' };
      }
      throw new Error(data.error?.message || 'Failed to send code');
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async function verifyCode(code, anonymousId) {
    try {
      const email = localStorage.getItem('wmm_email_auth');
      if (!email) return { success: false, message: 'No email found' };
      const response = await fetch(`${FUNCTIONS_URL}/verifyCode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, anonymousId })
      });
      const data = await response.json();
      if (data.result) {
        localStorage.setItem('wmm_session_token', data.result.email);
        localStorage.removeItem('wmm_email_auth');
        return { success: true, email: data.result.email, isNewAccount: data.result.isNewAccount };
      }
      throw new Error(data.error?.message || 'Code verification failed');
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  return {
    sendCode,
    verifyCode,
    getEmailSession: () => localStorage.getItem('wmm_session_token'),
    isEmailAuthenticated: () => !!localStorage.getItem('wmm_session_token'),
    clearSession: () => { localStorage.removeItem('wmm_session_token'); localStorage.removeItem('wmm_email_auth'); },
    logout: () => { localStorage.removeItem('wmm_session_token'); localStorage.removeItem('wmm_email_auth'); }
  };
})();
