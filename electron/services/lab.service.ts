import { getDatabase } from '../database/connection';
import { saveRow, localDate } from '../database/helpers';

const ORDER_FIELDS = ['patient_id', 'lab_id', 'work_type', 'material', 'teeth', 'shade', 'instructions',
  'order_date', 'due_date', 'trial_date', 'received_date', 'status', 'cost_paise'];
const OPEN_STATUSES = "('ordered','sent','trial')";

export const labService = {
  listLabs() {
    return getDatabase().prepare('SELECT * FROM labs WHERE is_active = 1 ORDER BY name').all();
  },
  saveLab(data: Record<string, any>) {
    if (!data.id && !data.name?.trim()) throw new Error('Lab name is required');
    return { id: saveRow('labs', data, ['name', 'contact', 'phone', 'address', 'is_active'], false) };
  },
  deleteLab(id: number) {
    return getDatabase().prepare('UPDATE labs SET is_active = 0 WHERE id = ?').run(id);
  },

  listOrders(filters: { patientId?: number; status?: string; openOnly?: boolean } = {}) {
    let where = 'WHERE 1=1';
    const params: any[] = [];
    if (filters.patientId) { where += ' AND o.patient_id = ?'; params.push(filters.patientId); }
    if (filters.status && filters.status !== 'all') { where += ' AND o.status = ?'; params.push(filters.status); }
    if (filters.openOnly) where += ` AND o.status IN ${OPEN_STATUSES}`;
    return getDatabase().prepare(`
      SELECT o.*, p.first_name || ' ' || p.last_name AS patient_name, l.name AS lab_name
      FROM lab_orders o
      JOIN patients p ON p.id = o.patient_id
      LEFT JOIN labs l ON l.id = o.lab_id
      ${where}
      ORDER BY o.order_date DESC, o.id DESC
    `).all(...params);
  },

  saveOrder(data: Record<string, any>) {
    if (!data.id && (!data.patient_id || !data.work_type)) throw new Error('Patient and work type are required');
    const patch = { ...data };
    if (patch.status === 'received' && !patch.received_date) patch.received_date = localDate();
    return { id: saveRow('lab_orders', patch, ORDER_FIELDS) };
  },

  setOrderStatus(id: number, status: string) {
    const db = getDatabase();
    const order = db.prepare('SELECT received_date FROM lab_orders WHERE id = ?').get(id) as any;
    if (!order) throw new Error('Lab order not found');
    const received = ['received', 'fitted'].includes(status) ? (order.received_date || localDate()) : order.received_date;
    return db.prepare("UPDATE lab_orders SET status = ?, received_date = ?, updated_at = datetime('now') WHERE id = ?")
      .run(status, received, id);
  },

  deleteOrder(id: number) {
    return getDatabase().prepare('DELETE FROM lab_orders WHERE id = ?').run(id);
  },

  /** Book the lab bill as a clinic expense (once per order). */
  recordExpense(id: number, paymentMethod = 'cash') {
    const db = getDatabase();
    const order = db.prepare(`
      SELECT o.*, l.name AS lab_name, p.first_name || ' ' || p.last_name AS patient_name
      FROM lab_orders o JOIN patients p ON p.id = o.patient_id LEFT JOIN labs l ON l.id = o.lab_id WHERE o.id = ?
    `).get(id) as any;
    if (!order) throw new Error('Lab order not found');
    if (order.expense_transaction_id) throw new Error('Expense already recorded for this lab order');
    if (!order.cost_paise) throw new Error('Set the lab cost before recording the expense');
    return db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO transactions (type, category, amount_paise, payment_method, transaction_date, notes)
        VALUES ('expense', 'Lab Charges', ?, ?, ?, ?)
      `).run(order.cost_paise, paymentMethod, localDate(),
        `${order.work_type} for ${order.patient_name}${order.lab_name ? ` - ${order.lab_name}` : ''}`);
      db.prepare('UPDATE lab_orders SET expense_transaction_id = ? WHERE id = ?').run(Number(result.lastInsertRowid), id);
      return { transaction_id: Number(result.lastInsertRowid) };
    })();
  },

  /** Open orders that are due within `days` days (or overdue). */
  dueSoon(days = 2) {
    const now = new Date();
    const limit = localDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + days));
    return getDatabase().prepare(`
      SELECT o.*, p.first_name || ' ' || p.last_name AS patient_name, l.name AS lab_name
      FROM lab_orders o JOIN patients p ON p.id = o.patient_id LEFT JOIN labs l ON l.id = o.lab_id
      WHERE o.status IN ${OPEN_STATUSES} AND o.due_date IS NOT NULL AND o.due_date <= ?
      ORDER BY o.due_date
    `).all(limit);
  },
};
