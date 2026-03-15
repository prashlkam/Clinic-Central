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
        let where = 'WHERE is_active = 1';
        const params = [];
        if (search) {
            where += ` AND (first_name LIKE ? OR last_name LIKE ? OR phone_primary LIKE ? OR email LIKE ?)`;
            const s = `%${search}%`;
            params.push(s, s, s, s);
        }
        const countRow = db.prepare(`SELECT COUNT(*) as total FROM patients ${where}`).get(...params);
        const total = countRow.total;
        const offset = (page - 1) * pageSize;
        params.push(pageSize, offset);
        const rows = db.prepare(`SELECT * FROM patients ${where} ORDER BY ${sort} ${order} LIMIT ? OFFSET ?`).all(...params);
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
      WHERE i.patient_id = ? AND t.type = 'income'
    `).get(id);
        return {
            ...patient,
            next_appointment: nextAppt?.appointment_date || null,
            next_treatment: nextAppt?.treatment_name || null,
            total_paid_paise: paid.total,
            outstanding_paise: invoiceTotal.total - paidAgainstInvoices.total,
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