"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.patientService = void 0;
const connection_1 = require("../database/connection");
exports.patientService = {
    list(filters = {}) {
        const db = (0, connection_1.getDatabase)();
        const { search, page = 1, pageSize = 50, sortBy = 'first_name', sortOrder = 'asc' } = filters;
        const allowedSorts = ['first_name', 'last_name', 'phone_primary', 'created_at', 'city'];
        const sort = allowedSorts.includes(sortBy) ? sortBy : 'first_name';
        const order = sortOrder === 'desc' ? 'DESC' : 'ASC';
        let where = 'WHERE p.is_active = 1';
        const params = [];
        if (search) {
            where += ` AND (p.first_name LIKE ? OR p.last_name LIKE ? OR p.phone_primary LIKE ? OR p.email LIKE ?)`;
            const s = `%${search}%`;
            params.push(s, s, s, s);
        }
        const countRow = db.prepare(`SELECT COUNT(*) as total FROM patients p ${where}`).get(...params);
        const total = countRow.total;
        const offset = (page - 1) * pageSize;
        params.push(pageSize, offset);
        const rows = db.prepare(`
      SELECT p.*,
        COALESCE((
          SELECT SUM(i.total_paise) FROM invoices i
          WHERE i.patient_id = p.id AND i.status NOT IN ('cancelled', 'paid')
        ), 0) - COALESCE((
          SELECT SUM(t.amount_paise) FROM transactions t
          JOIN invoices i ON i.id = t.invoice_id
          WHERE i.patient_id = p.id AND i.status NOT IN ('cancelled', 'paid') AND t.type = 'income'
        ), 0) as outstanding_paise,
        COALESCE((
          SELECT SUM(t.amount_paise) FROM transactions t
          WHERE t.patient_id = p.id AND t.type = 'advance'
        ), 0) + COALESCE((
          SELECT SUM(CASE WHEN paid > total_paise THEN paid - total_paise ELSE 0 END) FROM (
            SELECT inv.total_paise,
              COALESCE((SELECT SUM(t2.amount_paise) FROM transactions t2
                WHERE t2.invoice_id = inv.id AND t2.type = 'income'
                AND (t2.category IS NULL OR t2.category != 'Advance Adjustment')), 0) as paid
            FROM invoices inv WHERE inv.patient_id = p.id
          )
        ), 0) - COALESCE((
          SELECT SUM(t.amount_paise) FROM transactions t
          WHERE t.patient_id = p.id AND t.type = 'income' AND t.category = 'Advance Adjustment'
        ), 0) as advance_balance_paise
      FROM patients p
      ${where}
      ORDER BY p.${sort} ${order} LIMIT ? OFFSET ?
    `).all(...params);
        return { data: rows, total, page, pageSize };
    },
    getById(id) {
        const db = (0, connection_1.getDatabase)();
        const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(id);
        if (!patient)
            return null;
        // Next appointment
        const nextAppt = db.prepare(`
      SELECT a.appointment_date, t.name as treatment_name
      FROM appointments a
      LEFT JOIN treatments t ON t.id = a.treatment_id
      WHERE a.patient_id = ? AND a.status IN ('scheduled','confirmed')
        AND a.appointment_date >= datetime('now')
      ORDER BY a.appointment_date ASC LIMIT 1
    `).get(id);
        // Total paid
        const paid = db.prepare(`
      SELECT COALESCE(SUM(amount_paise), 0) as total
      FROM transactions WHERE patient_id = ? AND type = 'income'
    `).get(id);
        // Outstanding
        const invoiceTotal = db.prepare(`
      SELECT COALESCE(SUM(total_paise), 0) as total
      FROM invoices WHERE patient_id = ? AND status NOT IN ('cancelled', 'paid')
    `).get(id);
        const paidAgainstInvoices = db.prepare(`
      SELECT COALESCE(SUM(t.amount_paise), 0) as total
      FROM transactions t
      JOIN invoices i ON i.id = t.invoice_id
      WHERE i.patient_id = ? AND i.status NOT IN ('cancelled', 'paid') AND t.type = 'income'
    `).get(id);
        // Advance balance = direct advances + un-split overpayments - advances applied
        const advances = db.prepare(`
      SELECT COALESCE(SUM(amount_paise), 0) as total
      FROM transactions WHERE patient_id = ? AND type = 'advance'
    `).get(id);
        const overpayments = db.prepare(`
      SELECT COALESCE(SUM(
        CASE WHEN paid > total_paise THEN paid - total_paise ELSE 0 END
      ), 0) as total
      FROM (
        SELECT i.total_paise,
          COALESCE((
            SELECT SUM(t.amount_paise) FROM transactions t
            WHERE t.invoice_id = i.id AND t.type = 'income'
              AND (t.category IS NULL OR t.category != 'Advance Adjustment')
          ), 0) as paid
        FROM invoices i WHERE i.patient_id = ?
      )
    `).get(id);
        const advancesUsed = db.prepare(`
      SELECT COALESCE(SUM(amount_paise), 0) as total
      FROM transactions WHERE patient_id = ? AND type = 'income' AND category = 'Advance Adjustment'
    `).get(id);
        return {
            ...patient,
            next_appointment: nextAppt?.appointment_date || null,
            next_treatment: nextAppt?.treatment_name || null,
            total_paid_paise: paid.total,
            outstanding_paise: invoiceTotal.total - paidAgainstInvoices.total,
            advance_balance_paise: advances.total + overpayments.total - advancesUsed.total,
        };
    },
    create(data) {
        const db = (0, connection_1.getDatabase)();
        const result = db.prepare(`
      INSERT INTO patients (first_name, last_name, date_of_birth, gender, phone_primary,
        phone_secondary, email, address_line1, address_line2, city, state, pincode,
        medical_history, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(data.first_name, data.last_name, data.date_of_birth, data.gender, data.phone_primary, data.phone_secondary, data.email, data.address_line1, data.address_line2, data.city, data.state, data.pincode, data.medical_history, data.notes);
        return { id: result.lastInsertRowid };
    },
    update(id, data) {
        const db = (0, connection_1.getDatabase)();
        const fields = [];
        const values = [];
        const allowed = ['first_name', 'last_name', 'date_of_birth', 'gender', 'phone_primary',
            'phone_secondary', 'email', 'address_line1', 'address_line2', 'city', 'state',
            'pincode', 'medical_history', 'notes'];
        for (const key of allowed) {
            if (key in data) {
                fields.push(`${key} = ?`);
                values.push(data[key]);
            }
        }
        if (fields.length === 0)
            return { changes: 0 };
        fields.push("updated_at = datetime('now')");
        values.push(id);
        const result = db.prepare(`UPDATE patients SET ${fields.join(', ')} WHERE id = ?`).run(...values);
        return { changes: result.changes };
    },
    softDelete(id) {
        const db = (0, connection_1.getDatabase)();
        const result = db.prepare("UPDATE patients SET is_active = 0, updated_at = datetime('now') WHERE id = ?").run(id);
        return { changes: result.changes };
    },
    getAll() {
        const db = (0, connection_1.getDatabase)();
        return db.prepare('SELECT id, first_name, last_name, phone_primary FROM patients WHERE is_active = 1 ORDER BY first_name, last_name').all();
    },
};
//# sourceMappingURL=patient.service.js.map