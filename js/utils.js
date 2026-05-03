/**
 * WebPOS Utilities — V3 Locked
 * Theme, Format, Storage, Toast, Loading, Menu Visibility
 */

const Utils = {
  // ─── Theme ───
  Theme: {
    colors: ['indigo','blue','green','orange','purple','red','pink','teal'],
    init() {
      const saved = localStorage.getItem('webpos_theme_color') || 'indigo';
      const dark = localStorage.getItem('webpos_dark_mode') === 'true';
      this.setColor(saved);
      this.setDarkMode(dark);
      window.addEventListener('storage', (e) => {
        if (e.key === 'webpos_dark_mode') this.setDarkMode(e.newValue === 'true', false);
        if (e.key === 'webpos_theme_color') this.setColor(e.newValue, false);
      });
    },
    setColor(color, save = true) {
      if (!this.colors.includes(color)) color = 'indigo';
      document.documentElement.setAttribute('data-theme-color', color);
      if (save) localStorage.setItem('webpos_theme_color', color);
    },
    getColor() { return document.documentElement.getAttribute('data-theme-color') || 'indigo'; },
    toggleDarkMode() { const d = !this.isDarkMode(); this.setDarkMode(d); return d; },
    setDarkMode(isDark, save = true) {
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
      if (save) localStorage.setItem('webpos_dark_mode', isDark);
      const btn = document.getElementById('btnTheme');
      if (btn) btn.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    },
    isDarkMode() { return document.documentElement.getAttribute('data-theme') === 'dark'; },
    templates: {
      indigo: { '--primary':'#6366f1','--primary-dark':'#4f46e5','--secondary':'#ec4899','--bg-primary':'#f8fafc','--bg-secondary':'#f1f5f9','--bg-card':'#ffffff','--text-primary':'#0f172a','--text-secondary':'#475569','--text-muted':'#94a3b8','--border-color':'#e2e8f0' },
      mint:   { '--primary':'#059669','--primary-dark':'#047857','--secondary':'#84cc16','--bg-primary':'#f0fdf4','--bg-secondary':'#ecfdf5','--bg-card':'#ffffff','--text-primary':'#064e3b','--text-secondary':'#065f46','--text-muted':'#10b981','--border-color':'#d1fae5' },
      ocean:  { '--primary':'#0ea5e9','--primary-dark':'#0284c7','--secondary':'#06b6d4','--bg-primary':'#f0f9ff','--bg-secondary':'#e0f2fe','--bg-card':'#ffffff','--text-primary':'#0c4a6e','--text-secondary':'#075985','--text-muted':'#38bdf8','--border-color':'#bae6fd' },
      sunset: { '--primary':'#f97316','--primary-dark':'#ea580c','--secondary':'#c026d3','--bg-primary':'#fff7ed','--bg-secondary':'#ffedd5','--bg-card':'#ffffff','--text-primary':'#7c2d12','--text-secondary':'#9a3412','--text-muted':'#fb923c','--border-color':'#fed7aa' },
      midnight:{ '--primary':'#64748b','--primary-dark':'#475569','--secondary':'#94a3b8','--bg-primary':'#0f172a','--bg-secondary':'#1e293b','--bg-card':'#1e293b','--text-primary':'#f8fafc','--text-secondary':'#cbd5e1','--text-muted':'#64748b','--border-color':'#334155' }
    },
    loadTemplate() {
      const name = localStorage.getItem('webpos_theme_template') || 'indigo';
      const t = this.templates[name] || this.templates.indigo;
      const isDark = this.isDarkMode();
      Object.entries(t).forEach(([k, v]) => {
        if (!k.startsWith('--')) return;
        if (isDark && name !== 'midnight') {
          const keep = ['--bg-primary','--bg-secondary','--bg-card','--text-primary','--text-secondary','--text-muted','--border-color'];
          if (keep.includes(k)) return;
        }
        document.documentElement.style.setProperty(k, v);
      });
      document.documentElement.setAttribute('data-theme-template', name);
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', t['--primary']);
    }
  },

  // ─── Format ───
  formatRupiah(amount) {
    if (amount == null || isNaN(amount)) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', { style:'currency', currency:'IDR', minimumFractionDigits:0, maximumFractionDigits:0 }).format(amount);
  },
  formatNumber(num) {
    if (num == null || isNaN(num)) return '0';
    return new Intl.NumberFormat('id-ID').format(num);
  },
  parseNumber(formatted) {
    if (!formatted) return 0;
    return parseInt(formatted.replace(/[^0-9]/g, '')) || 0;
  },
  formatDate(date, opts = {}) {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric', ...opts });
  },
  formatDateTime(date) {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleString('id-ID', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
  },
  getTodayString() { return new Date().toISOString().split('T')[0]; },
  getNow() { return new Date().toISOString(); },
  generateId(prefix = '') { return prefix + Date.now().toString(36) + Math.random().toString(36).substr(2, 5).toUpperCase(); },
  generateTransactionId() {
    const d = new Date();
    const ds = d.toISOString().slice(0, 10).replace(/-/g, '');
    return 'TRX' + ds + Math.random().toString(36).substr(2, 5).toUpperCase();
  },
  formatUsername(username) {
    if (!username) return '';
    return username.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9_]/g, '');
  },

  // ─── Storage ───
  setStorage(key, value) { localStorage.setItem(key, JSON.stringify(value)); },
  getStorage(key) {
    const item = localStorage.getItem(key);
    if (!item) return null;
    try { return JSON.parse(item); } catch { return item; }
  },
  removeStorage(key) { localStorage.removeItem(key); },

  // ─── Toast ───
  showToast(message, type = 'info', duration = 3000) {
    let c = document.getElementById('toastContainer');
    if (!c) {
      c = document.createElement('div'); c.id = 'toastContainer';
      c.style.cssText = 'position:fixed;top:1rem;right:1rem;z-index:9999;display:flex;flex-direction:column;gap:.5rem;max-width:400px';
      document.body.appendChild(c);
    }
    const icons = { success:'check-circle', error:'times-circle', warning:'exclamation-triangle', info:'info-circle' };
    const toast = document.createElement('div');
    toast.style.cssText = `display:flex;align-items:center;gap:1rem;padding:1rem 1.5rem;background:var(--bg-card);border-radius:.75rem;box-shadow:var(--shadow-lg);border-left:4px solid ${type==='success'?'#10b981':type==='error'?'#ef4444':type==='warning'?'#f59e0b':'#3b82f6'};animation:slideIn .3s ease`;
    toast.innerHTML = `<i class="fas fa-${icons[type]||'info-circle'}"></i><span>${message}</span>`;
    c.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(100%)'; setTimeout(() => toast.remove(), 300); }, duration);
  },

  // ─── Loading ───
  showLoading(msg = 'Loading...') {
    let el = document.getElementById('loadingOverlay');
    if (!el) {
      el = document.createElement('div'); el.id = 'loadingOverlay';
      el.className = 'loading-overlay';
      el.innerHTML = '<div class="spinner"></div><p style="margin-top:1rem;color:var(--text-secondary)">Loading...</p>';
      document.body.appendChild(el);
    }
    el.querySelector('p').textContent = msg;
    el.classList.add('active');
  },
  hideLoading() {
    const el = document.getElementById('loadingOverlay');
    if (el) el.classList.remove('active');
  },

  // ─── Confirm Dialog ───
  confirm(message, onConfirm, onCancel = null) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:9999;padding:1rem';
    modal.innerHTML = `
      <div style="background:var(--bg-card);border-radius:1.5rem;width:100%;max-width:400px;box-shadow:var(--shadow-lg)">
        <div style="padding:2rem;text-align:center">
          <div style="width:64px;height:64px;background:rgba(239,68,68,.1);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem">
            <i class="fas fa-exclamation-triangle" style="font-size:1.5rem;color:var(--danger)"></i>
          </div>
          <h3 style="margin-bottom:.5rem">Konfirmasi</h3>
          <p style="color:var(--text-secondary);font-size:.9rem">${message}</p>
        </div>
        <div style="padding:1rem 1.5rem;border-top:1px solid var(--border-color);display:flex;gap:1rem;justify-content:center">
          <button class="btn btn-outline" id="btnCancel" style="padding:.625rem 1.25rem;border-radius:.75rem;font-size:.875rem;font-weight:600;cursor:pointer;border:1.5px solid var(--border-color);background:transparent;color:var(--text-secondary)">Batal</button>
          <button class="btn btn-danger" id="btnConfirm" style="padding:.625rem 1.25rem;border-radius:.75rem;font-size:.875rem;font-weight:600;cursor:pointer;border:none;background:var(--danger);color:#fff">Ya, Lanjutkan</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector('#btnCancel').addEventListener('click', () => { modal.remove(); if (onCancel) onCancel(); });
    modal.querySelector('#btnConfirm').addEventListener('click', () => { modal.remove(); if (onConfirm) onConfirm(); });
    modal.addEventListener('click', (e) => { if (e.target === modal) { modal.remove(); if (onCancel) onCancel(); } });
  }
};

// ─── Menu Visibility (localStorage) ───
window.applyMenuVisibility = function() {
  const cfg = JSON.parse(localStorage.getItem('webpos_menu_config') || '{}');
  const map = {
    'menu_kasir': '[data-menu="kasir"]',
    'menu_produk': '[data-menu="produk"]',
    'menu_riwayat': '[data-menu="riwayat"]',
    'menu_kas': '.nav-dropdown[data-dropdown]',
    'menu_pembelian': '[data-menu="pembelian"]',
    'menu_hutang': '[data-menu="hutang"]',
    'menu_laporan': '[data-menu="laporan"]',
    'menu_laporan-stok': '[data-menu="laporan-stok"]',
    'menu_terlaris': '[data-menu="laporan-terlaris"]',
    'menu_telegram': '[data-menu="telegram"]',
    'menu_pelanggan': '[data-menu="pelanggan"]',
    'menu_pengguna': '[data-menu="pengguna"]',
    'menu_backup': '[data-menu="backup"]',
    'menu_log': '[data-menu="log-aktivitas"]',
    'menu_printer': '[data-menu="printer"]',
    'menu_reset': '[data-menu="reset"]',
    'menu_developer': '[data-menu="developer"]'
  };
  Object.entries(map).forEach(([key, sel]) => {
    const show = cfg[key] !== false;
    document.querySelectorAll(sel).forEach(el => {
      const item = el.closest('.nav-item') || el.closest('.nav-dropdown') || el;
      item.style.display = show ? '' : 'none';
    });
  });
};

// ─── Auto Init ───
document.addEventListener('DOMContentLoaded', () => {
  Utils.Theme.init();
  if (document.querySelector('.app-container')) {
    Utils.Theme.loadTemplate();
    setTimeout(() => { if (typeof applyMenuVisibility === 'function') applyMenuVisibility(); }, 100);
  }
});

window.addEventListener('storage', (e) => {
  if (e.key === 'webpos_theme_template' || e.key === 'webpos_theme_broadcast') Utils.Theme.loadTemplate();
  if (e.key === 'webpos_menu_broadcast' || e.key === 'webpos_menu_config') applyMenuVisibility();
});

console.log('✅ Utils loaded (v3)');
