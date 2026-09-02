const fs = require('fs');

let appJs = fs.readFileSync('../app.js', 'utf8');

// 1. Replace the Store module (Lines 112 - 281)
const apiModule = `
// ================================================================
// SECTION 3: API MODULE
// ================================================================

const API = {
  async req(endpoint, method = 'GET', body = null) {
    const s = sessionStorage.getItem(STORAGE.SESSION);
    const token = s ? JSON.parse(s).token : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    try {
      const res = await fetch('/api' + endpoint, opts);
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          sessionStorage.removeItem(STORAGE.SESSION);
          window.location.hash = '';
        }
        throw new Error(data.error || 'API Error');
      }
      return data;
    } catch (err) {
      console.error('API Error:', err);
      throw err;
    }
  },
  get(endpoint) { return this.req(endpoint); },
  post(endpoint, body) { return this.req(endpoint, 'POST', body); },
  put(endpoint, body) { return this.req(endpoint, 'PUT', body); },
  delete(endpoint, body) { return this.req(endpoint, 'DELETE', body); },
};
`;
appJs = appJs.replace(/\/\/ ================================================================\n\/\/ SECTION 3: STORAGE MODULE[\s\S]*?\/\/ SECTION 4: AUDIT MODULE/, apiModule + '\n// ================================================================\n// SECTION 4: AUDIT MODULE');

// 2. Replace the Audit module
const auditModule = `
const Audit = {
  log(action, target, details = '') {
    // Audit logs are now handled automatically by the backend middleware.
    // This function is kept as a no-op to prevent breaking existing frontend code 
    // that might still call it before it is fully refactored.
  },
};
`;
appJs = appJs.replace(/const Audit = {[\s\S]*?};/, auditModule.trim());

// 3. Replace the Auth module
const authModule = `
const Auth = {
  SESSION_TIMEOUT: 30 * 60 * 1000,

  getSession() {
    const s = sessionStorage.getItem(STORAGE.SESSION);
    if (!s) return null;
    return JSON.parse(s).user;
  },

  setSession(token, user) {
    sessionStorage.setItem(STORAGE.SESSION, JSON.stringify({ token, user, lastActivity: new Date().toISOString() }));
  },

  clearSession() { sessionStorage.removeItem(STORAGE.SESSION); },

  defaultRoute(role) { return { Admin:'admin-dashboard', Midwife:'midwife-dashboard', BHW:'bhw-dashboard' }[role] || 'admin-dashboard'; },

  async handleLogin(e) {
    e.preventDefault();
    const uname = document.getElementById('login-username').value.trim();
    const pw    = document.getElementById('login-password').value;
    const errEl = document.getElementById('login-error');
    const btn   = document.getElementById('login-btn');

    errEl.style.display = 'none';
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Signing in…';

    try {
      const data = await API.post('/auth/login', { username: uname, password: pw });
      Auth.setSession(data.token, data.user);
      Router.navigate(Auth.defaultRoute(data.user.role));
    } catch (err) {
      errEl.textContent = err.message;
      errEl.style.display = 'flex';
      btn.disabled = false;
      btn.innerHTML = 'Sign In';
    }
  },

  async logout() {
    UI.confirm('Sign Out', 'Are you sure you want to log out of BHIS?', async () => {
      try { await API.post('/auth/logout'); } catch(e) {}
      Auth.clearSession();
      document.getElementById('app-shell').style.display = 'none';
      document.getElementById('login-page').style.display = 'flex';
      const f = document.getElementById('login-form');
      if (f) f.reset();
      window.location.hash = '';
    }, 'warning');
  },

  async changePw(oldPw, newPw) {
    try {
      await API.put('/auth/change-password', { currentPassword: oldPw, newPassword: newPw });
      return true;
    } catch (e) {
      return false;
    }
  },
};
`;
appJs = appJs.replace(/const Auth = {[\s\S]*?};/, authModule.trim());

// Save it back to verify
fs.writeFileSync('../app.js', appJs);
console.log('API, Audit, and Auth modules replaced in app.js');
