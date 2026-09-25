'use strict';
/* ================================================================
   BHIS — Barangay Health Information System
   app.js — Full SPA Logic (Auth, Routing, CRUD, Reports, UI)
   ================================================================ */

// ================================================================
// SECTION 1: CONSTANTS & CONFIGURATION
// ================================================================

const STORAGE = {
  USERS:      'bhis_users',
  SESSION:    'bhis_session',
  PRENATAL:   'bhis_prenatal',
  CHILDREN:   'bhis_children',
  AUDIT:      'bhis_audit',
  REPORTS:    'bhis_reports',
  SCANNED:    'bhis_scanned_reports',
  SETTINGS:   'bhis_settings',
  DASH_PREFS: 'bhis_dash_prefs',
  SEEDED:     'bhis_seeded_v2',
};

const Store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch(e){return null;} },
  arr(k) { const v = this.get(k); return Array.isArray(v) ? v : []; },
  set(k, v) { localStorage.setItem(k, JSON.stringify(v)); },
  add(k, item) { const a = this.arr(k); a.push(item); this.set(k, a); },
  update(k, id, payload) { 
    const a = this.arr(k); 
    const i = a.findIndex(x => x.id === id); 
    if(i>-1) { a[i] = {...a[i], ...payload}; this.set(k, a); } 
  },
  remove(k, id) { 
    const a = this.arr(k); 
    this.set(k, a.filter(x => x.id !== id)); 
  }
};

const VACCINE_SCHEDULE = [
  { id: 'bcg',       name: 'BCG',              doses: [{ dose:1, dayOffset:0,   label:'At Birth'  }] },
  { id: 'hepb',      name: 'Hepatitis B',       doses: [{ dose:1, dayOffset:0,   label:'At Birth'  }, { dose:2, dayOffset:42,  label:'6 weeks'  }, { dose:3, dayOffset:98,  label:'14 weeks' }] },
  { id: 'dpt',       name: 'DPT (Pentavalent)', doses: [{ dose:1, dayOffset:42,  label:'6 weeks'  }, { dose:2, dayOffset:70,  label:'10 weeks' }, { dose:3, dayOffset:98,  label:'14 weeks' }] },
  { id: 'opv',       name: 'OPV',               doses: [{ dose:1, dayOffset:42,  label:'6 weeks'  }, { dose:2, dayOffset:70,  label:'10 weeks' }, { dose:3, dayOffset:98,  label:'14 weeks' }] },
  { id: 'rotavirus', name: 'Rotavirus',          doses: [{ dose:1, dayOffset:42,  label:'6 weeks'  }, { dose:2, dayOffset:70,  label:'10 weeks' }] },
  { id: 'pcv',       name: 'PCV',               doses: [{ dose:1, dayOffset:42,  label:'6 weeks'  }, { dose:2, dayOffset:70,  label:'10 weeks' }, { dose:3, dayOffset:98,  label:'14 weeks' }] },
  { id: 'mcv',       name: 'Measles (MCV)',      doses: [{ dose:1, dayOffset:274, label:'9 months' }] },
];

const TOTAL_VACCINE_DOSES = VACCINE_SCHEDULE.reduce((s, v) => s + v.doses.length, 0);

const ROUTES = {
  'admin-dashboard':    ['Admin'],
  'admin-users':        ['Admin'],
  'admin-prenatal':     ['Admin'],
  'admin-immunization': ['Admin'],
  'admin-reports':      ['Admin'],
  'admin-audit':        ['Admin'],
  'admin-settings':     ['Admin'],
  'admin-profile':      ['Admin'],
  'midwife-dashboard':  ['Midwife'],
  'midwife-prenatal':   ['Midwife'],
  'midwife-immunization':['Midwife'],
  'midwife-reports':    ['Midwife'],
  'midwife-profile':    ['Midwife'],
  'bhw-dashboard':      ['BHW'],
  'bhw-prenatal':       ['BHW'],
  'bhw-children':       ['BHW'],
  'bhw-profile':        ['BHW'],
};

// ================================================================
// SECTION 2: UTILITY FUNCTIONS
// ================================================================

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

function hashPw(pw) {
  let h = 5381;
  for (let i = 0; i < pw.length; i++) { h = ((h << 5) + h) ^ pw.charCodeAt(i); }
  return 'h_' + Math.abs(h).toString(16);
}

function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt)) return '—';
  return dt.toLocaleDateString('en-PH', { year:'numeric', month:'short', day:'numeric' });
}

function fmtDT(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt)) return '—';
  return dt.toLocaleString('en-PH', { year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
}

function daysDiff(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

function calcEDD(lmp) {
  const d = new Date(lmp);
  d.setDate(d.getDate() + 280);
  return d.toISOString().split('T')[0];
}

function calcAOG(lmp) {
  return Math.max(0, Math.floor(daysDiff(lmp, new Date()) / 7));
}

function esc(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function todayStr() { return new Date().toISOString().split('T')[0]; }

function monthName(n) {
  return ['January','February','March','April','May','June',
          'July','August','September','October','November','December'][n-1] || '';
}


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

// ================================================================
// SECTION 4: AUDIT MODULE
// ================================================================

const Audit = {
  log(action, target, details = '') {
    // Audit logs are now handled automatically by the backend middleware.
    // This function is kept as a no-op to prevent breaking existing frontend code 
    // that might still call it before it is fully refactored.
  },
};

// ================================================================
// SECTION 5: AUTH MODULE
// ================================================================

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

  touch() {
    const s = sessionStorage.getItem(STORAGE.SESSION);
    if (s) {
      try {
        const data = JSON.parse(s);
        data.lastActivity = new Date().toISOString();
        sessionStorage.setItem(STORAGE.SESSION, JSON.stringify(data));
      } catch(e) {}
    }
  },

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
    console.log('[DEBUG] Starting login flow');
    try {
      console.log('[DEBUG] Calling API.post');
      const data = await API.post('/auth/login', { username: uname, password: pw });
      console.log('[DEBUG] API returned successfully');
      Auth.setSession(data.token, data.user);
      console.log('[DEBUG] Session set. Navigating to', Auth.defaultRoute(data.user.role));
      Router.navigate(Auth.defaultRoute(data.user.role));
      console.log('[DEBUG] Navigation triggered');
    } catch (err) {
      console.error('[DEBUG] Caught error:', err);
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
      
      const errEl = document.getElementById('login-error');
      if (errEl) errEl.style.display = 'none';
      
      const btn = document.getElementById('login-btn');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = 'Sign In';
      }

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

// ================================================================
// SECTION 6: IMMUNIZATION HELPERS
// ================================================================

const Imm = {
  completion(c) {
    const given = VACCINE_SCHEDULE.reduce((sum, v) =>
      sum + v.doses.filter(d => c.vaccines.some(cv => cv.vaccineId === v.id && cv.dose === d.dose)).length, 0);
    return Math.round((given / TOTAL_VACCINE_DOSES) * 100);
  },

  scheduleRows(c) {
    const dob = new Date(c.dob);
    const today = new Date();
    const rows = [];
    VACCINE_SCHEDULE.forEach(v => {
      v.doses.forEach(d => {
        const due = new Date(dob.getTime() + d.dayOffset * 86400000);
        const given = c.vaccines.find(cv => cv.vaccineId === v.id && cv.dose === d.dose);
        const diffDays = (due - today) / 86400000;
        let status = 'upcoming';
        if (given) status = 'given';
        else if (due < today) status = 'overdue';
        else if (diffDays <= 14) status = 'due';
        rows.push({ vaccineId:v.id, vaccineName:v.name, dose:d.dose, doseLabel:d.label,
          dueDate:due.toISOString().split('T')[0], dateGiven:given?.dateGiven||null, status });
      });
    });
    return rows;
  },

  isOverdue(c) { return this.scheduleRows(c).some(r => r.status === 'overdue'); },

  nextDoseOptions(c) {
    const opts = [];
    VACCINE_SCHEDULE.forEach(v => v.doses.forEach(d => {
      if (!c.vaccines.find(cv => cv.vaccineId === v.id && cv.dose === d.dose))
        opts.push({ vaccineId:v.id, dose:d.dose, label:`${v.name} — Dose ${d.dose} (${d.label})` });
    }));
    return opts;
  },
};

// ================================================================
// SECTION 7: PAGE STATE
// ================================================================

const State = {
  cache:     {},
  prenatal:  { page:1, search:'', filter:'all' },
  children:  { page:1, search:'', filter:'all' },
  users:     { page:1, search:'', filter:'all' },
  audit:     { page:1, search:'', filterAction:'all', dateFrom:'', dateTo:'' },
  reports:   { tab:'generate' },
};

// ================================================================
// SECTION 8: UI HELPERS
// ================================================================

const UI = {
  _pendingConfirm: null,

  // ---- Toasts ----
  toast(msg, type = 'info', ms = 3800) {
    const icons = { success:'✅', error:'❌', warning:'⚠️', info:'ℹ️' };
    const id = uid();
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.id = `t-${id}`;
    el.innerHTML = `<span class="toast-icon">${icons[type]||icons.info}</span><span class="toast-message">${esc(msg)}</span><button class="toast-close" onclick="UI._rmToast('${id}')">✕</button>`;
    document.getElementById('toast-container').appendChild(el);
    setTimeout(() => UI._rmToast(id), ms);
  },

  _rmToast(id) {
    const el = document.getElementById(`t-${id}`);
    if (el) { el.style.animation = 'toastOut 0.28s ease forwards'; setTimeout(() => el?.remove(), 280); }
  },

  // ---- Modal ----
  showModal(html, opts = {}) {
    const ov = document.getElementById('modal-overlay');
    const c  = document.getElementById('modal-container');
    const sz = opts.size === 'lg' ? 'modal-lg' : opts.size === 'sm' ? 'modal-sm' : '';
    c.innerHTML = `<div class="modal ${sz}">${html}</div>`;
    ov.style.display = 'flex';
    if (window.lucide) lucide.createIcons();
  },

  closeModal() {
    document.getElementById('modal-overlay').style.display = 'none';
    document.getElementById('modal-container').innerHTML = '';
    UI._pendingConfirm = null;
  },

  closeModalOnOverlay(e) {
    if (e.target === document.getElementById('modal-overlay')) UI.closeModal();
  },

  // ---- Confirm ----
  confirm(title, msg, cb, type = 'danger') {
    UI._pendingConfirm = cb;
    const icons = { danger:'🗑️', warning:'⚠️', info:'ℹ️' };
    UI.showModal(`
      <div class="confirm-body">
        <div class="confirm-icon ${type}">${icons[type]||'❓'}</div>
        <h3>${esc(title)}</h3>
        <p>${esc(msg)}</p>
      </div>
      <div class="modal-footer" style="justify-content:center;margin-top:20px;">
        <button class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
        <button class="btn btn-${type === 'warning' ? 'outline' : 'danger'}" onclick="UI._doConfirm()">Confirm</button>
      </div>
    `, { size:'sm' });
  },

  _doConfirm() {
    const cb = UI._pendingConfirm;
    UI.closeModal();
    if (cb) cb();
  },

  // ---- Sidebar ----
  renderSidebar(session) {
    const { role, name } = session;
    document.getElementById('sidebar-name').textContent   = name;
    document.getElementById('sidebar-role').textContent   = role;
    document.getElementById('sidebar-avatar').textContent = name.charAt(0).toUpperCase();

    const settings = Store.get(STORAGE.SETTINGS) || {};
    document.getElementById('sidebar-barangay').textContent = settings.barangayName || 'Kibalabag';

    const navMap = {
      Admin: [
        { type:'section', label:'Main' },
        { route:'admin-dashboard',    label:'Dashboard',        icon:'layout-dashboard' },
        { type:'section', label:'Clinical' },
        { route:'admin-prenatal',     label:'Prenatal Care',    icon:'heart-pulse' },
        { route:'admin-immunization', label:'Child Immunization',icon:'syringe' },
        { route:'admin-reports',      label:'Reports',          icon:'file-bar-chart' },
        { type:'section', label:'Administration' },
        { route:'admin-users',        label:'User Management',  icon:'users' },
        { route:'admin-audit',        label:'Audit Logs',       icon:'shield-check' },
        { route:'admin-settings',     label:'System Settings',  icon:'settings' },
        { type:'section', label:'Account' },
        { route:'admin-profile',      label:'My Profile',       icon:'user-circle' },
      ],
      Midwife: [
        { type:'section', label:'Main' },
        { route:'midwife-dashboard',    label:'Dashboard',        icon:'layout-dashboard' },
        { type:'section', label:'Clinical' },
        { route:'midwife-prenatal',     label:'Prenatal Care',    icon:'heart-pulse' },
        { route:'midwife-immunization', label:'Child Immunization',icon:'syringe' },
        { route:'midwife-reports',      label:'Reports',          icon:'file-bar-chart' },
        { type:'section', label:'Account' },
        { route:'midwife-profile',      label:'My Profile',       icon:'user-circle' },
      ],
      BHW: [
        { type:'section', label:'Main' },
        { route:'bhw-dashboard', label:'Dashboard',         icon:'layout-dashboard' },
        { type:'section', label:'Clinical Records' },
        { route:'bhw-prenatal',  label:'Prenatal Records',  icon:'heart-pulse' },
        { route:'bhw-children',  label:'Search Children',   icon:'search' },
        { type:'section', label:'Account' },
        { route:'bhw-profile',   label:'My Profile',        icon:'user-circle' },
      ],
    };

    const current = Router.currentRoute;
    const items   = navMap[role] || [];
    document.getElementById('sidebar-nav').innerHTML = items.map(item => {
      if (item.type === 'section') return `<div class="nav-section-label">${item.label}</div>`;
      const active = current === item.route ? 'active' : '';
      return `<button class="nav-item ${active}" onclick="Router.navigate('${item.route}');UI.closeSidebar()">
        <i data-lucide="${item.icon}"></i> ${item.label}
      </button>`;
    }).join('');

    if (window.lucide) lucide.createIcons();
  },

  toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebar-overlay').classList.toggle('show');
  },

  closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('show');
  },

  // ---- Pagination ----
  paginate(arr, page, perPage = 10) {
    const total = arr.length;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const pg = Math.min(Math.max(1, page), totalPages);
    return { items: arr.slice((pg-1)*perPage, pg*perPage), page:pg, totalPages, total };
  },

  paginationHtml(page, totalPages, fnName) {
    if (totalPages <= 1) return '';
    let h = '<div class="pagination">';
    h += `<button class="page-btn" ${page===1?'disabled':''} onclick="${fnName}(${page-1})">‹</button>`;
    for (let i = 1; i <= totalPages; i++) {
      if (i===1 || i===totalPages || Math.abs(i-page)<=1)
        h += `<button class="page-btn ${i===page?'active':''}" onclick="${fnName}(${i})">${i}</button>`;
      else if (Math.abs(i-page)===2)
        h += `<button class="page-btn" disabled>…</button>`;
    }
    h += `<button class="page-btn" ${page===totalPages?'disabled':''} onclick="${fnName}(${page+1})">›</button>`;
    return h + '</div>';
  },
};

// ================================================================
// SECTION 9: ROUTER
// ================================================================

const Router = {
  currentRoute: null,

  init() {
    window.addEventListener('hashchange', () => this.resolve());
    this.resolve();
  },

  navigate(route) {
    const target = '#/' + route;
    if (window.location.hash === target) {
      this.resolve();
    } else {
      window.location.hash = target;
    }
  },

  resolve() {
    const route = (window.location.hash.replace('#/', '') || '').split('?')[0];
    const session = Auth.getSession();

    if (!session) {
      document.getElementById('app-shell').style.display = 'none';
      document.getElementById('login-page').style.display = 'flex';
      return;
    }

    Auth.touch();

    const target = route || Auth.defaultRoute(session.role);
    const allowed = ROUTES[target];
    if (!allowed || !allowed.includes(session.role)) {
      this.navigate(Auth.defaultRoute(session.role));
      return;
    }

    this.currentRoute = target;
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('app-shell').style.display = 'flex';

    UI.renderSidebar(session);
    this._render(target, session);
  },

  _render(route, session) {
    const el = document.getElementById('main-content');
    const rk = route; // routeKey passed to shared pages

    switch (route) {
      case 'admin-dashboard':    Pages.adminDashboard(el, session); break;
      case 'admin-users':        Pages.adminUsers(el, session); break;
      case 'admin-audit':        Pages.adminAudit(el, session); break;
      case 'admin-settings':     Pages.adminSettings(el, session); break;
      case 'admin-prenatal':     Pages.prenatalPage(el, session, rk); break;
      case 'admin-immunization': Pages.immunizationPage(el, session, rk); break;
      case 'admin-reports':      Pages.reportsPage(el, session, rk); break;
      case 'admin-profile':      Pages.profilePage(el, session); break;
      case 'midwife-dashboard':  Pages.midwifeDashboard(el, session); break;
      case 'midwife-prenatal':   Pages.prenatalPage(el, session, rk); break;
      case 'midwife-immunization':Pages.immunizationPage(el, session, rk); break;
      case 'midwife-reports':    Pages.reportsPage(el, session, rk); break;
      case 'midwife-profile':    Pages.profilePage(el, session); break;
      case 'bhw-dashboard':      Pages.bhwDashboard(el, session); break;
      case 'bhw-prenatal':       Pages.bhwPrenatal(el, session); break;
      case 'bhw-children':       Pages.bhwChildren(el, session); break;
      case 'bhw-profile':        Pages.profilePage(el, session); break;
      default: Pages.adminDashboard(el, session);
    }
    if (window.lucide) lucide.createIcons();
    el.scrollTop = 0;
  },
};

// ================================================================
// SECTION 10: SHARED PRENATAL HELPERS (overdue check)
// ================================================================

function isPrenatalOverdue(p) {
  if (p.status === 'Delivered' || p.archived) return false;
  if (!p.visits.length) return daysDiff(p.createdAt, new Date()) > 28;
  const last = [...p.visits].sort((a,b) => new Date(b.date)-new Date(a.date))[0];
  return daysDiff(last.date, new Date()) > 28;
}

// ================================================================
// SECTION 11: PAGE RENDERERS
// ================================================================

const Pages = {

  // ──────────────────────────────────────────────────────────────
  // ADMIN DASHBOARD
  // ──────────────────────────────────────────────────────────────
  async adminDashboard(el, session) {
    el.innerHTML = '<div class="page-content"><div style="text-align:center;padding:40px;"><i data-lucide="loader"></i> Loading Dashboard…</div></div>';
    if (window.lucide) lucide.createIcons();

    let activeUsers = 0, overdueVaccine = 0, highRiskCount = 0, logs = [];
    let users = [], prenatal = [], children = [];
    try {
      const [uRes, pRes, cRes, lRes] = await Promise.all([
        API.get('/users?limit=1000'),
        API.get('/prenatal?limit=1000'),
        API.get('/children?limit=1000'),
        API.get('/audit?limit=6')
      ]);
      users = uRes.users || [];
      prenatal = (pRes.records || []).filter(p => !p.archived);
      children = (cRes.records || []).filter(c => !c.archived);
      logs = lRes.logs || [];
      
      activeUsers = users.filter(u => u.status === 'Active').length;
      overdueVaccine = children.filter(c => Imm.isOverdue(c)).length;
      highRiskCount = prenatal.filter(p => p.highRisk).length;
    } catch (err) {
      el.innerHTML = `<div class="page-content"><div class="alert alert-danger">Error: ${esc(err.message)}</div></div>`;
      return;
    }
    const prefs = State.cache.dashPrefs || { showUsers:true, showPrenatal:true, showChildren:true, showAlerts:true };

    el.innerHTML = `
      <div class="page-header">
        <h1>Admin Dashboard</h1>
        <p>Welcome back, ${esc(session.name)}. Here's your system-wide overview.</p>
      </div>
      <div class="page-content">
        <div class="stats-grid">
          ${prefs.showUsers ? `<div class="stat-card teal">
            <div class="stat-icon teal"><i data-lucide="users"></i></div>
            <div class="stat-info"><div class="stat-value">${activeUsers}</div><div class="stat-label">Active Users</div></div>
          </div>` : ''}
          ${prefs.showPrenatal ? `<div class="stat-card accent">
            <div class="stat-icon accent"><i data-lucide="heart-pulse"></i></div>
            <div class="stat-info"><div class="stat-value">${prenatal.length}</div><div class="stat-label">Prenatal Patients</div></div>
          </div>` : ''}
          ${prefs.showChildren ? `<div class="stat-card warning">
            <div class="stat-icon warning"><i data-lucide="syringe"></i></div>
            <div class="stat-info"><div class="stat-value">${children.length}</div><div class="stat-label">Registered Children</div></div>
          </div>` : ''}
          ${prefs.showAlerts ? `<div class="stat-card danger">
            <div class="stat-icon danger"><i data-lucide="bell-ring"></i></div>
            <div class="stat-info"><div class="stat-value">${overdueVaccine}</div><div class="stat-label">Overdue Vaccine Alerts</div></div>
          </div>` : ''}
        </div>

        <div class="two-col-grid mb-20">
          <div class="card">
            <div class="section-header">
              <span class="section-title">Recent Audit Activity</span>
              <button class="btn btn-outline btn-sm" onclick="Router.navigate('admin-audit')">View All</button>
            </div>
            ${logs.length ? logs.map(l => `
              <div style="padding:9px 0;border-bottom:1px solid var(--border);display:flex;gap:10px;align-items:flex-start;">
                <span class="badge badge-${{'login':'active','logout':'archived','create':'midwife','edit':'info','view':'admin','archive':'warning','export':'accent'}[l.action]||'info'}">${l.action}</span>
                <div style="flex:1;min-width:0;">
                  <div style="font-size:0.8rem;font-weight:600;">${esc(l.username)} <span class="text-muted">(${l.role})</span></div>
                  <div class="text-muted">${esc(l.target)}</div>
                </div>
                <div class="text-muted" style="font-size:0.7rem;white-space:nowrap;">${fmtDT(l.timestamp)}</div>
              </div>`).join('') : '<div class="empty-state"><p>No recent activity</p></div>'}
          </div>

          <div class="card">
            <div class="section-header">
              <span class="section-title">User Summary by Role</span>
              <button class="btn btn-outline btn-sm" onclick="Router.navigate('admin-users')">Manage</button>
            </div>
            ${['Admin','Midwife','BHW'].map(role => {
              const cnt = users.filter(u => u.role===role && u.status==='Active').length;
              return `<div style="padding:11px 0;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;">
                <span class="badge badge-${role.toLowerCase()}">${role}</span>
                <strong>${cnt} active</strong></div>`;
            }).join('')}
            <div style="padding:11px 0;display:flex;align-items:center;justify-content:space-between;">
              <span class="text-muted">Archived accounts</span>
              <strong>${users.filter(u=>u.status==='Archived').length}</strong>
            </div>
            ${highRiskCount ? `<div class="alert alert-danger" style="margin:12px 0 0;">⚠️ <strong>${highRiskCount}</strong> high-risk prenatal patient${highRiskCount>1?'s':''}</div>` : ''}
          </div>
        </div>

        <div class="card">
          <div class="section-header mb-16"><span class="section-title">Quick Actions</span></div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button class="btn btn-primary" onclick="Router.navigate('admin-users')"><i data-lucide="user-plus"></i> Add User</button>
            <button class="btn btn-outline" onclick="Router.navigate('admin-prenatal')"><i data-lucide="heart-pulse"></i> Prenatal Records</button>
            <button class="btn btn-outline" onclick="Router.navigate('admin-immunization')"><i data-lucide="syringe"></i> Immunization</button>
            <button class="btn btn-outline" onclick="Router.navigate('admin-reports')"><i data-lucide="file-bar-chart"></i> Generate Report</button>
            <button class="btn btn-outline" onclick="Router.navigate('admin-audit')"><i data-lucide="shield-check"></i> Audit Logs</button>
            <button class="btn btn-outline" onclick="Router.navigate('admin-settings')"><i data-lucide="settings"></i> Settings</button>
          </div>
        </div>
      </div>`;
    Audit.log('view', 'Admin Dashboard', 'Viewed admin dashboard');
  },

  // ──────────────────────────────────────────────────────────────
  // ADMIN: USER MANAGEMENT
  // ──────────────────────────────────────────────────────────────
  adminUsers(el, session) { this._usersPage(el, session, 1); },

  async _usersPage(el, session, page) {
    State.users.page = page;
    const params = new URLSearchParams({ page, limit: 10 });
    if (State.users.search) params.set('search', State.users.search);
    if (State.users.filter !== 'all') params.set('role', State.users.filter);

    el.innerHTML = `<div class="page-header"><h1>User Management</h1><p>Create, update, and manage all system user accounts and roles.</p></div><div class="page-content"><div class="section-header mb-16"><div></div><button class="btn btn-primary" onclick="Pages.showCreateUserModal()"><i data-lucide="user-plus"></i> Add User</button></div><div style="text-align:center;padding:40px;color:var(--text-secondary);"><i data-lucide="loader"></i> Loading…</div></div>`;
    if (window.lucide) lucide.createIcons();

    let items = [], total = 0, pg = page, totalPages = 1;
    try {
      const data = await API.get('/users?' + params);
      items = (data.users || []).map(u => ({ ...u, id: String(u._id) }));
      total = data.total || 0;
      pg = data.page || page;
      totalPages = data.pages || 1;
      State.cache.users = items; // Store in cache for modals
    } catch(err) {
      el.innerHTML = `<div class="page-header"><h1>User Management</h1></div><div class="page-content"><div class="alert alert-danger">⚠️ Failed to load users: ${esc(err.message)}</div></div>`;
      return;
    }

    el.innerHTML = `
      <div class="page-header">
        <h1>User Management</h1>
        <p>Create, update, and manage all system user accounts and roles.</p>
      </div>
      <div class="page-content">
        <div class="section-header mb-16">
          <div></div>
          <button class="btn btn-primary" onclick="Pages.showCreateUserModal()"><i data-lucide="user-plus"></i> Add User</button>
        </div>
        <div class="table-wrapper">
          <div class="table-toolbar">
            <div class="search-input-wrapper">
              <span class="search-icon"><i data-lucide="search"></i></span>
              <input type="text" class="search-input" placeholder="Search name or username…" value="${esc(State.users.search)}"
                oninput="State.users.search=this.value;Pages._usersPage(document.getElementById('main-content'),Auth.getSession(),1)">
            </div>
            <select class="filter-select" onchange="State.users.filter=this.value;Pages._usersPage(document.getElementById('main-content'),Auth.getSession(),1)">
              <option value="all" ${State.users.filter==='all'?'selected':''}>All Roles</option>
              <option value="Admin"   ${State.users.filter==='Admin'?'selected':''}>Admin</option>
              <option value="Midwife" ${State.users.filter==='Midwife'?'selected':''}>Midwife</option>
              <option value="BHW"     ${State.users.filter==='BHW'?'selected':''}>BHW</option>
            </select>
          </div>
          <div style="overflow-x:auto;">
            <table>
              <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Contact</th><th>Status</th><th>Last Login</th><th>Actions</th></tr></thead>
              <tbody>
                ${items.length ? items.map(u => `
                  <tr>
                    <td><strong>${esc(u.name)}</strong></td>
                    <td><code>${esc(u.username)}</code></td>
                    <td><span class="badge badge-${u.role.toLowerCase()}">${u.role}</span></td>
                    <td class="text-muted">${esc(u.contact||'—')}</td>
                    <td><span class="badge badge-${u.status==='Active'?'active':'archived'}">${u.status}</span></td>
                    <td class="text-muted" style="font-size:0.78rem;">${u.lastLogin ? fmtDT(u.lastLogin) : 'Never'}</td>
                    <td>
                      <div style="display:flex;gap:5px;flex-wrap:nowrap;">
                        <button class="btn btn-outline btn-sm" onclick="Pages.showEditUserModal('${u.id}')">Edit</button>
                        <button class="btn btn-outline btn-sm" onclick="Pages.showResetPwModal('${u.id}')">Reset PW</button>
                        ${u.id !== session.id ? `<button class="btn btn-${u.status==='Active'?'danger':'outline'} btn-sm" onclick="Pages.toggleUserStatus('${u.id}','${rk_esc(session)}')">${u.status==='Active'?'Archive':'Restore'}</button>` : ''}
                      </div>
                    </td>
                  </tr>`).join('') : `<tr><td colspan="7"><div class="empty-state"><div class="empty-state-icon">👤</div><p>No users found</p></div></td></tr>`}
              </tbody>
            </table>
          </div>
          <div class="table-footer">
            <span class="table-info">Showing ${items.length} of ${total} users</span>
            ${UI.paginationHtml(pg, totalPages, '_UPg')}
          </div>
        </div>
      </div>`;
    window._UPg = p => Pages._usersPage(el, session, p);
    if (window.lucide) lucide.createIcons();
  },

  showCreateUserModal() {
    UI.showModal(`
      <div class="modal-header"><h3>Add New User</h3><button class="modal-close" onclick="UI.closeModal()"><i data-lucide="x"></i></button></div>
      <form onsubmit="Pages.createUser(event)" novalidate>
        <div class="form-row">
          <div class="form-group"><label>Full Name *</label><input type="text" class="form-control" id="cu-name" required placeholder="Juan Dela Cruz"></div>
          <div class="form-group"><label>Username *</label><input type="text" class="form-control" id="cu-uname" required placeholder="jdelacruz"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Temporary Password *</label><input type="password" class="form-control" id="cu-pw" required minlength="6" placeholder="Min. 6 characters"></div>
          <div class="form-group"><label>Role *</label>
            <select class="form-control" id="cu-role" required>
              <option value="">Select role…</option>
              <option value="Admin">Admin</option><option value="Midwife">Midwife</option><option value="BHW">BHW</option>
            </select>
          </div>
        </div>
        <div class="form-group"><label>Contact Number</label><input type="text" class="form-control" id="cu-contact" placeholder="09XX XXX XXXX"></div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Create User</button>
        </div>
      </form>`);
  },

  async createUser(e) {
    e.preventDefault();
    const btn = e.target.querySelector('[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
    const name    = document.getElementById('cu-name').value.trim();
    const username= document.getElementById('cu-uname').value.trim().toLowerCase();
    const password= document.getElementById('cu-pw').value;
    const role    = document.getElementById('cu-role').value;
    const contact = document.getElementById('cu-contact').value.trim();
    
    if (!role) { UI.toast('Please select a role.', 'error'); return; }
    
    try {
      await API.post('/users', { name, username, password, role, contact, status: 'Active' });
      UI.closeModal();
      UI.toast(`User "${name}" created!`, 'success');
      await Pages._usersPage(document.getElementById('main-content'), Auth.getSession(), 1);
    } catch(err) {
      UI.toast('Error: ' + err.message, 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'Create User'; }
    }
  },

  showEditUserModal(userId) {
    const u = State.cache.users.find(u => u.id === userId);
    if (!u) { UI.toast('User not found. Please refresh.', 'error'); return; }
    UI.showModal(`
      <div class="modal-header"><h3>Edit User — ${esc(u.name)}</h3><button class="modal-close" onclick="UI.closeModal()"><i data-lucide="x"></i></button></div>
      <form onsubmit="Pages.updateUser(event,'${userId}')" novalidate>
        <div class="form-row">
          <div class="form-group"><label>Full Name *</label><input type="text" class="form-control" id="eu-name" value="${esc(u.name)}" required></div>
          <div class="form-group"><label>Username</label><input class="form-control" value="${esc(u.username)}" disabled></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Role *</label>
            <select class="form-control" id="eu-role" required>
              <option value="Admin"   ${u.role==='Admin'?'selected':''}>Admin</option>
              <option value="Midwife" ${u.role==='Midwife'?'selected':''}>Midwife</option>
              <option value="BHW"     ${u.role==='BHW'?'selected':''}>BHW</option>
            </select>
          </div>
          <div class="form-group"><label>Contact</label><input type="text" class="form-control" id="eu-contact" value="${esc(u.contact||'')}"></div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Changes</button>
        </div>
      </form>`);
  },

  async updateUser(e, userId) {
    e.preventDefault();
    const btn = e.target.querySelector('[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
    const name    = document.getElementById('eu-name').value.trim();
    const role    = document.getElementById('eu-role').value;
    const contact = document.getElementById('eu-contact').value.trim();
    
    try {
      await API.put('/users/' + userId, { name, role, contact });
      UI.closeModal();
      UI.toast('User updated!', 'success');
      await Pages._usersPage(document.getElementById('main-content'), Auth.getSession(), State.users.page);
    } catch(err) {
      UI.toast('Error: ' + err.message, 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'Save Changes'; }
    }
  },

  showResetPwModal(userId) {
    const u = State.cache.users.find(u => u.id === userId);
    if (!u) { UI.toast('User not found. Please refresh.', 'error'); return; }
    UI.showModal(`
      <div class="modal-header"><h3>Reset Password — ${esc(u.name)}</h3><button class="modal-close" onclick="UI.closeModal()"><i data-lucide="x"></i></button></div>
      <p class="text-muted mb-16">Set a new temporary password for this user.</p>
      <form onsubmit="Pages.resetUserPw(event,'${userId}')" novalidate>
        <div class="form-group"><label>New Password *</label><input type="password" class="form-control" id="rp-pw" required minlength="6" placeholder="Min. 6 characters"></div>
        <div class="form-group"><label>Confirm Password *</label><input type="password" class="form-control" id="rp-confirm" required placeholder="Repeat new password"></div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Reset Password</button>
        </div>
      </form>`);
  },

  async resetUserPw(e, userId) {
    e.preventDefault();
    const pw = document.getElementById('rp-pw').value;
    const c  = document.getElementById('rp-confirm').value;
    if (pw !== c) { UI.toast('Passwords do not match!', 'error'); return; }
    const btn = e.target.querySelector('[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
    
    try {
      await API.put('/users/' + userId + '/reset-password', { newPassword: pw });
      UI.closeModal();
      UI.toast('Password reset successfully.', 'success');
    } catch(err) {
      UI.toast('Error: ' + err.message, 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'Reset Password'; }
    }
  },

  async toggleUserStatus(userId) {
    const u = State.cache.users.find(u => u.id === userId);
    if (!u) { UI.toast('User not found. Please refresh.', 'error'); return; }
    const toArchive = u.status === 'Active';
    UI.confirm(
      toArchive ? 'Archive User' : 'Restore User',
      toArchive ? `Archive "${u.name}"? They will no longer be able to log in.`
                : `Restore "${u.name}"? They will regain access to the system.`,
      async () => {
        try {
          await API.put('/users/' + userId, { status: toArchive ? 'Archived' : 'Active' });
          UI.toast(`"${u.name}" ${toArchive?'archived':'restored'}.`, 'success');
          await Pages._usersPage(document.getElementById('main-content'), Auth.getSession(), State.users.page);
        } catch(err) {
          UI.toast('Error: ' + err.message, 'error');
        }
      },
      toArchive ? 'danger' : 'warning'
    );
  },

  // ──────────────────────────────────────────────────────────────
  // ADMIN: AUDIT LOG
  // ──────────────────────────────────────────────────────────────
  adminAudit(el, session) { this._auditPage(el, session, 1); },

  async _auditPage(el, session, page) {
    State.audit.page = page;
    const params = new URLSearchParams({ page, limit: 15 });
    if (State.audit.search) params.set('search', State.audit.search);
    if (State.audit.filterAction !== 'all') params.set('action', State.audit.filterAction);
    if (State.audit.dateFrom) params.set('dateFrom', State.audit.dateFrom);
    if (State.audit.dateTo) params.set('dateTo', State.audit.dateTo);

    el.innerHTML = `<div class="page-header"><h1>Audit Logs</h1><p>Complete chronological record of all system actions for accountability.</p></div><div class="page-content"><div style="text-align:center;padding:40px;color:var(--text-secondary);"><i data-lucide="loader"></i> Loading…</div></div>`;
    if (window.lucide) lucide.createIcons();

    let items = [], total = 0, pg = page, totalPages = 1;
    try {
      const data = await API.get('/audit?' + params);
      items = data.logs || [];
      total = data.total || 0;
      pg = data.page || page;
      totalPages = data.pages || 1;
    } catch(err) {
      el.innerHTML = `<div class="page-header"><h1>Audit Logs</h1></div><div class="page-content"><div class="alert alert-danger">⚠️ Failed to load audit logs: ${esc(err.message)}</div></div>`;
      return;
    }

    const actColor = { login:'active', logout:'archived', create:'midwife', edit:'info', view:'admin', archive:'warning', export:'accent', delete:'danger' };

    el.innerHTML = `
      <div class="page-header">
        <h1>Audit Logs</h1>
        <p>Complete chronological record of all system actions for accountability.</p>
      </div>
      <div class="page-content">
        <div class="section-header mb-16">
          <div></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="btn btn-outline btn-sm" onclick="Pages.exportAuditPDF()"><i data-lucide="file-text"></i> PDF</button>
            <button class="btn btn-outline btn-sm" onclick="Pages.exportAuditCSV()"><i data-lucide="download"></i> CSV</button>
            <button class="btn btn-danger btn-sm" onclick="Pages.showClearLogsModal()"><i data-lucide="trash-2"></i> Clear Old</button>
          </div>
        </div>
        <div class="table-wrapper">
          <div class="table-toolbar">
            <div class="search-input-wrapper">
              <span class="search-icon"><i data-lucide="search"></i></span>
              <input type="text" class="search-input" placeholder="Search user, action, or target…" value="${esc(State.audit.search)}"
                oninput="State.audit.search=this.value;Pages._auditPage(document.getElementById('main-content'),Auth.getSession(),1)">
            </div>
            <select class="filter-select" onchange="State.audit.filterAction=this.value;Pages._auditPage(document.getElementById('main-content'),Auth.getSession(),1)">
              <option value="all">All Actions</option>
              ${['login','logout','create','edit','view','archive','export','delete'].map(a =>
                `<option value="${a}" ${State.audit.filterAction===a?'selected':''}>${a.charAt(0).toUpperCase()+a.slice(1)}</option>`).join('')}
            </select>
            <div class="date-range-wrapper">
              <input type="date" value="${State.audit.dateFrom}" title="From date"
                onchange="State.audit.dateFrom=this.value;Pages._auditPage(document.getElementById('main-content'),Auth.getSession(),1)">
              <span class="text-muted">to</span>
              <input type="date" value="${State.audit.dateTo}" title="To date"
                onchange="State.audit.dateTo=this.value;Pages._auditPage(document.getElementById('main-content'),Auth.getSession(),1)">
            </div>
          </div>
          <div style="overflow-x:auto;">
            <table>
              <thead><tr><th>Timestamp</th><th>User</th><th>Role</th><th>Action</th><th>Target</th><th>Details</th></tr></thead>
              <tbody>
                ${items.length ? items.map(l => `
                  <tr>
                    <td class="text-muted" style="font-size:0.76rem;white-space:nowrap;">${fmtDT(l.timestamp)}</td>
                    <td><strong>${esc(l.username)}</strong></td>
                    <td><span class="badge badge-${(l.role||'').toLowerCase()}">${l.role}</span></td>
                    <td><span class="badge badge-${actColor[l.action]||'info'}">${l.action}</span></td>
                    <td>${esc(l.target)}</td>
                    <td class="text-muted" style="font-size:0.78rem;">${esc(l.details)}</td>
                  </tr>`).join('') : `<tr><td colspan="6"><div class="empty-state"><div class="empty-state-icon">📋</div><p>No audit logs found</p></div></td></tr>`}
              </tbody>
            </table>
          </div>
          <div class="table-footer">
            <span class="table-info">Showing ${items.length} of ${total} entries</span>
            ${UI.paginationHtml(pg, totalPages, '_APg')}
          </div>
        </div>
      </div>`;
    window._APg = p => Pages._auditPage(el, session, p);
    if (window.lucide) lucide.createIcons();
  },

  async exportAuditPDF() {
    const params = new URLSearchParams({ limit: 10000 });
    if (State.audit.search) params.set('search', State.audit.search);
    if (State.audit.filterAction !== 'all') params.set('action', State.audit.filterAction);
    if (State.audit.dateFrom) params.set('dateFrom', State.audit.dateFrom);
    if (State.audit.dateTo) params.set('dateTo', State.audit.dateTo);

    let logs = [];
    try {
      const data = await API.get('/audit?' + params);
      logs = data.logs || [];
    } catch(e) {
      UI.toast('Failed to fetch logs for export.', 'error');
      return;
    }
    
    const settings = Store.get(STORAGE.SETTINGS)||{};
    if (!window.jspdf) { UI.toast('PDF library not loaded. Check internet connection.', 'error'); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation:'landscape' });
    doc.setFontSize(13); doc.text(`${settings.healthCenterName||'Health Center'} — System Audit Log`, 14, 14);
    doc.setFontSize(9);  doc.text(`Generated: ${fmtDT(new Date().toISOString())} | ${settings.barangayName||''}`, 14, 21);
    doc.autoTable({
      startY:26, styles:{fontSize:7.5},
      headStyles:{fillColor:[13,115,119]},
      head:[['Timestamp','Username','Role','Action','Target','Details']],
      body: logs.map(l=>[fmtDT(l.timestamp),l.username,l.role,l.action,l.target,l.details]),
    });
    doc.save('bhis-audit-log.pdf');
    UI.toast('Audit log exported to PDF!', 'success');
  },

  async exportAuditCSV() {
    const params = new URLSearchParams({ limit: 10000 });
    if (State.audit.search) params.set('search', State.audit.search);
    if (State.audit.filterAction !== 'all') params.set('action', State.audit.filterAction);
    if (State.audit.dateFrom) params.set('dateFrom', State.audit.dateFrom);
    if (State.audit.dateTo) params.set('dateTo', State.audit.dateTo);

    let logs = [];
    try {
      const data = await API.get('/audit?' + params);
      logs = data.logs || [];
    } catch(e) {
      UI.toast('Failed to fetch logs for export.', 'error');
      return;
    }
    
    if (!window.XLSX) { UI.toast('Excel library not loaded.', 'error'); return; }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(logs.map(l=>({ Timestamp:fmtDT(l.timestamp), Username:l.username, Role:l.role, Action:l.action, Target:l.target, Details:l.details })));
    XLSX.utils.book_append_sheet(wb, ws, 'Audit Log');
    XLSX.writeFile(wb, 'bhis-audit-log.csv');
    UI.toast('Audit log exported to CSV!', 'success');
  },

  showClearLogsModal() {
    UI.showModal(`
      <div class="modal-header"><h3>Clear Old Audit Logs</h3><button class="modal-close" onclick="UI.closeModal()"><i data-lucide="x"></i></button></div>
      <div class="alert alert-warning">⚠️ This permanently deletes all logs older than the selected date. This cannot be undone.</div>
      <form onsubmit="Pages.clearOldLogs(event)" novalidate>
        <div class="form-group"><label>Delete logs older than *</label><input type="date" class="form-control" id="cl-date" required></div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-danger">Clear Logs</button>
        </div>
      </form>`, { size:'sm' });
  },

  async clearOldLogs(e) {
    e.preventDefault();
    const cutoff = document.getElementById('cl-date').value;
    const btn = e.target.querySelector('[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Clearing…'; }
    
    try {
      const res = await API.delete('/audit/clear', { beforeDate: cutoff });
      UI.closeModal();
      UI.toast(res.message || 'Old logs cleared.', 'success');
      await Pages._auditPage(document.getElementById('main-content'), Auth.getSession(), 1);
    } catch(err) {
      UI.toast('Error: ' + err.message, 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'Clear Logs'; }
    }
  },

  // ──────────────────────────────────────────────────────────────
  // ADMIN: SYSTEM SETTINGS
  // ──────────────────────────────────────────────────────────────
  adminSettings(el, session) {
    const s = Store.get(STORAGE.SETTINGS)||{};
    const p = Store.get(STORAGE.DASH_PREFS) || { showUsers:true, showPrenatal:true, showChildren:true, showAlerts:true };
    el.innerHTML = `
      <div class="page-header">
        <h1>System Settings</h1>
        <p>Configure barangay and health center information used in all generated reports.</p>
      </div>
      <div class="page-content">
        <div class="card profile-card">
          <h3 style="margin-bottom:18px;font-size:1rem;">🏥 Health Center Information</h3>
          <form onsubmit="Pages.saveSettings(event)" novalidate>
            <div class="form-group"><label>Barangay Name *</label><input type="text" class="form-control" id="s-bgy" value="${esc(s.barangayName||'')}" required></div>
            <div class="form-group"><label>Municipality / City *</label><input type="text" class="form-control" id="s-mun" value="${esc(s.municipality||'')}" required></div>
            <div class="form-group"><label>Health Center Name *</label><input type="text" class="form-control" id="s-hcn" value="${esc(s.healthCenterName||'')}" required></div>
            <div class="divider"></div>
            <h3 style="margin-bottom:18px;font-size:1rem;">📞 Contact Details</h3>
            <div class="form-group"><label>Address *</label><input type="text" class="form-control" id="s-addr" value="${esc(s.address||'')}" required></div>
            <div class="form-group"><label>Contact Number</label><input type="text" class="form-control" id="s-tel" value="${esc(s.contact||'')}"></div>
            <div style="margin-top:20px;">
              <button type="submit" class="btn btn-primary"><i data-lucide="save"></i> Save Settings</button>
            </div>
          </form>
        </div>

        <div class="card profile-card" style="margin-top:20px;">
          <h3 style="margin-bottom:6px;font-size:1rem;">🖥️ Dashboard Preferences</h3>
          <p class="text-muted" style="font-size:0.82rem;margin-bottom:18px;">Choose which stat cards appear on the Admin Dashboard.</p>
          <form onsubmit="Pages.saveDashPrefs(event)" novalidate>
            <div style="display:grid;gap:10px;">
              <label style="display:flex;align-items:center;gap:10px;font-size:0.88rem;cursor:pointer;">
                <input type="checkbox" id="dp-users" ${p.showUsers ? 'checked' : ''}> Active Users card
              </label>
              <label style="display:flex;align-items:center;gap:10px;font-size:0.88rem;cursor:pointer;">
                <input type="checkbox" id="dp-prenatal" ${p.showPrenatal ? 'checked' : ''}> Prenatal Patients card
              </label>
              <label style="display:flex;align-items:center;gap:10px;font-size:0.88rem;cursor:pointer;">
                <input type="checkbox" id="dp-children" ${p.showChildren ? 'checked' : ''}> Registered Children card
              </label>
              <label style="display:flex;align-items:center;gap:10px;font-size:0.88rem;cursor:pointer;">
                <input type="checkbox" id="dp-alerts" ${p.showAlerts ? 'checked' : ''}> Overdue Vaccine Alerts card
              </label>
            </div>
            <div style="margin-top:20px;">
              <button type="submit" class="btn btn-primary"><i data-lucide="layout-dashboard"></i> Save Dashboard Preferences</button>
            </div>
          </form>
        </div>
      </div>`;
    if (window.lucide) lucide.createIcons();
  },

  saveSettings(e) {
    e.preventDefault();
    const settings = {
      barangayName:     document.getElementById('s-bgy').value.trim(),
      municipality:     document.getElementById('s-mun').value.trim(),
      healthCenterName: document.getElementById('s-hcn').value.trim(),
      address:          document.getElementById('s-addr').value.trim(),
      contact:          document.getElementById('s-tel').value.trim(),
    };
    Store.set(STORAGE.SETTINGS, settings);
    Audit.log('edit', 'System Settings', 'Updated barangay/health center information');
    UI.toast('Settings saved successfully!', 'success');
    document.getElementById('sidebar-barangay').textContent = settings.barangayName;
  },

  saveDashPrefs(e) {
    e.preventDefault();
    const prefs = {
      showUsers:    document.getElementById('dp-users').checked,
      showPrenatal: document.getElementById('dp-prenatal').checked,
      showChildren: document.getElementById('dp-children').checked,
      showAlerts:   document.getElementById('dp-alerts').checked,
    };
    Store.set(STORAGE.DASH_PREFS, prefs);
    Audit.log('edit', 'Dashboard Preferences', 'Updated admin dashboard stat card visibility');
    UI.toast('Dashboard preferences saved!', 'success');
  },

  // ──────────────────────────────────────────────────────────────
  // MIDWIFE DASHBOARD (also used by Admin clinical overview)
  // ──────────────────────────────────────────────────────────────
  async midwifeDashboard(el, session) {
    el.innerHTML = '<div class="page-content"><div style="text-align:center;padding:40px;"><i data-lucide="loader"></i> Loading Dashboard…</div></div>';
    if (window.lucide) lucide.createIcons();

    let prenatal = [], children = [];
    try {
      const [pRes, cRes] = await Promise.all([
        API.get('/prenatal?limit=1000'),
        API.get('/children?limit=1000')
      ]);
      prenatal = (pRes.records || []).filter(p => !p.archived);
      children = (cRes.records || []).filter(c => !c.archived);
    } catch (err) {
      el.innerHTML = `<div class="page-content"><div class="alert alert-danger">Error: ${esc(err.message)}</div></div>`;
      return;
    }
    const prefix   = session.role === 'Admin' ? 'admin' : 'midwife';

    const overdueVisit   = prenatal.filter(p => isPrenatalOverdue(p));
    const overdueVaccine = children.filter(c => Imm.isOverdue(c));

    el.innerHTML = `
      <div class="page-header">
        <h1>${session.role==='Admin'?'Clinical Overview':'Midwife Dashboard'}</h1>
        <p>${session.role==='Admin' ? 'Clinical caseload overview for audit and oversight.' : `Welcome, ${esc(session.name)}. Here's your clinic summary.`}</p>
      </div>
      <div class="page-content">
        <div class="stats-grid">
          <div class="stat-card teal">
            <div class="stat-icon teal"><i data-lucide="heart-pulse"></i></div>
            <div class="stat-info"><div class="stat-value">${prenatal.length}</div><div class="stat-label">Total Prenatal Patients</div></div>
          </div>
          <div class="stat-card accent">
            <div class="stat-icon accent"><i data-lucide="baby"></i></div>
            <div class="stat-info"><div class="stat-value">${children.length}</div><div class="stat-label">Registered Children</div></div>
          </div>
          <div class="stat-card warning">
            <div class="stat-icon warning"><i data-lucide="alert-triangle"></i></div>
            <div class="stat-info"><div class="stat-value">${overdueVisit.length}</div><div class="stat-label">Overdue Prenatal Visits</div></div>
          </div>
          <div class="stat-card danger">
            <div class="stat-icon danger"><i data-lucide="bell-ring"></i></div>
            <div class="stat-info"><div class="stat-value">${overdueVaccine.length}</div><div class="stat-label">Overdue Vaccine Alerts</div></div>
          </div>
        </div>

        <div class="two-col-grid">
          <div class="card">
            <div class="section-header">
              <span class="section-title">⚠️ Overdue Prenatal Visits</span>
              <button class="btn btn-outline btn-sm" onclick="Router.navigate('${prefix}-prenatal')">View All</button>
            </div>
            ${overdueVisit.length ? overdueVisit.slice(0,6).map(p => `
              <div style="padding:9px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;gap:8px;">
                <div>
                  <div style="font-size:0.84rem;font-weight:600;">${esc(p.name)}</div>
                  <div class="text-muted">AOG: ${calcAOG(p.lmp)} wks · EDD: ${fmtDate(p.edd)}</div>
                </div>
                <span class="badge badge-overdue">Overdue</span>
              </div>`).join('') : '<div class="empty-state"><p>No overdue visits 🎉</p></div>'}
          </div>

          <div class="card">
            <div class="section-header">
              <span class="section-title">💉 Overdue Vaccine Alerts</span>
              <button class="btn btn-outline btn-sm" onclick="Router.navigate('${prefix}-immunization')">View All</button>
            </div>
            ${overdueVaccine.length ? overdueVaccine.slice(0,6).map(c => `
              <div style="padding:9px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;gap:8px;">
                <div>
                  <div style="font-size:0.84rem;font-weight:600;">${esc(c.name)}</div>
                  <div class="text-muted">Mother: ${esc(c.motherName)} · ${fmtDate(c.dob)}</div>
                </div>
                <span class="badge badge-overdue">Overdue</span>
              </div>`).join('') : '<div class="empty-state"><p>No overdue vaccines 🎉</p></div>'}
          </div>
        </div>
      </div>`;
    Audit.log('view', 'Clinical Dashboard', 'Viewed midwife/clinical dashboard');
  },

  // ──────────────────────────────────────────────────────────────
  // PRENATAL CARE (shared: admin-prenatal / midwife-prenatal)
  // ──────────────────────────────────────────────────────────────
  prenatalPage(el, session, routeKey) { this._prenatalList(el, session, routeKey, 1); },

  async _prenatalList(el, session, routeKey, page) {
    State.prenatal.page = page;
    const params = new URLSearchParams({ page, limit: 20 });
    if (State.prenatal.search) params.set('search', State.prenatal.search);
    if (State.prenatal.filter !== 'all') params.set('status', State.prenatal.filter);

    el.innerHTML = `<div class="page-header"><h1>Prenatal Care</h1><p>Register and track prenatal patients, log check-up visits, and record deliveries.</p></div><div class="page-content"><div class="section-header mb-16"><div></div><button class="btn btn-primary" onclick="Pages.showAddPrenatalModal('${routeKey}')"><i data-lucide="plus"></i> Register Patient</button></div><div style="text-align:center;padding:40px;color:var(--text-secondary);"><i data-lucide="loader"></i> Loading…</div></div>`;
    if (window.lucide) lucide.createIcons();

    let items = [], total = 0, pg = page, totalPages = 1;
    try {
      const data = await API.get('/prenatal?' + params);
      items = (data.records || []).map(r => ({ ...r, id: String(r._id) }));
      total = data.total || 0;
      pg = data.page || page;
      totalPages = data.pages || 1;
      State.cache.prenatal = items;
    } catch(err) {
      el.innerHTML = `<div class="page-header"><h1>Prenatal Care</h1></div><div class="page-content"><div class="alert alert-danger">⚠️ Failed to load records: ${esc(err.message)}</div></div>`;
      return;
    }

    el.innerHTML = `
      <div class="page-header">
        <h1>Prenatal Care</h1>
        <p>Register and track prenatal patients, log check-up visits, and record deliveries.</p>
      </div>
      <div class="page-content">
        <div class="section-header mb-16">
          <div></div>
          <button class="btn btn-primary" onclick="Pages.showAddPrenatalModal('${routeKey}')"><i data-lucide="plus"></i> Register Patient</button>
        </div>
        <div class="table-wrapper">
          <div class="table-toolbar">
            <div class="search-input-wrapper">
              <span class="search-icon"><i data-lucide="search"></i></span>
              <input type="text" class="search-input" placeholder="Search by name or address…" value="${esc(State.prenatal.search)}"
                oninput="State.prenatal.search=this.value;Pages._prenatalList(document.getElementById('main-content'),Auth.getSession(),'${routeKey}',1)">
            </div>
            <select class="filter-select" onchange="State.prenatal.filter=this.value;Pages._prenatalList(document.getElementById('main-content'),Auth.getSession(),'${routeKey}',1)">
              <option value="all"       ${State.prenatal.filter==='all'?'selected':''}>All Status</option>
              <option value="Active"    ${State.prenatal.filter==='Active'?'selected':''}>Active</option>
              <option value="High-Risk" ${State.prenatal.filter==='High-Risk'?'selected':''}>High-Risk</option>
              <option value="Delivered" ${State.prenatal.filter==='Delivered'?'selected':''}>Delivered</option>
            </select>
          </div>
          <div style="overflow-x:auto;">
            <table>
              <thead><tr><th>Patient Name</th><th>Age</th><th>LMP</th><th>EDD</th><th>AOG</th><th>G/P</th><th>Status</th><th>Last Visit</th><th>Actions</th></tr></thead>
              <tbody>
                ${items.length ? items.map(p => {
                  const overdue = isPrenatalOverdue(p);
                  const lastV   = p.visits && p.visits.length ? [...p.visits].sort((a,b)=>new Date(b.date)-new Date(a.date))[0] : null;
                  const statusBadge = overdue
                    ? `<span class="badge badge-overdue">Overdue</span>`
                    : `<span class="badge badge-${p.status==='Active'?'active':p.status==='Delivered'?'delivered':'high-risk'}">${p.status}</span>`;
                  return `<tr class="${overdue?'row-overdue':p.highRisk?'row-highrisk':''}">
                    <td>
                      <div style="font-weight:600;">${esc(p.name)}</div>
                      ${p.highRisk?`<span class="badge badge-high-risk" style="font-size:0.65rem;margin-top:2px;">⚠ High-Risk</span>`:''}
                    </td>
                    <td>${p.age}</td>
                    <td>${fmtDate(p.lmp)}</td>
                    <td>${fmtDate(p.edd)}</td>
                    <td>${p.status!=='Delivered'?calcAOG(p.lmp)+' wks':'—'}</td>
                    <td>G${p.gravida}P${p.para}</td>
                    <td>${statusBadge}</td>
                    <td class="text-muted">${lastV?fmtDate(lastV.date):'None'}</td>
                    <td>
                      <div style="display:flex;gap:4px;">
                        <button class="btn btn-outline btn-sm" onclick="Pages.showPrenatalDetail('${p.id}','${routeKey}')">View</button>
                        <button class="btn btn-outline btn-sm" onclick="Pages.showEditPrenatalModal('${p.id}','${routeKey}')">Edit</button>
                        <button class="btn btn-danger btn-sm" onclick="Pages.archivePrenatal('${p.id}','${routeKey}')">Archive</button>
                      </div>
                    </td>
                  </tr>`;
                }).join('') : `<tr><td colspan="9"><div class="empty-state"><div class="empty-state-icon">🤰</div><p>No prenatal patients found</p></div></td></tr>`}
              </tbody>
            </table>
          </div>
          <div class="table-footer">
            <span class="table-info">Showing ${items.length} of ${total} patients</span>
            ${UI.paginationHtml(pg, totalPages, '_PPg')}
          </div>
        </div>
      </div>`;
    window._PPg = p => Pages._prenatalList(el, session, routeKey, p);
    if (window.lucide) lucide.createIcons();
  },

  showAddPrenatalModal(routeKey) {
    UI.showModal(`
      <div class="modal-header"><h3>Register Prenatal Patient</h3><button class="modal-close" onclick="UI.closeModal()"><i data-lucide="x"></i></button></div>
      <form onsubmit="Pages.addPrenatal(event,'${routeKey}')" novalidate>
        <div class="form-row">
          <div class="form-group"><label>Full Name *</label><input type="text" class="form-control" id="ap-name" required placeholder="Maria Dela Cruz"></div>
          <div class="form-group"><label>Age *</label><input type="number" class="form-control" id="ap-age" required min="12" max="60" placeholder="25"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>LMP (Last Menstrual Period) *</label><input type="date" class="form-control" id="ap-lmp" required max="${todayStr()}" onchange="Pages._autoEDD()"></div>
          <div class="form-group"><label>EDD (auto-calculated)</label><input type="date" class="form-control" id="ap-edd" readonly></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Gravida *</label><input type="number" class="form-control" id="ap-gravida" required min="1" max="20" placeholder="1"></div>
          <div class="form-group"><label>Para *</label><input type="number" class="form-control" id="ap-para" required min="0" max="20" placeholder="0"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Address / Purok *</label><input type="text" class="form-control" id="ap-address" required placeholder="Purok 1, San Jose"></div>
          <div class="form-group"><label>Contact Number</label><input type="text" class="form-control" id="ap-contact" placeholder="09XX XXX XXXX"></div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Register Patient</button>
        </div>
      </form>`);
  },

  _autoEDD() {
    const lmp = document.getElementById('ap-lmp');
    const edd = document.getElementById('ap-edd');
    if (lmp && edd && lmp.value) edd.value = calcEDD(lmp.value);
  },

  async addPrenatal(e, routeKey) {
    e.preventDefault();
    const btn = e.target.querySelector('[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
    const lmp = document.getElementById('ap-lmp').value;
    const data = {
      name:     document.getElementById('ap-name').value.trim(),
      age:      parseInt(document.getElementById('ap-age').value),
      lmp,
      edd:      calcEDD(lmp),
      gravida:  parseInt(document.getElementById('ap-gravida').value),
      para:     parseInt(document.getElementById('ap-para').value),
      address:  document.getElementById('ap-address').value.trim(),
      contact:  document.getElementById('ap-contact').value.trim(),
    };
    
    try {
      await API.post('/prenatal', data);
      UI.closeModal();
      UI.toast(`Patient "${data.name}" registered!`, 'success');
      await Pages._prenatalList(document.getElementById('main-content'), Auth.getSession(), routeKey, 1);
    } catch(err) {
      UI.toast('Error: ' + err.message, 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'Register Patient'; }
    }
  },

  showPrenatalDetail(patientId, routeKey) {
    const p = State.cache.prenatal.find(x => x.id === patientId);
    if (!p) { UI.toast('Patient not found.', 'error'); return; }
    const visits = p.visits && p.visits.length ? [...p.visits].sort((a,b) => new Date(b.date)-new Date(a.date)) : [];
    UI.showModal(`
      <div class="modal-header"><h3>${esc(p.name)}</h3><button class="modal-close" onclick="UI.closeModal()"><i data-lucide="x"></i></button></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;font-size:0.84rem;">
        <div><span class="text-muted">Age:</span> <strong>${p.age}</strong></div>
        <div><span class="text-muted">Status:</span> <span class="badge badge-${p.status==='Active'?'active':p.status==='Delivered'?'delivered':'high-risk'}">${p.status}</span></div>
        <div><span class="text-muted">LMP:</span> <strong>${fmtDate(p.lmp)}</strong></div>
        <div><span class="text-muted">EDD:</span> <strong>${fmtDate(p.edd)}</strong></div>
        <div><span class="text-muted">AOG:</span> <strong>${calcAOG(p.lmp)} weeks</strong></div>
        <div><span class="text-muted">G/P:</span> <strong>G${p.gravida}P${p.para}</strong></div>
        <div><span class="text-muted">Address:</span> <strong>${esc(p.address)}</strong></div>
        <div><span class="text-muted">Contact:</span> <strong>${esc(p.contact||'—')}</strong></div>
      </div>
      ${p.highRisk?`<div class="alert alert-danger">⚠️ <strong>High-Risk:</strong> ${esc(p.highRiskNote)}</div>`:''}
      ${isPrenatalOverdue(p)&&p.status!=='Delivered'?`<div class="alert alert-warning">⏰ This patient is <strong>overdue</strong> for a prenatal check-up.</div>`:''}
      <div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:18px;">
        ${p.status!=='Delivered'?`<button class="btn btn-primary btn-sm" onclick="UI.closeModal();setTimeout(()=>Pages.showLogVisitModal('${p.id}','${routeKey}'),150)"><i data-lucide="plus"></i> Log Visit</button>`:''}
        ${p.status!=='Delivered'?`<button class="btn btn-outline btn-sm" onclick="UI.closeModal();setTimeout(()=>Pages.showDeliveryModal('${p.id}','${routeKey}'),150)">Record Delivery</button>`:''}
        <button class="btn btn-${p.highRisk?'danger':'outline'} btn-sm" onclick="Pages.handleHighRisk('${p.id}','${routeKey}')">${p.highRisk?'✓ High-Risk (Remove)':'Mark High-Risk'}</button>
      </div>
      <h4 style="margin-bottom:10px;font-size:0.88rem;color:var(--text-secondary);">VISIT HISTORY (${visits.length})</h4>
      ${visits.length?`<div style="overflow-x:auto;"><table>
        <thead><tr><th>Date</th><th>AOG</th><th>BP</th><th>Weight</th><th>FH</th><th>FHR</th><th>Remarks</th></tr></thead>
        <tbody>${visits.map(v=>`<tr><td>${fmtDate(v.date)}</td><td>${v.aog} wks</td><td>${v.bp}</td><td>${v.weight} kg</td><td>${v.fundalHeight} cm</td><td>${v.fhr} bpm</td><td class="text-muted">${esc(v.remarks||'—')}</td></tr>`).join('')}</tbody>
      </table></div>`:'<p class="text-muted">No visits recorded yet.</p>'}
      ${p.delivery?`
        <h4 style="margin:16px 0 10px;font-size:0.88rem;color:var(--text-secondary);">DELIVERY RECORD</h4>
        <div class="alert alert-success">✅ Delivered on ${fmtDate(p.delivery.date)} via ${p.delivery.type} — ${p.delivery.outcome} — Birth weight: ${p.delivery.birthWeight||'—'} kg</div>
      `:''}
    `, { size:'lg' });
  },

  showEditPrenatalModal(patientId, routeKey) {
    const p = State.cache.prenatal.find(x => x.id === patientId);
    if (!p) return;
    UI.showModal(`
      <div class="modal-header"><h3>Edit Patient — ${esc(p.name)}</h3><button class="modal-close" onclick="UI.closeModal()"><i data-lucide="x"></i></button></div>
      <form onsubmit="Pages.updatePrenatal(event,'${p.id}','${routeKey}')" novalidate>
        <div class="form-row">
          <div class="form-group"><label>Full Name *</label><input type="text" class="form-control" id="ep-name" value="${esc(p.name)}" required></div>
          <div class="form-group"><label>Age *</label><input type="number" class="form-control" id="ep-age" value="${p.age}" required></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Gravida *</label><input type="number" class="form-control" id="ep-gravida" value="${p.gravida}" required></div>
          <div class="form-group"><label>Para *</label><input type="number" class="form-control" id="ep-para" value="${p.para}" required></div>
        </div>
        <div class="form-group"><label>Address / Purok *</label><input type="text" class="form-control" id="ep-address" value="${esc(p.address)}" required></div>
        <div class="form-group"><label>Contact Number</label><input type="text" class="form-control" id="ep-contact" value="${esc(p.contact||'')}"></div>
        <div class="form-group"><label>Status</label>
          <select class="form-control" id="ep-status">
            <option value="Active"    ${p.status==='Active'?'selected':''}>Active</option>
            <option value="High-Risk" ${p.status==='High-Risk'?'selected':''}>High-Risk</option>
            <option value="Delivered" ${p.status==='Delivered'?'selected':''}>Delivered</option>
          </select>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Changes</button>
        </div>
      </form>`);
  },

  async updatePrenatal(e, patientId, routeKey) {
    e.preventDefault();
    const btn = e.target.querySelector('[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
    
    const data = {
      name:    document.getElementById('ep-name').value.trim(),
      age:     parseInt(document.getElementById('ep-age').value),
      gravida: parseInt(document.getElementById('ep-gravida').value),
      para:    parseInt(document.getElementById('ep-para').value),
      address: document.getElementById('ep-address').value.trim(),
      contact: document.getElementById('ep-contact').value.trim(),
      status:  document.getElementById('ep-status').value,
    };
    
    try {
      await API.put('/prenatal/' + patientId, data);
      UI.closeModal();
      UI.toast('Patient record updated!', 'success');
      await Pages._prenatalList(document.getElementById('main-content'), Auth.getSession(), routeKey, State.prenatal.page);
    } catch(err) {
      UI.toast('Error: ' + err.message, 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'Save Changes'; }
    }
  },

  archivePrenatal(patientId, routeKey) {
    const p = State.cache.prenatal.find(x => x.id === patientId);
    if (!p) return;
    UI.confirm('Archive Patient', `Archive "${p.name}"? This will remove them from the active list.`, async () => {
      try {
        await API.put('/prenatal/' + patientId + '/archive');
        UI.toast(`"${p.name}" archived.`, 'success');
        await Pages._prenatalList(document.getElementById('main-content'), Auth.getSession(), routeKey, State.prenatal.page);
      } catch(err) {
        UI.toast('Error: ' + err.message, 'error');
      }
    });
  },

  showLogVisitModal(patientId, routeKey) {
    const p = State.cache.prenatal.find(x => x.id === patientId);
    if (!p) return;
    UI.showModal(`
      <div class="modal-header"><h3>Log Prenatal Visit — ${esc(p.name)}</h3><button class="modal-close" onclick="UI.closeModal()"><i data-lucide="x"></i></button></div>
      <form onsubmit="Pages.addVisit(event,'${p.id}','${routeKey}')" novalidate>
        <div class="form-row">
          <div class="form-group"><label>Visit Date *</label><input type="date" class="form-control" id="lv-date" value="${todayStr()}" required max="${todayStr()}"></div>
          <div class="form-group"><label>AOG (weeks) *</label><input type="number" class="form-control" id="lv-aog" value="${calcAOG(p.lmp)}" required min="0" max="45"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Blood Pressure *</label><input type="text" class="form-control" id="lv-bp" required placeholder="120/80"></div>
          <div class="form-group"><label>Weight (kg) *</label><input type="number" class="form-control" id="lv-weight" required step="0.1" min="30" max="150" placeholder="55.0"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Fundal Height (cm) *</label><input type="number" class="form-control" id="lv-fh" required min="0" max="50" placeholder="20"></div>
          <div class="form-group"><label>Fetal Heart Rate (bpm) *</label><input type="number" class="form-control" id="lv-fhr" required min="80" max="220" placeholder="140"></div>
        </div>
        <div class="form-group"><label>Remarks / Notes</label><textarea class="form-control" id="lv-remarks" rows="2" placeholder="Any observations…"></textarea></div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Visit</button>
        </div>
      </form>`);
  },

  async addVisit(e, patientId, routeKey) {
    e.preventDefault();
    const btn = e.target.querySelector('[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
    
    const visitData = {
      date:         document.getElementById('lv-date').value,
      aog:          parseInt(document.getElementById('lv-aog').value),
      bp:           document.getElementById('lv-bp').value.trim(),
      weight:       parseFloat(document.getElementById('lv-weight').value),
      fundalHeight: parseInt(document.getElementById('lv-fh').value),
      fhr:          parseInt(document.getElementById('lv-fhr').value),
      remarks:      document.getElementById('lv-remarks').value.trim(),
    };
    
    try {
      await API.post('/prenatal/' + patientId + '/visits', visitData);
      UI.closeModal();
      UI.toast('Visit logged!', 'success');
      await Pages._prenatalList(document.getElementById('main-content'), Auth.getSession(), routeKey, State.prenatal.page);
    } catch(err) {
      UI.toast('Error: ' + err.message, 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'Save Visit'; }
    }
  },

  showDeliveryModal(patientId, routeKey) {
    const p = State.cache.prenatal.find(x => x.id === patientId);
    if (!p) return;
    UI.showModal(`
      <div class="modal-header"><h3>Record Delivery — ${esc(p.name)}</h3><button class="modal-close" onclick="UI.closeModal()"><i data-lucide="x"></i></button></div>
      <form onsubmit="Pages.recordDelivery(event,'${p.id}','${routeKey}')" novalidate>
        <div class="form-row">
          <div class="form-group"><label>Delivery Date *</label><input type="date" class="form-control" id="dl-date" value="${todayStr()}" required></div>
          <div class="form-group"><label>Delivery Type *</label>
            <select class="form-control" id="dl-type" required>
              <option value="">Select…</option>
              <option value="Normal Spontaneous Delivery">Normal Spontaneous Delivery</option>
              <option value="Cesarean Section">Cesarean Section (CS)</option>
              <option value="Forceps Delivery">Forceps Delivery</option>
              <option value="Vacuum Extraction">Vacuum Extraction</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Outcome *</label>
            <select class="form-control" id="dl-outcome" required>
              <option value="">Select…</option>
              <option value="Live Birth">Live Birth</option>
              <option value="Stillbirth">Stillbirth</option>
              <option value="Miscarriage">Miscarriage</option>
            </select>
          </div>
          <div class="form-group"><label>Birth Weight (kg)</label><input type="number" class="form-control" id="dl-bw" step="0.01" min="0.5" max="8" placeholder="3.2"></div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Record Delivery</button>
        </div>
      </form>`);
  },

  async recordDelivery(e, patientId, routeKey) {
    e.preventDefault();
    const btn = e.target.querySelector('[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
    
    const delivery = {
      date:        document.getElementById('dl-date').value,
      type:        document.getElementById('dl-type').value,
      outcome:     document.getElementById('dl-outcome').value,
      birthWeight: parseFloat(document.getElementById('dl-bw').value) || null,
    };
    
    try {
      await API.put('/prenatal/' + patientId, { delivery, status: 'Delivered' });
      UI.closeModal();
      UI.toast('Delivery recorded!', 'success');
      await Pages._prenatalList(document.getElementById('main-content'), Auth.getSession(), routeKey, State.prenatal.page);
    } catch(err) {
      UI.toast('Error: ' + err.message, 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'Record Delivery'; }
    }
  },

  handleHighRisk(patientId, routeKey) {
    const p = State.cache.prenatal.find(x => x.id === patientId);
    if (!p) return;
    if (p.highRisk) {
      UI.confirm('Remove High-Risk Tag', `Remove the high-risk classification from "${p.name}"?`, async () => {
        try {
          await API.put('/prenatal/' + patientId, { highRisk: false, highRiskNote: '', status: p.status === 'High-Risk' ? 'Active' : p.status });
          UI.toast('High-risk tag removed.', 'info');
          await Pages._prenatalList(document.getElementById('main-content'), Auth.getSession(), routeKey, State.prenatal.page);
        } catch (err) {
          UI.toast('Error: ' + err.message, 'error');
        }
      }, 'warning');
    } else {
      UI.showModal(`
        <div class="modal-header"><h3>Mark as High-Risk — ${esc(p.name)}</h3><button class="modal-close" onclick="UI.closeModal()"><i data-lucide="x"></i></button></div>
        <form onsubmit="Pages.saveHighRisk(event,'${p.id}','${routeKey}')" novalidate>
          <div class="form-group"><label>Reason for High-Risk Classification *</label>
            <textarea class="form-control" id="hr-note" rows="3" required placeholder="e.g., Hypertension, gestational diabetes, advanced maternal age…"></textarea>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
            <button type="submit" class="btn btn-danger">Mark High-Risk</button>
          </div>
        </form>`, { size:'sm' });
    }
  },

  async saveHighRisk(e, patientId, routeKey) {
    e.preventDefault();
    const btn = e.target.querySelector('[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
    
    try {
      const hrNote = document.getElementById('hr-note').value.trim();
      await API.put('/prenatal/' + patientId, { highRisk: true, highRiskNote: hrNote, status: 'High-Risk' });
      UI.closeModal();
      UI.toast('Patient marked as high-risk.', 'warning');
      await Pages._prenatalList(document.getElementById('main-content'), Auth.getSession(), routeKey, State.prenatal.page);
    } catch(err) {
      UI.toast('Error: ' + err.message, 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'Mark High-Risk'; }
    }
  },

  // ──────────────────────────────────────────────────────────────
  // CHILD IMMUNIZATION (shared: admin / midwife)
  // ──────────────────────────────────────────────────────────────
  immunizationPage(el, session, routeKey) { this._immList(el, session, routeKey, 1); },

  async _immList(el, session, routeKey, page) {
    State.children.page = page;
    const params = new URLSearchParams({ page, limit: 20 });
    if (State.children.search) params.set('search', State.children.search);

    el.innerHTML = `<div class="page-header"><h1>Child Immunization</h1><p>Track vaccine schedules and immunization completion for all registered children.</p></div><div class="page-content"><div class="section-header mb-16"><div></div><button class="btn btn-primary" onclick="Pages.showRegisterChildModal('${routeKey}')"><i data-lucide="plus"></i> Register Child</button></div><div style="text-align:center;padding:40px;color:var(--text-secondary);"><i data-lucide="loader"></i> Loading…</div></div>`;
    if (window.lucide) lucide.createIcons();

    let items = [], total = 0, pg = page, totalPages = 1;
    try {
      const data = await API.get('/children?' + params);
      items = (data.records || []).map(r => ({ ...r, id: String(r._id) }));
      
      if (State.children.filter === 'overdue') {
        items = items.filter(c => Imm.isOverdue(c));
      }
      
      total = data.total || 0;
      pg = data.page || page;
      totalPages = data.pages || 1;
      State.cache.children = items;
    } catch(err) {
      el.innerHTML = `<div class="page-header"><h1>Child Immunization</h1></div><div class="page-content"><div class="alert alert-danger">⚠️ Failed to load records: ${esc(err.message)}</div></div>`;
      return;
    }

    el.innerHTML = `
      <div class="page-header">
        <h1>Child Immunization</h1>
        <p>Track vaccine schedules and immunization completion for all registered children.</p>
      </div>
      <div class="page-content">
        <div class="section-header mb-16">
          <div></div>
          <button class="btn btn-primary" onclick="Pages.showRegisterChildModal('${routeKey}')"><i data-lucide="plus"></i> Register Child</button>
        </div>
        <div class="table-wrapper">
          <div class="table-toolbar">
            <div class="search-input-wrapper">
              <span class="search-icon"><i data-lucide="search"></i></span>
              <input type="text" class="search-input" placeholder="Search name, mother, or purok…" value="${esc(State.children.search)}"
                oninput="State.children.search=this.value;Pages._immList(document.getElementById('main-content'),Auth.getSession(),'${routeKey}',1)">
            </div>
            <select class="filter-select" onchange="State.children.filter=this.value;Pages._immList(document.getElementById('main-content'),Auth.getSession(),'${routeKey}',1)">
              <option value="all"     ${State.children.filter==='all'?'selected':''}>All Children</option>
              <option value="overdue" ${State.children.filter==='overdue'?'selected':''}>Overdue Only</option>
            </select>
          </div>
          <div style="overflow-x:auto;">
            <table>
              <thead><tr><th>Child Name</th><th>DOB / Age</th><th>Sex</th><th>Mother</th><th>Purok</th><th>Completion</th><th>Alert</th><th>Actions</th></tr></thead>
              <tbody>
                ${items.length ? items.map(c => {
                  const pct = Imm.completion(c);
                  const ov  = Imm.isOverdue(c);
                  const mos = Math.floor(daysDiff(c.dob, new Date()) / 30.44);
                  return `<tr class="${ov?'row-overdue':''}">
                    <td><strong>${esc(c.name)}</strong></td>
                    <td>${fmtDate(c.dob)}<br><span class="text-muted">${mos < 24 ? mos+' mos' : Math.floor(mos/12)+' yrs'}</span></td>
                    <td>${c.sex}</td>
                    <td class="text-muted">${esc(c.motherName)}</td>
                    <td class="text-muted">${esc(c.purok||'—')}</td>
                    <td>
                      <div class="progress-bar-wrapper">
                        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
                        <span class="progress-label">${pct}%</span>
                      </div>
                    </td>
                    <td>${ov?'<span class="badge badge-overdue">Overdue</span>':'<span class="badge badge-active">On Track</span>'}</td>
                    <td>
                      <div style="display:flex;gap:4px;">
                        <button class="btn btn-outline btn-sm" onclick="Pages.showChildDetail('${c.id}','${routeKey}')">View</button>
                        <button class="btn btn-primary btn-sm" onclick="Pages.showLogVaccineModal('${c.id}','${routeKey}')">+ Vaccine</button>
                        <button class="btn btn-danger btn-sm" onclick="Pages.archiveChild('${c.id}','${routeKey}')">Archive</button>
                      </div>
                    </td>
                  </tr>`;
                }).join('') : `<tr><td colspan="8"><div class="empty-state"><div class="empty-state-icon">👶</div><p>No children found</p></div></td></tr>`}
              </tbody>
            </table>
          </div>
          <div class="table-footer">
            <span class="table-info">Showing ${items.length} of ${total} children</span>
            ${UI.paginationHtml(pg, totalPages, '_CPg')}
          </div>
        </div>
      </div>`;
    window._CPg = p => Pages._immList(el, session, routeKey, p);
    if (window.lucide) lucide.createIcons();
  },

  showRegisterChildModal(routeKey) {
    UI.showModal(`
      <div class="modal-header"><h3>Register Child</h3><button class="modal-close" onclick="UI.closeModal()"><i data-lucide="x"></i></button></div>
      <form onsubmit="Pages.registerChild(event,'${routeKey}')" novalidate>
        <div class="form-row">
          <div class="form-group"><label>Child's Full Name *</label><input type="text" class="form-control" id="rc-name" required placeholder="Juan Dela Cruz Jr."></div>
          <div class="form-group"><label>Date of Birth *</label><input type="date" class="form-control" id="rc-dob" required max="${todayStr()}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Sex *</label>
            <select class="form-control" id="rc-sex" required>
              <option value="">Select…</option><option value="Male">Male</option><option value="Female">Female</option>
            </select>
          </div>
          <div class="form-group"><label>Mother's Name *</label><input type="text" class="form-control" id="rc-mother" required placeholder="Maria Dela Cruz"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Address *</label><input type="text" class="form-control" id="rc-address" required placeholder="Purok 1, San Jose"></div>
          <div class="form-group"><label>Purok</label><input type="text" class="form-control" id="rc-purok" placeholder="Purok 1"></div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Register Child</button>
        </div>
      </form>`);
  },

  async registerChild(e, routeKey) {
    e.preventDefault();
    const btn = e.target.querySelector('[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
    const sex = document.getElementById('rc-sex').value;
    if (!sex) { UI.toast('Please select the child\'s sex.', 'error'); if (btn) btn.disabled = false; return; }
    
    const data = {
      name:       document.getElementById('rc-name').value.trim(),
      dob:        document.getElementById('rc-dob').value,
      sex,
      motherName: document.getElementById('rc-mother').value.trim(),
      address:    document.getElementById('rc-address').value.trim(),
      purok:      document.getElementById('rc-purok').value.trim(),
    };
    
    try {
      await API.post('/children', data);
      UI.closeModal();
      UI.toast(`Child "${data.name}" registered!`, 'success');
      await Pages._immList(document.getElementById('main-content'), Auth.getSession(), routeKey, 1);
    } catch(err) {
      UI.toast('Error: ' + err.message, 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'Register Child'; }
    }
  },

  _vaccineScheduleHtml(c) {
    const rows = Imm.scheduleRows(c);
    const pct  = Imm.completion(c);
    const sClass = { given:'vs-given', overdue:'vs-overdue', due:'vs-due', upcoming:'vs-upcoming' };
    const sLabel = { given:'✓ Given', overdue:'✗ Overdue', due:'⚡ Due Soon', upcoming:'— Upcoming' };
    return `
      <div style="margin-bottom:14px;display:flex;align-items:center;gap:12px;">
        <span style="font-weight:600;font-size:0.85rem;">Completion:</span>
        <div class="progress-bar-wrapper" style="flex:1;max-width:260px;">
          <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
          <span class="progress-label">${pct}%</span>
        </div>
        ${pct===100?'<span class="badge badge-active">Fully Immunized ✓</span>':''}
      </div>
      <div style="overflow-x:auto;"><table>
        <thead><tr><th>Vaccine</th><th>Dose</th><th>Schedule</th><th>Due Date</th><th>Date Given</th><th>Status</th></tr></thead>
        <tbody>
          ${rows.map(r=>`<tr class="${r.status==='given'?'row-given':''}">
            <td><strong>${esc(r.vaccineName)}</strong></td>
            <td>Dose ${r.dose}</td>
            <td class="text-muted">${esc(r.doseLabel)}</td>
            <td>${fmtDate(r.dueDate)}</td>
            <td>${r.dateGiven?fmtDate(r.dateGiven):'—'}</td>
            <td class="${sClass[r.status]}">${sLabel[r.status]}</td>
          </tr>`).join('')}
        </tbody>
      </table></div>`;
  },

  showChildDetail(childId, routeKey) {
    const c = State.cache.children.find(x => x.id === childId);
    if (!c) { UI.toast('Child not found.', 'error'); return; }
    UI.showModal(`
      <div class="modal-header"><h3>${esc(c.name)}</h3><button class="modal-close" onclick="UI.closeModal()"><i data-lucide="x"></i></button></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;font-size:0.84rem;">
        <div><span class="text-muted">DOB:</span> <strong>${fmtDate(c.dob)}</strong></div>
        <div><span class="text-muted">Sex:</span> <strong>${c.sex}</strong></div>
        <div><span class="text-muted">Mother:</span> <strong>${esc(c.motherName)}</strong></div>
        <div><span class="text-muted">Purok:</span> <strong>${esc(c.purok||c.address||'—')}</strong></div>
      </div>
      <div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:16px;">
        <button class="btn btn-primary btn-sm" onclick="UI.closeModal();setTimeout(()=>Pages.showLogVaccineModal('${c.id}','${routeKey}'),150)"><i data-lucide="plus"></i> Log Vaccine</button>
        <button class="btn btn-outline btn-sm" onclick="UI.closeModal();setTimeout(()=>Pages.showEditChildModal('${c.id}','${routeKey}'),150)">Edit Info</button>
      </div>
      <h4 style="margin-bottom:10px;font-size:0.88rem;color:var(--text-secondary);">VACCINE SCHEDULE</h4>
      ${Pages._vaccineScheduleHtml(c)}
    `, { size:'lg' });
  },

  showEditChildModal(childId, routeKey) {
    const c = State.cache.children.find(x => x.id === childId);
    if (!c) return;
    UI.showModal(`
      <div class="modal-header"><h3>Edit Child — ${esc(c.name)}</h3><button class="modal-close" onclick="UI.closeModal()"><i data-lucide="x"></i></button></div>
      <form onsubmit="Pages.updateChild(event,'${c.id}','${routeKey}')" novalidate>
        <div class="form-row">
          <div class="form-group"><label>Child's Full Name *</label><input type="text" class="form-control" id="ec-name" value="${esc(c.name)}" required></div>
          <div class="form-group"><label>Mother's Name *</label><input type="text" class="form-control" id="ec-mother" value="${esc(c.motherName)}" required></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Address *</label><input type="text" class="form-control" id="ec-address" value="${esc(c.address)}" required></div>
          <div class="form-group"><label>Purok</label><input type="text" class="form-control" id="ec-purok" value="${esc(c.purok||'')}"></div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Changes</button>
        </div>
      </form>`);
  },

  async updateChild(e, childId, routeKey) {
    e.preventDefault();
    const btn = e.target.querySelector('[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
    
    const data = {
      name:       document.getElementById('ec-name').value.trim(),
      motherName: document.getElementById('ec-mother').value.trim(),
      address:    document.getElementById('ec-address').value.trim(),
      purok:      document.getElementById('ec-purok').value.trim(),
    };
    
    try {
      await API.put('/children/' + childId, data);
      UI.closeModal();
      UI.toast('Child record updated!', 'success');
      await Pages._immList(document.getElementById('main-content'), Auth.getSession(), routeKey, State.children.page);
    } catch(err) {
      UI.toast('Error: ' + err.message, 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'Save Changes'; }
    }
  },

  showLogVaccineModal(childId, routeKey) {
    const c = State.cache.children.find(x => x.id === childId);
    if (!c) return;
    const opts = Imm.nextDoseOptions(c);
    if (!opts.length) { UI.toast('All vaccines are already recorded for this child!', 'info'); return; }
    UI.showModal(`
      <div class="modal-header"><h3>Log Vaccine — ${esc(c.name)}</h3><button class="modal-close" onclick="UI.closeModal()"><i data-lucide="x"></i></button></div>
      <form onsubmit="Pages.addVaccine(event,'${c.id}','${routeKey}')" novalidate>
        <div class="form-group"><label>Vaccine / Dose *</label>
          <select class="form-control" id="lv2-vaccine" required>
            <option value="">Select vaccine…</option>
            ${opts.map(o=>`<option value="${o.vaccineId}|${o.dose}">${esc(o.label)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Date Administered *</label><input type="date" class="form-control" id="lv2-date" value="${todayStr()}" required max="${todayStr()}"></div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Log Vaccine</button>
        </div>
      </form>`, { size:'sm' });
  },

  async addVaccine(e, childId, routeKey) {
    e.preventDefault();
    const btn = e.target.querySelector('[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
    
    const val = document.getElementById('lv2-vaccine').value;
    if (!val) { UI.toast('Please select a vaccine.', 'error'); if(btn) btn.disabled = false; return; }
    const [vaccineId, dose] = val.split('|');
    const dateGiven = document.getElementById('lv2-date').value;
    
    const c = State.cache.children.find(x => x.id === childId);
    if (!c) { UI.toast('Child not found.', 'error'); return; }
    
    const newVaccines = [...(c.vaccines || []), { vaccineId, dose: parseInt(dose), dateGiven }];
    
    try {
      await API.put('/children/' + childId + '/vaccines', { vaccines: newVaccines });
      UI.closeModal();
      UI.toast('Vaccine recorded!', 'success');
      await Pages._immList(document.getElementById('main-content'), Auth.getSession(), routeKey, State.children.page);
    } catch (err) {
      UI.toast('Error: ' + err.message, 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'Log Vaccine'; }
    }
  },

  archiveChild(childId, routeKey) {
    const c = State.cache.children.find(x => x.id === childId);
    if (!c) return;
    UI.confirm('Archive Child Record', `Archive "${c.name}"'s immunization record? They can be restored if needed.`, async () => {
      try {
        await API.put('/children/' + childId, { archived: true });
        UI.toast(`"${c.name}" archived.`, 'success');
        await Pages._immList(document.getElementById('main-content'), Auth.getSession(), routeKey, State.children.page);
      } catch (err) {
        UI.toast('Error: ' + err.message, 'error');
      }
    });
  },

  // ──────────────────────────────────────────────────────────────
  // REPORTS (shared: admin / midwife)
  // ──────────────────────────────────────────────────────────────
  reportsPage(el, session, routeKey) { this._reportsPage(el, session, routeKey, State.reports.tab); },

  async _reportsPage(el, session, routeKey, tab) {
    State.reports.tab = tab;
    el.innerHTML = '<div class="page-content"><div style="text-align:center;padding:40px;"><i data-lucide="loader"></i> Loading Reports…</div></div>';
    if (window.lucide) lucide.createIcons();

    let reports = [], scanned = [];
    try {
      if (tab === 'history') {
        const data = await API.get('/reports?type=generated');
        reports = (data.reports || []).map(r => ({ ...r, id: String(r._id) }));
      } else if (tab === 'scanned') {
        const data = await API.get('/reports?type=scanned');
        scanned = (data.reports || []).map(r => ({ ...r, id: String(r._id) }));
      }
      State.cache.reports = reports;
      State.cache.scanned = scanned;
    } catch(err) {
      el.innerHTML = `<div class="page-content"><div class="alert alert-danger">Error: ${esc(err.message)}</div></div>`;
      return;
    }

    const now = new Date();
    const curMonth = String(now.getMonth()+1).padStart(2,'0');
    const curYear  = String(now.getFullYear());

    el.innerHTML = `
      <div class="page-header">
        <h1>Reports</h1>
        <p>Auto-generate, preview, and export FHSIS monthly health reports.</p>
      </div>
      <div class="page-content">
        <div class="tabs">
          <button class="tab-btn ${tab==='generate'?'active':''}" onclick="Pages._reportsPage(document.getElementById('main-content'),null,'${routeKey}','generate')">Generate Report</button>
          <button class="tab-btn ${tab==='history'?'active':''}"  onclick="Pages._reportsPage(document.getElementById('main-content'),null,'${routeKey}','history')">Report History</button>
          <button class="tab-btn ${tab==='scanned'?'active':''}"  onclick="Pages._reportsPage(document.getElementById('main-content'),null,'${routeKey}','scanned')">📷 Scanned Reports</button>
        </div>
        ${tab==='generate' ? `
          <div style="display:flex;gap:20px;flex-wrap:wrap;align-items:flex-start;">
            <div class="card" style="min-width:300px;max-width:440px;flex:1;">
              <h3 style="margin-bottom:18px;font-size:0.95rem;">Report Parameters</h3>
              <div class="form-row">
                <div class="form-group">
                  <label>Month</label>
                  <select class="form-control" id="rpt-month">
                    ${['January','February','March','April','May','June','July','August','September','October','November','December'].map((m,i)=>`<option value="${String(i+1).padStart(2,'0')}" ${String(i+1).padStart(2,'0')===curMonth?'selected':''}>${m}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label>Year</label>
                  <select class="form-control" id="rpt-year">
                    ${[parseInt(curYear)-1, parseInt(curYear)].map(y=>`<option value="${y}" ${String(y)===curYear?'selected':''}>${y}</option>`).join('')}
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label>Report Type</label>
                <select class="form-control" id="rpt-type">
                  <option value="prenatal">Prenatal Care Report</option>
                  <option value="immunization">Child Immunization Report</option>
                </select>
              </div>
              <div style="margin-top:4px;">
                <button class="btn btn-primary" onclick="Pages.generateReport('${routeKey}', this)"><i data-lucide="file-bar-chart"></i> Generate & Preview</button>
              </div>
            </div>
            <div id="rpt-preview-area" style="flex:1;min-width:300px;"></div>
          </div>
        ` : tab==='scanned' ? `
          <div class="section-header mb-16">
            <div></div>
            <button class="btn btn-primary" onclick="Pages.showUploadScannedModal('${routeKey}')"><i data-lucide="upload"></i> Upload Scanned Report</button>
          </div>
          ${scanned.length ? `<div class="table-wrapper"><div style="overflow-x:auto;"><table>
            <thead><tr><th>Title / Description</th><th>Type</th><th>Uploaded By</th><th>Date Uploaded</th><th>Actions</th></tr></thead>
            <tbody>
              ${scanned.map(r=>`<tr>
                <td><strong>${esc(r.title)}</strong></td>
                <td><span class="badge badge-info">${esc(r.docType||'Report')}</span></td>
                <td>${esc(r.uploadedBy || r.generatedBy || 'system')}</td>
                <td class="text-muted">${fmtDT(r.createdAt)}</td>
                <td><div style="display:flex;gap:6px;">
                  <button class="btn btn-outline btn-sm" onclick="Pages.viewScannedReport('${r.id}')">View</button>
                  <button class="btn btn-danger btn-sm" onclick="Pages.deleteScannedReport('${r.id}','${routeKey}')">Delete</button>
                </div></td>
              </tr>`).join('')}
            </tbody>
          </table></div></div>` : '<div class="empty-state"><div class="empty-state-icon">📷</div><p>No scanned reports uploaded yet. Upload handwritten or printed reports here.</p></div>'}
        ` : `
          ${reports.length ? `<div class="table-wrapper"><div style="overflow-x:auto;"><table>
            <thead><tr><th>Report Type</th><th>Period</th><th>Generated By</th><th>Date Generated</th><th>Actions</th></tr></thead>
            <tbody>
              ${reports.map(r=>`<tr>
                <td><span class="badge badge-${r.program?.toLowerCase()==='prenatal'?'prenatal':'immunization'}">${r.program}</span></td>
                <td><strong>${esc(r.title)}</strong></td>
                <td>${esc(r.generatedBy)}</td>
                <td class="text-muted">${fmtDT(r.createdAt)}</td>
                <td><div style="display:flex;gap:6px;">
                  <button class="btn btn-outline btn-sm" onclick="Pages.previewReport('${r.id}')">Preview</button>
                  <button class="btn btn-outline btn-sm" onclick="Pages.exportRptPDF('${r.id}')">PDF</button>
                  <button class="btn btn-outline btn-sm" onclick="Pages.exportRptExcel('${r.id}')">Excel</button>
                </div></td>
              </tr>`).join('')}
            </tbody>
          </table></div></div>` : '<div class="empty-state"><div class="empty-state-icon">📄</div><p>No reports generated yet.</p></div>'}
        `}
      </div>`;
    if (window.lucide) lucide.createIcons();
  },

  async generateReport(routeKey, btn) {
    if (btn) { btn.disabled = true; btn.innerHTML = '<i data-lucide="loader"></i> Generating...'; }
    const month   = document.getElementById('rpt-month').value;
    const year    = document.getElementById('rpt-year').value;
    const type    = document.getElementById('rpt-type').value;
    const settings= State.cache.settings || {}; // Should be fetched from API in real implementation, placeholder for now
    const period  = `${monthName(parseInt(month))} ${year}`;
    const prefix  = `${year}-${month}`;

    let tableHtml = '';
    try {
      if (type === 'prenatal') {
        const data = await API.get('/prenatal?limit=1000&archived=false');
        const patients = data.records || [];
        const subset   = patients.filter(p => {
          const hasVisit = (p.visits || []).some(v => v.date.startsWith(prefix));
          const created  = String(p.createdAt || '').startsWith(prefix);
          return hasVisit || created;
        });
        tableHtml = `
          <h2 style="text-align:center;font-size:1rem;">${settings.healthCenterName||'Health Center'}</h2>
          <h3 style="text-align:center;font-size:0.9rem;">Prenatal Care Monthly Report — ${period}</h3>
          <p style="text-align:center;font-size:0.78rem;margin-bottom:10px;">${settings.barangayName||''}, ${settings.municipality||''} · Contact: ${settings.contact||''}</p>
          <table>
            <thead><tr><th>#</th><th>Patient Name</th><th>Age</th><th>AOG (wks)</th><th>Status</th><th>Visits This Month</th><th>High-Risk</th></tr></thead>
            <tbody>
              ${subset.map((p,i)=>`<tr>
                <td>${i+1}</td><td>${p.name}</td><td>${p.age}</td><td>${calcAOG(p.lmp)}</td><td>${p.status}</td>
                <td>${(p.visits||[]).filter(v=>v.date.startsWith(prefix)).length}</td><td>${p.highRisk?'Yes':'No'}</td>
              </tr>`).join('')}
              <tr><td colspan="5"><strong>TOTAL PATIENTS</strong></td><td colspan="2"><strong>${subset.length}</strong></td></tr>
            </tbody>
          </table>
          <p style="font-size:0.7rem;margin-top:8px;">Generated: ${new Date().toLocaleString('en-PH')}</p>`;
      } else {
        const data = await API.get('/children?limit=1000&archived=false');
        const children = data.records || [];
        const subset   = children.filter(c => (c.vaccines || []).some(v => v.dateGiven.startsWith(prefix)));
        tableHtml = `
          <h2 style="text-align:center;font-size:1rem;">${settings.healthCenterName||'Health Center'}</h2>
          <h3 style="text-align:center;font-size:0.9rem;">Child Immunization Monthly Report — ${period}</h3>
          <p style="text-align:center;font-size:0.78rem;margin-bottom:10px;">${settings.barangayName||''}, ${settings.municipality||''} · Contact: ${settings.contact||''}</p>
          <table>
            <thead><tr><th>#</th><th>Child Name</th><th>DOB</th><th>Mother</th><th>Vaccines Given This Month</th><th>Completion %</th></tr></thead>
            <tbody>
              ${subset.map((c,i)=>{
                const vaccines = c.vaccines.filter(v=>v.dateGiven.startsWith(prefix)).map(v=>{
                  const s = VACCINE_SCHEDULE.find(x=>x.id===v.vaccineId);
                  return `${s?.name||v.vaccineId} D${v.dose}`;
                }).join(', ');
                return `<tr><td>${i+1}</td><td>${c.name}</td><td>${fmtDate(c.dob)}</td><td>${c.motherName}</td><td>${vaccines}</td><td>${Imm.completion(c)}%</td></tr>`;
              }).join('')}
              <tr><td colspan="4"><strong>TOTAL CHILDREN</strong></td><td colspan="2"><strong>${subset.length}</strong></td></tr>
            </tbody>
          </table>
          <p style="font-size:0.7rem;margin-top:8px;">Generated: ${new Date().toLocaleString('en-PH')}</p>`;
      }

      const postData = {
        type: 'generated',
        title: period,
        program: type === 'prenatal' ? 'Prenatal' : 'Immunization',
        month: parseInt(month),
        year: parseInt(year),
        dataSnapshot: { tableHtml }
      };

      const res = await API.post('/reports', postData);
      const saved = res.report;
      saved.id = String(saved._id);
      if (!State.cache.reports) State.cache.reports = [];
      State.cache.reports.unshift(saved);

      const area = document.getElementById('rpt-preview-area');
      if (area) {
        area.innerHTML = `
          <div class="card">
            <div class="section-header">
              <span class="section-title">Preview — ${esc(period)}</span>
              <div style="display:flex;gap:6px;">
                <button class="btn btn-outline btn-sm" onclick="Pages.exportRptPDF('${saved.id}')"><i data-lucide="file-text"></i> PDF</button>
                <button class="btn btn-outline btn-sm" onclick="Pages.exportRptExcel('${saved.id}')"><i data-lucide="table-2"></i> Excel</button>
              </div>
            </div>
            <div class="report-preview">${tableHtml}</div>
          </div>`;
        if (window.lucide) lucide.createIcons();
      }
      UI.toast('Report generated!', 'success');
    } catch(err) {
      UI.toast('Error generating report: ' + err.message, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i data-lucide="file-bar-chart"></i> Generate & Preview'; }
    }
  },

  previewReport(reportId) {
    const r = State.cache.reports.find(x => x.id === reportId);
    if (!r) return;
    const tableHtml = r.dataSnapshot?.tableHtml || '<p>Report data not available.</p>';
    UI.showModal(`
      <div class="modal-header"><h3>${r.program} Report — ${esc(r.title)}</h3><button class="modal-close" onclick="UI.closeModal()"><i data-lucide="x"></i></button></div>
      <div class="report-preview">${tableHtml}</div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="Pages.exportRptPDF('${r.id}')">Export PDF</button>
        <button class="btn btn-primary" onclick="Pages.exportRptExcel('${r.id}')">Export Excel</button>
      </div>`, { size:'lg' });
  },

  _parseReportTable(html) {
    const d   = new DOMParser().parseFromString(html, 'text/html');
    const hdr = [...d.querySelectorAll('thead th')].map(t => t.textContent.trim());
    const bdy = [...d.querySelectorAll('tbody tr')].map(tr => [...tr.querySelectorAll('td')].map(td => td.textContent.trim()));
    return { hdr, bdy };
  },

  exportRptPDF(reportId) {
    const r = State.cache.reports.find(x => x.id === reportId);
    if (!r) return;
    if (!window.jspdf) { UI.toast('PDF library not loaded.', 'error'); return; }
    const settings = State.cache.settings || {};
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const tableHtml = r.dataSnapshot?.tableHtml || '';
    const { hdr, bdy } = Pages._parseReportTable(tableHtml);
    doc.setFontSize(11); doc.text(settings.healthCenterName||'Health Center', 14, 14);
    doc.setFontSize(9);
    doc.text(`${r.program} Report — ${r.title}`, 14, 21);
    doc.text(`${settings.barangayName||''}, ${settings.municipality||''}`, 14, 28);
    doc.autoTable({
      startY:33, styles:{fontSize:8.5},
      headStyles:{fillColor:[13,115,119]},
      head:[hdr], body:bdy,
    });
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(`Page ${i} of ${pageCount} | Generated: ${new Date().toLocaleDateString('en-PH')}`, 14, doc.internal.pageSize.getHeight()-8);
    }
    doc.save(`bhis-${r.program.toLowerCase()}-${r.title.replace(/ /g,'-')}.pdf`);
    UI.toast('Report exported to PDF!', 'success');
  },

  exportRptExcel(reportId) {
    const r = State.cache.reports.find(x => x.id === reportId);
    if (!r) return;
    if (!window.XLSX) { UI.toast('Excel library not loaded.', 'error'); return; }
    const settings = State.cache.settings || {};
    const tableHtml = r.dataSnapshot?.tableHtml || '';
    const { hdr, bdy } = Pages._parseReportTable(tableHtml);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      [`${settings.healthCenterName||'Health Center'} — ${r.program} Report`],
      [`Period: ${r.title}`],
      [`Barangay: ${settings.barangayName||''}, ${settings.municipality||''}`],
      [`Contact: ${settings.contact||''}`],
      [],
      hdr,
      ...bdy,
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `bhis-${r.program.toLowerCase()}-${r.title.replace(/ /g,'-')}.xlsx`);
    UI.toast('Report exported to Excel!', 'success');
  },

  // ──────────────────────────────────────────────────────────────
  // PROFILE PAGE (all roles)
  // ──────────────────────────────────────────────────────────────
  profilePage(el, session) {
    const s = Auth.getSession() || session;
    el.innerHTML = `
      <div class="page-header">
        <h1>My Profile</h1>
        <p>View your account information and manage your credentials.</p>
      </div>
      <div class="page-content">
        <div class="card profile-card">
          <div class="profile-avatar-lg">${(s.name||'U').charAt(0)}</div>
          <h2 style="margin-bottom:6px;">${esc(s.name)}</h2>
          <span class="badge badge-${s.role.toLowerCase()}" style="margin-bottom:18px;">${s.role}</span>
          <div style="display:grid;gap:10px;font-size:0.85rem;margin-bottom:4px;">
            <div><span class="text-muted">Username:</span> <strong><code>${esc(s.username)}</code></strong></div>
            <div><span class="text-muted">Session started:</span> <strong>${fmtDT(s.loginTime)}</strong></div>
          </div>

          <div class="divider"></div>
          <h3 style="margin-bottom:16px;font-size:0.95rem;">Change Username</h3>
          <form onsubmit="Pages.changeUsername(event)" novalidate style="max-width:380px;">
            <div class="form-group"><label>New Username *</label><input type="text" class="form-control" id="un-new" required autocomplete="username" placeholder="Enter new username"></div>
            <div class="form-group"><label>Current Password (to confirm) *</label><input type="password" class="form-control" id="un-pw" required placeholder="Enter your current password"></div>
            <button type="submit" class="btn btn-outline"><i data-lucide="at-sign"></i> Update Username</button>
          </form>

          <div class="divider"></div>
          <h3 style="margin-bottom:16px;font-size:0.95rem;">Change Password</h3>
          <form onsubmit="Pages.changePw(event)" novalidate style="max-width:380px;">
            <div class="form-group"><label>Current Password *</label><input type="password" class="form-control" id="pw-old" required placeholder="Enter current password"></div>
            <div class="form-group"><label>New Password *</label><input type="password" class="form-control" id="pw-new" required minlength="6" placeholder="Min. 6 characters"></div>
            <div class="form-group"><label>Confirm New Password *</label><input type="password" class="form-control" id="pw-conf" required placeholder="Repeat new password"></div>
            <button type="submit" class="btn btn-primary"><i data-lucide="lock"></i> Update Password</button>
          </form>
        </div>
      </div>`;
    if (window.lucide) lucide.createIcons();
  },

  async changeUsername(e) {
    e.preventDefault();
    const newUname = document.getElementById('un-new').value.trim().toLowerCase();
    const pw       = document.getElementById('un-pw').value;
    if (!newUname) { UI.toast('Please enter a new username.', 'error'); return; }
    try {
      await API.put(`/auth/change-username`, { newUsername: newUname, password: pw });
      // Update session locally
      const sess = Auth.getSession();
      if (sess) { sess.username = newUname; Store.set(STORAGE.SESSION, sess); }
      UI.toast('Username updated! Please remember your new username.', 'success');
      document.getElementById('un-new').value = '';
      document.getElementById('un-pw').value = '';
      UI.renderSidebar(Auth.getSession());
    } catch (err) {
      UI.toast(err.message, 'error');
    }
  },

  async changePw(e) {
    e.preventDefault();
    const old  = document.getElementById('pw-old').value;
    const nw   = document.getElementById('pw-new').value;
    const conf = document.getElementById('pw-conf').value;
    if (nw !== conf) { UI.toast('Passwords do not match!', 'error'); return; }
    if (nw.length < 6) { UI.toast('Password must be at least 6 characters.', 'error'); return; }
    try {
      await API.put(`/auth/change-password`, { currentPassword: old, newPassword: nw });
      UI.toast('Password updated successfully!', 'success');
      document.getElementById('pw-old').value = '';
      document.getElementById('pw-new').value = '';
      document.getElementById('pw-conf').value = '';
    } catch (err) {
      UI.toast(err.message, 'error');
    }
  },

  // ──────────────────────────────────────────────────────────────
  // BHW DASHBOARD
  // ──────────────────────────────────────────────────────────────
  async bhwDashboard(el, session) {
    el.innerHTML = '<div class="page-content"><div style="text-align:center;padding:40px;"><i data-lucide="loader"></i> Loading Dashboard…</div></div>';
    if (window.lucide) lucide.createIcons();
    
    let children = [];
    try {
      const data = await API.get('/children?limit=1000');
      children = (data.records || []).map(r => ({ ...r, id: String(r._id) }));
      State.cache.children = children;
    } catch (err) {
      el.innerHTML = `<div class="page-content"><div class="alert alert-danger">Error loading dashboard: ${esc(err.message)}</div></div>`;
      return;
    }
    
    const overdueC = children.filter(c => Imm.isOverdue(c));
    const dueC     = children.filter(c => Imm.scheduleRows(c).some(r => r.status==='due'));

    el.innerHTML = `
      <div class="page-header">
        <h1>BHW Dashboard</h1>
        <p>Welcome, ${esc(session.name)}. Here's the community immunization summary.</p>
      </div>
      <div class="page-content">
        <div class="stats-grid">
          <div class="stat-card teal">
            <div class="stat-icon teal"><i data-lucide="users"></i></div>
            <div class="stat-info"><div class="stat-value">${children.length}</div><div class="stat-label">Total Children Registered</div></div>
          </div>
          <div class="stat-card danger">
            <div class="stat-icon danger"><i data-lucide="bell-ring"></i></div>
            <div class="stat-info"><div class="stat-value">${overdueC.length}</div><div class="stat-label">Overdue Vaccines</div></div>
          </div>
          <div class="stat-card warning">
            <div class="stat-icon warning"><i data-lucide="clock"></i></div>
            <div class="stat-info"><div class="stat-value">${dueC.length}</div><div class="stat-label">Due Within 14 Days</div></div>
          </div>
        </div>

        ${overdueC.length ? `
          <div class="alert alert-danger">⚠️ <strong>${overdueC.length} child${overdueC.length>1?'ren':''}</strong> have overdue vaccines. Please notify their parents/guardians to visit the health center.</div>
        ` : ''}

        <div class="card">
          <div class="section-header">
            <span class="section-title">⚠️ Children with Overdue Vaccines</span>
            <button class="btn btn-outline btn-sm" onclick="Router.navigate('bhw-children')">Search All Children</button>
          </div>
          ${overdueC.length ? `<div style="overflow-x:auto;"><table>
            <thead><tr><th>Child Name</th><th>DOB</th><th>Mother</th><th>Purok</th><th>Completion</th><th>Action</th></tr></thead>
            <tbody>
              ${overdueC.slice(0,10).map(c=>{
                const pct = Imm.completion(c);
                return `<tr class="row-overdue">
                  <td><strong>${esc(c.name)}</strong></td>
                  <td>${fmtDate(c.dob)}</td>
                  <td>${esc(c.motherName)}</td>
                  <td>${esc(c.purok||'—')}</td>
                  <td><div class="progress-bar-wrapper"><div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div><span class="progress-label">${pct}%</span></div></td>
                  <td><button class="btn btn-outline btn-sm" onclick="Pages.bhwViewSchedule('${c.id}')">View Schedule</button></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table></div>` : '<div class="empty-state"><p>No overdue vaccines! 🎉 Great community coverage.</p></div>'}
        </div>
      </div>`;
    if (window.lucide) lucide.createIcons();
  },

  // ──────────────────────────────────────────────────────────────
  // BHW: SEARCH CHILDREN (read-only)
  // ──────────────────────────────────────────────────────────────
  bhwChildren(el, session) { this._bhwChildrenList(el, session, 1); },

  async _bhwChildrenList(el, session, page) {
    const params = new URLSearchParams({ page, limit: 20 });
    if (State.children.search) params.set('search', State.children.search);

    el.innerHTML = '<div class="page-content"><div style="text-align:center;padding:40px;"><i data-lucide="loader"></i> Loading Children…</div></div>';
    if (window.lucide) lucide.createIcons();

    let items = [], total = 0, pg = page, totalPages = 1;
    try {
      const data = await API.get('/children?' + params);
      items = (data.records || []).map(r => ({ ...r, id: String(r._id) }));
      total = data.total || 0;
      pg = data.page || page;
      totalPages = data.pages || 1;
      State.cache.children = items;
    } catch (err) {
      el.innerHTML = `<div class="page-content"><div class="alert alert-danger">Error: ${esc(err.message)}</div></div>`;
      return;
    }

    el.innerHTML = `
      <div class="page-header">
        <h1>Search Children</h1>
        <p>View immunization records for children in the barangay. <em>Read-only access.</em></p>
      </div>
      <div class="page-content">
        <div class="alert alert-info">ℹ️ You have <strong>read-only</strong> access. To update records or log vaccines, please contact the Midwife at the health center.</div>
        <div class="table-wrapper">
          <div class="table-toolbar">
            <div class="search-input-wrapper">
              <span class="search-icon"><i data-lucide="search"></i></span>
              <input type="text" class="search-input" placeholder="Search by child name, mother's name, or purok…" value="${esc(State.children.search||'')}"
                oninput="State.children.search=this.value;Pages._bhwChildrenList(document.getElementById('main-content'),null,1)">
            </div>
          </div>
          <div style="overflow-x:auto;">
            <table>
              <thead><tr><th>Child Name</th><th>DOB</th><th>Sex</th><th>Mother</th><th>Purok</th><th>Completion</th><th>Alert</th><th>Action</th></tr></thead>
              <tbody>
                ${items.length ? items.map(c=>{
                  const pct = Imm.completion(c);
                  const ov  = Imm.isOverdue(c);
                  return `<tr class="${ov?'row-overdue':''}">
                    <td><strong>${esc(c.name)}</strong></td>
                    <td>${fmtDate(c.dob)}</td>
                    <td>${c.sex}</td>
                    <td>${esc(c.motherName)}</td>
                    <td>${esc(c.purok||'—')}</td>
                    <td><div class="progress-bar-wrapper"><div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div><span class="progress-label">${pct}%</span></div></td>
                    <td>${ov?'<span class="badge badge-overdue">Overdue</span>':'<span class="badge badge-active">On Track</span>'}</td>
                    <td><button class="btn btn-outline btn-sm" onclick="Pages.bhwViewSchedule('${c.id}')">View Schedule</button></td>
                  </tr>`;
                }).join('') : `<tr><td colspan="8"><div class="empty-state"><div class="empty-state-icon">🔍</div><p>No children found. Try a different search.</p></div></td></tr>`}
              </tbody>
            </table>
          </div>
          <div class="table-footer">
            <span class="table-info">Showing ${items.length} of ${total} children</span>
            ${UI.paginationHtml(pg, totalPages, '_BPg')}
          </div>
        </div>
      </div>`;
    window._BPg = p => Pages._bhwChildrenList(el, session, p);
    if (window.lucide) lucide.createIcons();
  },

  bhwViewSchedule(childId) {
    const c = State.cache.children.find(x => x.id === childId);
    if (!c) return;
    UI.showModal(`
      <div class="modal-header"><h3>Vaccine Schedule — ${esc(c.name)}</h3><button class="modal-close" onclick="UI.closeModal()"><i data-lucide="x"></i></button></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;font-size:0.84rem;">
        <div><span class="text-muted">DOB:</span> <strong>${fmtDate(c.dob)}</strong></div>
        <div><span class="text-muted">Sex:</span> <strong>${c.sex}</strong></div>
        <div><span class="text-muted">Mother:</span> <strong>${esc(c.motherName)}</strong></div>
        <div><span class="text-muted">Purok:</span> <strong>${esc(c.purok||c.address||'—')}</strong></div>
      </div>
      ${Imm.isOverdue(c)?`<div class="alert alert-warning">⚠️ This child has overdue vaccines. Please advise the parent to visit the health center.</div>`:''}
      ${Pages._vaccineScheduleHtml(c)}
      <p class="text-muted mt-16" style="font-size:0.78rem;text-align:center;">Read-only view · To record vaccines, contact the Midwife</p>
    `, { size:'lg' });
  },
  // ──────────────────────────────────────────────────────────────
  // BHW: VIEW PRENATAL RECORDS (read-only)
  // ──────────────────────────────────────────────────────────────
  bhwPrenatal(el, session) { this._bhwPrenatalList(el, session, 1); },

  async _bhwPrenatalList(el, session, page) {
    const params = new URLSearchParams({ page, limit: 20 });
    if (State.prenatal.search) params.set('search', State.prenatal.search);

    el.innerHTML = '<div class="page-content"><div style="text-align:center;padding:40px;"><i data-lucide="loader"></i> Loading Prenatal Records…</div></div>';
    if (window.lucide) lucide.createIcons();

    let items = [], total = 0, pg = page, totalPages = 1;
    try {
      const data = await API.get('/prenatal?' + params);
      items = (data.records || []).map(r => ({ ...r, id: String(r._id) })).filter(p => p.status !== 'Delivered');
      total = data.total || 0;
      pg = data.page || page;
      totalPages = data.pages || 1;
      State.cache.prenatal = items;
    } catch(err) {
      el.innerHTML = `<div class="page-content"><div class="alert alert-danger">Error: ${esc(err.message)}</div></div>`;
      return;
    }

    el.innerHTML = `
      <div class="page-header">
        <h1>Prenatal Records</h1>
        <p>View active prenatal patients in the barangay. <em>Read-only access.</em></p>
      </div>
      <div class="page-content">
        <div class="alert alert-info">ℹ️ You have <strong>read-only</strong> access to prenatal records. To register or update patients, please contact the Midwife.</div>
        <div class="table-wrapper">
          <div class="table-toolbar">
            <div class="search-input-wrapper">
              <span class="search-icon"><i data-lucide="search"></i></span>
              <input type="text" class="search-input" placeholder="Search by patient name or address…" value="${esc(State.prenatal.search || '')}"
                oninput="State.prenatal.search=this.value;Pages._bhwPrenatalList(document.getElementById('main-content'),null,1)">
            </div>
          </div>
          <div style="overflow-x:auto;">
            <table>
              <thead><tr><th>Patient Name</th><th>Age</th><th>LMP</th><th>EDD</th><th>AOG</th><th>G/P</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                ${items.length ? items.map(p => {
                  const overdue = isPrenatalOverdue(p);
                  const statusBadge = overdue
                    ? `<span class="badge badge-overdue">Overdue Visit</span>`
                    : `<span class="badge badge-${p.status==='Active'?'active':'high-risk'}">${p.status}</span>`;
                  return `<tr class="${overdue?'row-overdue':p.highRisk?'row-highrisk':''}">
                    <td>
                      <div style="font-weight:600;">${esc(p.name)}</div>
                      ${p.highRisk?`<span class="badge badge-high-risk" style="font-size:0.65rem;margin-top:2px;">⚠ High-Risk</span>`:''}
                    </td>
                    <td>${p.age}</td>
                    <td>${fmtDate(p.lmp)}</td>
                    <td>${fmtDate(p.edd)}</td>
                    <td>${calcAOG(p.lmp)} wks</td>
                    <td>G${p.gravida}P${p.para}</td>
                    <td>${statusBadge}</td>
                    <td><button class="btn btn-outline btn-sm" onclick="Pages.bhwViewPrenatalDetail('${p.id}')">View</button></td>
                  </tr>`;
                }).join('') : `<tr><td colspan="8"><div class="empty-state"><div class="empty-state-icon">🤰</div><p>No active prenatal patients found.</p></div></td></tr>`}
              </tbody>
            </table>
          </div>
          <div class="table-footer">
            <span class="table-info">Showing ${items.length} of ${total} patients</span>
            ${UI.paginationHtml(pg, totalPages, '_BPPg')}
          </div>
        </div>
      </div>`;
    window._BPPg = p => Pages._bhwPrenatalList(el, session, p);
    if (window.lucide) lucide.createIcons();
  },

  bhwViewPrenatalDetail(patientId) {
    const p = State.cache.prenatal.find(x => x.id === patientId);
    if (!p) return;
    const visits = [...p.visits].sort((a,b) => new Date(b.date)-new Date(a.date));
    UI.showModal(`
      <div class="modal-header"><h3>${esc(p.name)}</h3><button class="modal-close" onclick="UI.closeModal()"><i data-lucide="x"></i></button></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;font-size:0.84rem;">
        <div><span class="text-muted">Age:</span> <strong>${p.age}</strong></div>
        <div><span class="text-muted">Status:</span> <span class="badge badge-${p.status==='Active'?'active':'high-risk'}">${p.status}</span></div>
        <div><span class="text-muted">LMP:</span> <strong>${fmtDate(p.lmp)}</strong></div>
        <div><span class="text-muted">EDD:</span> <strong>${fmtDate(p.edd)}</strong></div>
        <div><span class="text-muted">AOG:</span> <strong>${calcAOG(p.lmp)} weeks</strong></div>
        <div><span class="text-muted">G/P:</span> <strong>G${p.gravida}P${p.para}</strong></div>
        <div><span class="text-muted">Address:</span> <strong>${esc(p.address)}</strong></div>
        <div><span class="text-muted">Contact:</span> <strong>${esc(p.contact||'—')}</strong></div>
      </div>
      ${p.highRisk?`<div class="alert alert-danger">⚠️ <strong>High-Risk:</strong> ${esc(p.highRiskNote)}</div>`:''}
      ${isPrenatalOverdue(p)?`<div class="alert alert-warning">⏰ This patient is <strong>overdue</strong> for a prenatal check-up. Please advise her to visit the health center.</div>`:''}
      <h4 style="margin-bottom:10px;font-size:0.88rem;color:var(--text-secondary);">VISIT HISTORY (${visits.length})</h4>
      ${visits.length?`<div style="overflow-x:auto;"><table>
        <thead><tr><th>Date</th><th>AOG</th><th>BP</th><th>Weight</th><th>FH</th><th>FHR</th><th>Remarks</th></tr></thead>
        <tbody>${visits.map(v=>`<tr><td>${fmtDate(v.date)}</td><td>${v.aog} wks</td><td>${v.bp}</td><td>${v.weight} kg</td><td>${v.fundalHeight} cm</td><td>${v.fhr} bpm</td><td class="text-muted">${esc(v.remarks||'—')}</td></tr>`).join('')}</tbody>
      </table></div>`:'<p class="text-muted">No visits recorded yet.</p>'}
      <p class="text-muted mt-16" style="font-size:0.78rem;text-align:center;">Read-only view · To update records, contact the Midwife</p>
    `, { size:'lg' });
  },

  // ──────────────────────────────────────────────────────────────
  // REPORTS: SCANNED / HANDWRITTEN REPORT UPLOAD
  // ──────────────────────────────────────────────────────────────
  showUploadScannedModal(routeKey) {
    UI.showModal(`
      <div class="modal-header"><h3>Upload Scanned / Handwritten Report</h3><button class="modal-close" onclick="UI.closeModal()"><i data-lucide="x"></i></button></div>
      <p class="text-muted mb-16">Upload a photo or scanned image of a printed or handwritten health report.</p>
      <form onsubmit="Pages.saveScannedReport(event,'${routeKey}')" novalidate>
        <div class="form-group"><label>Title / Description *</label><input type="text" class="form-control" id="sr-title" required placeholder="e.g., January 2025 Prenatal Tally Sheet"></div>
        <div class="form-group">
          <label>Document Type</label>
          <select class="form-control" id="sr-type">
            <option value="Prenatal Report">Prenatal Report</option>
            <option value="Immunization Report">Immunization Report</option>
            <option value="FHSIS Form">FHSIS Form</option>
            <option value="Tally Sheet">Tally Sheet</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div class="form-group"><label>Image / PDF File *</label><input type="file" class="form-control" id="sr-file" required accept="image/*,application/pdf"></div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary"><i data-lucide="upload"></i> Upload Report</button>
        </div>
      </form>`);
  },

  saveScannedReport(e, routeKey) {
    e.preventDefault();
    const btn = e.target.querySelector('[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Uploading...'; }
    const title   = document.getElementById('sr-title').value.trim();
    const docType = document.getElementById('sr-type').value;
    const file    = document.getElementById('sr-file').files[0];
    if (!file) { UI.toast('Please select a file to upload.', 'error'); if(btn) btn.disabled=false; return; }
    if (file.size > 10 * 1024 * 1024) { UI.toast('File is too large. Maximum size is 10 MB.', 'error'); if(btn) btn.disabled=false; return; }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const data = {
        type: 'scanned',
        title,
        docType,
        fileType: file.type,
        fileName: file.name,
        dataUrl: ev.target.result,
      };
      try {
        await API.post('/reports', data);
        UI.closeModal();
        UI.toast(`Report "${title}" uploaded!`, 'success');
        await Pages._reportsPage(document.getElementById('main-content'), Auth.getSession(), routeKey, 'scanned');
      } catch (err) {
        UI.toast('Error: ' + err.message, 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'Upload Report'; }
      }
    };
    reader.onerror = () => {
      UI.toast('Failed to read file. Please try again.', 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'Upload Report'; }
    };
    reader.readAsDataURL(file);
  },

  viewScannedReport(reportId) {
    const r = State.cache.scanned.find(x => x.id === reportId);
    if (!r) return;
    const isImg = r.fileType && r.fileType.startsWith('image/');
    UI.showModal(`
      <div class="modal-header"><h3>${esc(r.title)}</h3><button class="modal-close" onclick="UI.closeModal()"><i data-lucide="x"></i></button></div>
      <p class="text-muted" style="font-size:0.8rem;margin-bottom:12px;"><span class="badge badge-info">${esc(r.docType)}</span> &nbsp;Uploaded by <strong>${esc(r.generatedBy)}</strong> on ${fmtDT(r.createdAt)}</p>
      ${isImg
        ? `<img src="${r.dataUrl}" alt="${esc(r.title)}" style="width:100%;border-radius:6px;border:1px solid var(--border);">`
        : `<div class="alert alert-info">📄 PDF file: <strong>${esc(r.fileName)}</strong><br><a href="${r.dataUrl}" download="${esc(r.fileName)}" class="btn btn-outline btn-sm" style="margin-top:10px;">Download PDF</a></div>`}
    `, { size:'lg' });
  },

  deleteScannedReport(reportId, routeKey) {
    const r = State.cache.scanned.find(x => x.id === reportId);
    if (!r) return;
    UI.confirm('Delete Scanned Report', `Delete "${r.title}"? This cannot be undone.`, async () => {
      try {
        await API.delete('/reports/' + reportId);
        UI.toast(`"${r.title}" deleted.`, 'success');
        await Pages._reportsPage(document.getElementById('main-content'), Auth.getSession(), routeKey, 'scanned');
      } catch (err) {
        UI.toast('Error: ' + err.message, 'error');
      }
    });
  },
};

// ================================================================
// HELPER: safe route key escape (session userId may contain unsafe chars)
// ================================================================
function rk_esc(session) {
  return session && session.id ? String(session.id).replace(/'/g, '') : '';
}

// ================================================================
// SECTION 12: INITIALIZATION
// ================================================================

document.addEventListener('DOMContentLoaded', () => {
  Router.init();
});
