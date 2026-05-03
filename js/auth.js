/**
 * WebPOS Authentication — V3 Locked
 * 4 Role: developer > owner > admin > kasir
 * Permission 3-layer: Developer bypass → Individual → Master roleAccess
 */

const Auth = {
  currentUser: null,
  pendingApproval: null,
  roleAccessCache: null,

  // ─── Init ───
  init() {
    const session = Utils.getStorage('webpos_session');
    if (session && session.user) this.currentUser = session.user;
    if (typeof auth !== 'undefined') {
      auth.onAuthStateChanged((user) => {
        if (user) this.loadUserData(user.uid);
        else { this.currentUser = null; Utils.removeStorage('webpos_session'); }
      });
    }
  },

  // ─── Load User Data + Role Access ───
  async loadUserData(uid) {
    try {
      const snap = await database.ref(`users/${uid}`).once('value');
      const data = snap.val();
      if (!data) return null;

      // Status checks
      if (data.status === 'pending') {
        this.pendingApproval = { uid, ...data };
        await auth.signOut();
        return { error: 'pending_approval', message: 'Akun Anda masih menunggu persetujuan' };
      }
      if (data.status === 'rejected') { await auth.signOut(); return { error: 'rejected', message: 'Akun ditolak' }; }
      if (data.status === 'suspended') { await auth.signOut(); return { error: 'suspended', message: 'Akun ditangguhkan' }; }

      this.currentUser = {
        uid, username: data.username, email: data.email, name: data.name,
        role: data.role, permissions: data.permissions || {},
        avatar: data.avatar || null, status: data.status,
        approvedBy: data.approvedBy || null, approvedAt: data.approvedAt || null
      };

      Utils.setStorage('webpos_session', { user: this.currentUser, loginTime: Date.now() });
      await database.ref(`users/${uid}`).update({ lastLogin: firebase.database.ServerValue.TIMESTAMP, isOnline: true });

      // Load master role access
      await this.loadRoleAccess();
      return this.currentUser;
    } catch (e) { console.error('loadUserData error:', e); return null; }
  },

  // ─── Role Access (Master Config) ───
  async loadRoleAccess() {
    try {
      const snap = await database.ref('settings/developer/roleAccess').once('value');
      this.roleAccessCache = snap.val() || {};
    } catch (e) { this.roleAccessCache = {}; }
  },
  getRoleAccess(role, key) {
    if (!this.roleAccessCache) return false;
    const cfg = this.roleAccessCache[role];
    if (!cfg) return false;
    return cfg[key] === true;
  },

  // ─── Permission 3-Layer ───
  hasPermission(key) {
    const user = this.getCurrentUser();
    if (!user) return false;
    if (user.role === 'developer') return true;           // Layer 1: bypass
    const individual = user.permissions?.[key];
    if (individual === true) return true;                // Layer 2: explicit allow
    if (individual === false) return false;              // Layer 2: explicit deny
    return this.getRoleAccess(user.role, key);             // Layer 3: master
  },

  // ─── Role Hierarchy ───
  hasRole(required) {
    if (!this.currentUser) return false;
    if (typeof required === 'string') return this.currentUser.role === required;
    return required.includes(this.currentUser.role);
  },
  canManageRole(targetRole) {
    const user = this.getCurrentUser();
    if (!user) return false;
    const h = { developer: 4, owner: 3, admin: 2, kasir: 1 };
    return (h[user.role] || 0) > (h[targetRole] || 0);
  },

  // ─── Login ───
  async login(username, password) {
    try {
      Utils.showLoading('Logging in...');
      const formatted = Utils.formatUsername(username);
      if (!formatted) { Utils.hideLoading(); Utils.showToast('Username tidak valid', 'error'); return { success: false }; }

      const snap = await database.ref('users').orderByChild('username').equalTo(formatted).once('value');
      const users = snap.val();
      if (!users) { Utils.hideLoading(); Utils.showToast('Username tidak ditemukan', 'error'); return { success: false }; }

      const uid = Object.keys(users)[0];
      const udata = users[uid];

      if (udata.status === 'pending') { Utils.hideLoading(); return { success: false, error: 'pending_approval', message: 'Akun pending approval' }; }
      if (udata.status === 'rejected') { Utils.hideLoading(); return { success: false, error: 'rejected', message: 'Akun ditolak' }; }
      if (udata.status === 'suspended') { Utils.hideLoading(); return { success: false, error: 'suspended', message: 'Akun ditangguhkan' }; }

      const cred = await auth.signInWithEmailAndPassword(udata.email, password);
      const user = await this.loadUserData(cred.user.uid);
      Utils.hideLoading();

      if (user && !user.error) {
        Utils.showToast(`Selamat datang, ${user.name || user.username}!`, 'success');
        return { success: true, user };
      }
      if (user && user.error) return { success: false, error: user.error, message: user.message };
      return { success: false };
    } catch (e) {
      Utils.hideLoading();
      let msg = 'Login gagal';
      if (e.code === 'auth/wrong-password') msg = 'Password salah';
      else if (e.code === 'auth/user-not-found') msg = 'User tidak ditemukan';
      else if (e.code === 'auth/too-many-requests') msg = 'Terlalu banyak percobaan';
      Utils.showToast(msg, 'error');
      return { success: false, message: msg };
    }
  },

  // ─── Register ───
  async register(username, password, name, email, role = 'kasir') {
    try {
      Utils.showLoading('Mendaftarkan...');
      const formatted = Utils.formatUsername(username);
      if (!formatted || formatted.length < 3) { Utils.hideLoading(); Utils.showToast('Username min 3 karakter', 'error'); return { success: false }; }

            // ⭐ 1. Bikin akun Firebase Auth DULU (sekarang user sudah terautentikasi)
      const userEmail = email || `${formatted}@webpos.local`;
      let res;
      try {
        res = await auth.createUserWithEmailAndPassword(userEmail, password);
      } catch (e) {
        Utils.hideLoading();
        if (e.code === 'auth/email-already-in-use') Utils.showToast('Email sudah terdaftar', 'error');
        else if (e.code === 'auth/weak-password') Utils.showToast('Password terlalu lemah', 'error');
        else Utils.showToast('Gagal membuat akun: ' + e.message, 'error');
        return { success: false };
      }
      const uid = res.user.uid;

      // ⭐ 2. Sekarang sudah auth, baru cek username + write data
      const check = await database.ref('users').orderByChild('username').equalTo(formatted).once('value');
      if (check.val()) {
        // Username sudah ada → hapus akun Firebase yang baru dibuat
        await auth.currentUser.delete();
        await auth.signOut();
        Utils.hideLoading();
        Utils.showToast('Username sudah digunakan', 'error');
        return { success: false };
      }

      // Developer & Owner langsung aktif. Admin & Kasir pending.
      const autoActive = (role === 'developer' || role === 'owner');
      const status = autoActive ? 'active' : 'pending';

      await database.ref(`users/${uid}`).set({
        uid, username: formatted, email: userEmail, name: name || formatted, role,
        permissions: {}, status,
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        lastLogin: firebase.database.ServerValue.TIMESTAMP,
        isOnline: true,
        approvedBy: autoActive ? 'system' : null,
        approvedAt: autoActive ? firebase.database.ServerValue.TIMESTAMP : null
      });

      Utils.hideLoading();
      if (!autoActive) {
        await auth.signOut();
        Utils.showToast('Pendaftaran berhasil! Menunggu approval.', 'success');
        return { success: true, uid, pendingApproval: true };
      }
      Utils.showToast('Akun berhasil dibuat!', 'success');
      return { success: true, uid };
    } catch (e) {
      Utils.hideLoading();
      console.error('REGISTER EXACT ERROR:', e.code, e.message, e);
      let msg = 'Pendaftaran gagal';
      if (e.code === 'auth/email-already-in-use') msg = 'Email sudah terdaftar';
      else if (e.code === 'auth/weak-password') msg = 'Password terlalu lemah (min 6)';
      else if (e.code === 'auth/invalid-email') msg = 'Email tidak valid';
      else if (e.code === 'auth/operation-not-allowed') msg = 'Email/Password belum aktif di Firebase Console';
      else msg = e.message || 'Pendaftaran gagal';
      Utils.showToast(msg, 'error');
      return { success: false, message: msg };
    }
  },

  // ─── Approve / Reject ───
  async approveUser(uid, approverUid) {
    try {
      Utils.showLoading();
      const snap = await database.ref(`users/${approverUid}`).once('value');
      const me = snap.val();
      if (!me || !this.canManageRole('kasir')) { Utils.hideLoading(); Utils.showToast('Tidak berhak', 'error'); return { success: false }; }
      await database.ref(`users/${uid}`).update({ status: 'active', approvedBy: approverUid, approvedAt: Date.now() });
      Utils.hideLoading(); Utils.showToast('User disetujui', 'success');
      return { success: true };
    } catch (e) { Utils.hideLoading(); return { success: false }; }
  },
  async rejectUser(uid, approverUid, reason = '') {
    try {
      Utils.showLoading();
      const snap = await database.ref(`users/${approverUid}`).once('value');
      const me = snap.val();
      if (!me || !this.canManageRole('kasir')) { Utils.hideLoading(); Utils.showToast('Tidak berhak', 'error'); return { success: false }; }
      await database.ref(`users/${uid}`).update({ status: 'rejected', rejectedBy: approverUid, rejectedAt: Date.now(), rejectionReason: reason });
      Utils.hideLoading(); Utils.showToast('User ditolak', 'success');
      return { success: true };
    } catch (e) { Utils.hideLoading(); return { success: false }; }
  },

  // ─── Logout ───
  async logout() {
    try {
      if (this.currentUser) await database.ref(`users/${this.currentUser.uid}`).update({ isOnline: false, lastLogout: Date.now() });
      await auth.signOut();
      this.currentUser = null; Utils.removeStorage('webpos_session');
      Utils.showToast('Logout berhasil', 'info');
      window.location.href = 'login.html';
    } catch (e) { console.error('Logout error:', e); }
  },

  // ─── Getters ───
  getCurrentUser() { return this.currentUser; },
  isAuthenticated() { return !!this.currentUser || !!Utils.getStorage('webpos_session'); },

  // ─── Profile ───
  async updateProfile(uid, updates) {
    try {
      Utils.showLoading();
      await database.ref(`users/${uid}`).update({ ...updates, updatedAt: Date.now() });
      if (this.currentUser && this.currentUser.uid === uid) {
        this.currentUser = { ...this.currentUser, ...updates };
        Utils.setStorage('webpos_session', { user: this.currentUser, loginTime: Date.now() });
      }
      Utils.hideLoading(); Utils.showToast('Profil diperbarui', 'success');
      return { success: true };
    } catch (e) { Utils.hideLoading(); return { success: false }; }
  },
  async changePassword(newPassword) {
    try {
      Utils.showLoading();
      const user = auth.currentUser;
      if (!user) { Utils.hideLoading(); return { success: false }; }
      await user.updatePassword(newPassword);
      Utils.hideLoading(); Utils.showToast('Password diubah', 'success');
      return { success: true };
    } catch (e) {
      Utils.hideLoading();
      Utils.showToast(e.code === 'auth/weak-password' ? 'Password terlalu lemah' : 'Gagal ubah password', 'error');
      return { success: false };
    }
  },
  async sendPasswordReset(email) {
    try { await auth.sendPasswordResetEmail(email); Utils.showToast('Email reset terkirim', 'success'); return { success: true }; }
    catch (e) { Utils.showToast('Gagal kirim reset', 'error'); return { success: false }; }
  },

  // ─── Sidebar Filter (display:none, bukan remove) ───
  _sidebarFiltered: false,
  PAGE_PERMISSIONS: {
    'index.html': 'dashboard', 'page-kasir.html': 'kasir', 'page-produk.html': 'produk',
    'page-riwayat.html': 'riwayat', 'page-kas.html': 'kas', 'page-modal-harian.html': 'kas',
    'page-kas-masuk.html': 'kas', 'page-kas-keluar.html': 'kas', 'page-kas-shift.html': 'kas',
    'page-kas-topup.html': 'kas', 'page-kas-tarik.html': 'kas', 'page-pembelian.html': 'pembelian',
    'page-hutang.html': 'hutang', 'page-laporan.html': 'laporan', 'page-laporan-stok.html': 'laporan-stok',
    'page-laporan-terlaris.html': 'laporan-terlaris', 'page-saldo-telegram.html': 'telegram',
    'page-data-pelanggan.html': 'pelanggan', 'page-pengguna.html': 'pengguna',
    'page-setting.html': 'setting', 'page-backup.html': 'backup', 'page-log-aktivitas.html': 'log-aktivitas',
    'page-printer.html': 'printer', 'page-reset.html': 'reset', 'page-developer.html': 'developer'
  },
  filterSidebarMenu() {
    const user = this.getCurrentUser();
    if (!user || user.role === 'developer') return;
    if (this._sidebarFiltered) return;
    const sidebar = document.getElementById('sidebar') || document.querySelector('.sidebar') || document.querySelector('aside');
    if (!sidebar) return;

    // By data-menu
    sidebar.querySelectorAll('a[data-menu]').forEach(link => {
      const key = link.getAttribute('data-menu');
      const ok = this.hasPermission(key);
      const item = link.closest('li') || link.closest('.nav-item') || link.parentElement;
      item.style.display = ok ? '' : 'none';
    });
    // By data-menu on dropdown toggles
    sidebar.querySelectorAll('[data-menu]:not(a)').forEach(el => {
      const key = el.getAttribute('data-menu');
      const ok = this.hasPermission(key);
      const item = el.closest('li') || el.closest('.nav-item') || el.parentElement;
      item.style.display = ok ? '' : 'none';
    });
    // By href fallback
    sidebar.querySelectorAll('a[href]:not([data-menu])').forEach(link => {
      const href = (link.getAttribute('href') || '').split('?')[0].split('#')[0].split('/').pop();
      const key = this.PAGE_PERMISSIONS[href];
      if (!key) return;
      const ok = this.hasPermission(key);
      if (!ok) { const item = link.closest('li') || link.closest('.nav-item') || link.parentElement; item.style.display = 'none'; }
    });
    // Hide empty sections
    sidebar.querySelectorAll('.nav-section').forEach(sec => {
      const items = sec.querySelectorAll('li, .nav-item');
      const allHidden = Array.from(items).every(it => it.style.display === 'none');
      if (items.length > 0 && allHidden) sec.style.display = 'none';
    });
    this._sidebarFiltered = true;
  }
};

// ─── Auto-run filter ───
document.addEventListener('DOMContentLoaded', () => {
  Auth.init();
  const session = Utils.getStorage('webpos_session');
  if (session && session.user && session.user.role !== 'developer') {
    Auth.currentUser = session.user;
    Auth.loadRoleAccess().then(() => {
      Auth._sidebarFiltered = false;
      Auth.filterSidebarMenu();
    });
  }
  if (typeof auth !== 'undefined') {
    auth.onAuthStateChanged((user) => {
      if (user) {
        Auth.loadUserData(user.uid).then(() => {
          Auth._sidebarFiltered = false;
          Auth.filterSidebarMenu();
        });
      }
    });
  }
});

console.log('✅ Auth loaded (v3) — 4 roles, 3-layer permission');
