/**
 * WebPOS V3 — Services Layer (Business Logic)
 * LOCKED ARCHITECTURE — All Firebase writes go through here
 */

// ============================================
// SETTING SERVICE
// ============================================
class SettingService {
  async getStore() {
    const snap = await database.ref('settings/store').once('value');
    return snap.val() || { name: 'WebPOS', address: '', phone: '' };
  }
  async saveStore(data) {
    await database.ref('settings/store').set({ ...data, updatedAt: Date.now() });
  }
  async getReceiptHeader() {
    const snap = await database.ref('settings/receiptHeader').once('value');
    return snap.val() || {};
  }
  async saveReceiptHeader(data) {
    await database.ref('settings/receiptHeader').set({ ...data, updatedAt: Date.now() });
  }
  async getSystem() {
    const snap = await database.ref('settings/system').once('value');
    return snap.val() || {};
  }
  async getRoleAccess() {
    const snap = await database.ref('settings/developer/roleAccess').once('value');
    return snap.val() || {};
  }
  async saveRoleAccess(data) {
    await database.ref('settings/developer/roleAccess').set(data);
  }
}
window.settingService = new SettingService();

// ============================================
// TRANSACTION SERVICE
// ============================================
class TransactionService {
  get today() { return Utils.getTodayString(); }

  async create(type, payload) {
    const user = Auth.getCurrentUser();
    if (!user) throw new Error('Not authenticated');
    const id = Utils.generateTransactionId();
    const ref = database.ref(`transactions/${this.today}/${id}`);
    await ref.set({
      id,
      type,
      status: 'active',
      userId: user.uid,
      userName: user.name || user.username,
      timestamp: firebase.database.ServerValue.TIMESTAMP,
      ...payload
    });
    return id;
  }

  async getByDate(date = this.today) {
    const snap = await database.ref(`transactions/${date}`).once('value');
    return snap.val() || {};
  }

  async getById(id, date = this.today) {
    const snap = await database.ref(`transactions/${date}/${id}`).once('value');
    return snap.val();
  }

  async cancel(id, date = this.today) {
    await database.ref(`transactions/${date}/${id}/status`).set('cancelled');
  }

  // Specific helpers
  async sale(cart, total, profit, paymentMethod = 'cash', customer = null) {
    return this.create('penjualan', {
      total, profit, items: cart, paymentMethod, customer,
      source: 'kasir_page'
    });
  }

  async topup(amount, adminFee = 0, note = '') {
    return this.create('topup', { amount, adminFee, note });
  }

  async tarik(amount, adminFee = 0, note = '') {
    return this.create('tarik', { amount, adminFee, note });
  }

  async kasMasuk(amount, category = 'lainnya', note = '') {
    return this.create('kas_masuk', { amount, category, note });
  }

  async kasKeluar(amount, category = 'lainnya', note = '') {
    return this.create('kas_keluar', { amount, category, note });
  }

  async pembelian(items, total, supplier = '', note = '') {
    return this.create('pembelian', { items, total, supplier, note });
  }
}
window.transactionService = new TransactionService();

// ============================================
// SHIFT SERVICE
// ============================================
class ShiftService {
  get today() { return Utils.getTodayString(); }

  async get(userId) {
    const snap = await database.ref(`shifts/${this.today}/${userId}`).once('value');
    return snap.val();
  }

  async isOpen(userId) {
    const shift = await this.get(userId);
    return shift && shift.status === 'open';
  }

  async open(userId, userName, modalAwal) {
    const shiftId = 'shift_' + Date.now();
    await database.ref(`shifts/${this.today}/${userId}`).set({
      id: shiftId,
      status: 'open',
      openTime: Date.now(),
      openedAt: firebase.database.ServerValue.TIMESTAMP,
      userId, userName, modalAwal
    });
    return shiftId;
  }

  async close(userId, closingData = {}) {
    await database.ref(`shifts/${this.today}/${userId}`).update({
      status: 'closed',
      closedAt: Date.now(),
      closedReason: 'manual',
      ...closingData
    });
  }

  async transfer(fromUid, toUid, toUserData, modalAmount) {
    const timestamp = Date.now();
    const [shiftSnap, modalSnap] = await Promise.all([
      database.ref(`shifts/${this.today}/${fromUid}`).once('value'),
      database.ref(`modal/${this.today}/${fromUid}`).once('value')
    ]);

    const shiftData = shiftSnap.val();
    const modalData = modalSnap.val();
    if (!shiftData || shiftData.status !== 'open') throw new Error('Shift tidak aktif');

    const targetShift = {
      status: 'open',
      openTime: timestamp,
      openedAt: firebase.database.ServerValue.TIMESTAMP,
      userId: toUid,
      userName: toUserData.name || toUserData.username,
      modalAwal: shiftData.modalAwal,
      transferredFrom: {
        uid: fromUid,
        name: shiftData.userName,
        transferredAt: timestamp,
        originalOpenTime: shiftData.openTime
      }
    };

    const closedShift = {
      ...shiftData,
      status: 'closed',
      closedAt: timestamp,
      closedReason: 'transferred',
      transferredTo: {
        uid: toUid,
        name: toUserData.name || toUserData.username,
        transferredAt: timestamp
      }
    };

    const targetModal = {
      amount: modalData?.amount || shiftData.modalAwal,
      setAt: timestamp,
      setBy: toUid,
      transferredFrom: fromUid,
      note: `Ditransfer dari ${shiftData.userName}`
    };

    await Promise.all([
      database.ref(`shifts/${this.today}/${toUid}`).set(targetShift),
      database.ref(`shifts/${this.today}/${fromUid}`).set(closedShift),
      database.ref(`modal/${this.today}/${toUid}`).set(targetModal)
    ]);

    return { success: true, toUid };
  }

  listen(userId, callback) {
    database.ref(`shifts/${this.today}/${userId}`).on('value', (snap) => {
      callback(snap.val());
    });
  }
}
window.shiftService = new ShiftService();

// ============================================
// MODAL SERVICE
// ============================================
class ModalService {
  get today() { return Utils.getTodayString(); }

  async get(userId) {
    const snap = await database.ref(`modal/${this.today}/${userId}`).once('value');
    return snap.val();
  }

  async set(userId, amount, note = '') {
    await database.ref(`modal/${this.today}/${userId}`).set({
      amount, setAt: Date.now(), setBy: userId, note
    });
  }
}
window.modalService = new ModalService();

// ============================================
// DEBT SERVICE (Hutang Piutang)
// ============================================
class DebtService {
  async create(type, payload) {
    const user = Auth.getCurrentUser();
    const id = 'debt_' + Date.now();
    await database.ref(`debts/${id}`).set({
      id, type, status: 'active',
      createdAt: Date.now(),
      createdBy: user?.uid,
      remaining: payload.amount || 0,
      ...payload
    });
    return id;
  }

  async getAll() {
    const snap = await database.ref('debts').once('value');
    return snap.val() || {};
  }

  async getActiveByType(type) {
    const all = await this.getAll();
    return Object.values(all).filter(d => d.type === type && d.status === 'active');
  }

  async pay(debtId, amount) {
    const snap = await database.ref(`debts/${debtId}`).once('value');
    const debt = snap.val();
    if (!debt) throw new Error('Debt not found');
    const remaining = Math.max(0, (debt.remaining || 0) - amount);
    const status = remaining <= 0 ? 'closed' : 'active';
    await database.ref(`debts/${debtId}`).update({ remaining, status });
  }
}
window.debtService = new DebtService();

// ============================================
// PRODUCT SERVICE
// ============================================
class ProductService {
  async getAll() {
    const snap = await database.ref('products').once('value');
    return snap.val() || {};
  }

  async getById(id) {
    const snap = await database.ref(`products/${id}`).once('value');
    return snap.val();
  }

  async save(id, data) {
    const ref = id ? database.ref(`products/${id}`) : database.ref('products').push();
    await ref.set({ ...data, updatedAt: Date.now() });
    return ref.key;
  }

  async delete(id) {
    await database.ref(`products/${id}`).remove();
  }

  async updateStock(id, delta) {
    const snap = await database.ref(`products/${id}/stock`).once('value');
    const current = snap.val() || 0;
    const next = Math.max(0, current + delta);
    await database.ref(`products/${id}/stock`).set(next);
    return next;
  }
}
window.productService = new ProductService();

// ============================================
// REPORT SERVICE (Aggregate)
// ============================================
class ReportService {
  async getDailySummary(date = Utils.getTodayString()) {
    const trans = await transactionService.getByDate(date);
    const summary = {
      penjualan: 0, profit: 0, topup: 0, tarik: 0,
      kasMasuk: 0, kasKeluar: 0, count: 0
    };
    Object.values(trans).forEach(t => {
      if (t.status === 'cancelled' || t.status === 'voided') return;
      if (t.type === 'penjualan') { summary.penjualan += t.total || 0; summary.profit += t.profit || 0; summary.count++; }
      if (t.type === 'topup') { summary.topup += t.amount || 0; summary.profit += t.adminFee || 0; }
      if (t.type === 'tarik') summary.tarik += t.amount || 0;
      if (t.type === 'kas_masuk' && t.category !== 'penjualan_hutang') summary.kasMasuk += t.amount || 0;
      if (t.type === 'kas_keluar') summary.kasKeluar += t.amount || 0;
    });
    return summary;
  }

  async getCashPosition(userId, date = Utils.getTodayString()) {
    const [modalSnap, summary, debtsSnap] = await Promise.all([
      database.ref(`modal/${date}/${userId}`).once('value'),
      this.getDailySummary(date),
      database.ref('debts').once('value')
    ]);

    const modal = modalSnap.val()?.amount || 0;
    const debts = debtsSnap.val() || {};
    const todayStart = new Date(date + 'T00:00:00').getTime();
    const todayEnd = todayStart + 86400000;
    let piutang = 0;
    Object.values(debts).forEach(d => {
      if (d.status === 'active' && d.type === 'piutang' && d.createdAt >= todayStart && d.createdAt < todayEnd) {
        piutang += d.remaining || 0;
      }
    });

    const global = modal + summary.kasMasuk - summary.kasKeluar + summary.penjualan - piutang + summary.topup - summary.tarik;
    return { modal, ...summary, piutang, global };
  }
}
window.reportService = new ReportService();

// ============================================
// USER SERVICE (Management)
// ============================================
class UserService {
  async getAll() {
    const snap = await database.ref('users').once('value');
    return snap.val() || {};
  }
  async getPending() {
    const snap = await database.ref('users').orderByChild('status').equalTo('pending').once('value');
    return snap.val() || {};
  }
  async updateStatus(uid, status, approverUid) {
    const updates = { status, approvedBy: approverUid, approvedAt: Date.now() };
    await database.ref(`users/${uid}`).update(updates);
  }
  async updateProfile(uid, data) {
    await database.ref(`users/${uid}`).update({ ...data, updatedAt: Date.now() });
  }
}
window.userService = new UserService();

console.log('✅ WebPOS Services Layer loaded (v3 locked)');
