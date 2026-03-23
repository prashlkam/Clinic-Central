"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appointmentService = void 0;
const connection_1 = require("../database/connection");
exports.appointmentService = {
    list(filters = {}) {
        const db = (0, connection_1.getDatabase)();
        const { search, status, startDate, endDate, patientId, page = 1, pageSize = 50 } = filters;
        let where = 'WHERE 1=1';
        const params = [];
        if (search) {
            where += ` AND (p.first_name LIKE ? OR p.last_name LIKE ? OR t.name LIKE ?)`;
            const s = `%${search}%`;
            params.push(s, s, s);
        }
        if (status && status !== 'all') {
            where += ' AND a.status = ?';
            params.push(status);
        }
        if (startDate) {
            where += ' AND a.appointment_date >= ?';
            params.push(startDate);
        }
        if (endDate) {
            where += ' AND a.appointment_date <= ?';
            params.push(endDate);
        }
        if (patientId) {
            where += ' AND a.patient_id = ?';
            params.push(patientId);
        }
        const countRow = db.prepare(`
      SELECT COUNT(*) as total FROM appointments a
      LEFT JOIN patients p ON p.id = a.patient_id
      LEFT JOIN treatments t ON t.id = a.treatment_id
      ${where}
    `).get(...params);
        const offset = (page - 1) * pageSize;
        params.push(pageSize, offset);
        const rows = db.prepare(`
      SELECT a.*,
        p.first_name || ' ' || p.last_name as patient_name,
        p.phone_primary as patient_phone,
        p.email as patient_email,
        t.name as treatment_name
      FROM appointments a
      LEFT JOIN patients p ON p.id = a.patient_id
      LEFT JOIN treatments t ON t.id = a.treatment_id
      ${where}
      ORDER BY a.appointment_date DESC
      LIMIT ? OFFSET ?
    `).all(...params);
        return { data: rows, total: countRow.total, page, pageSize };
    },
    getById(id) {
        const db = (0, connection_1.getDatabase)();
        return db.prepare(`
      SELECT a.*,
        p.first_name || ' ' || p.last_name as patient_name,
        p.phone_primary as patient_phone,
        p.email as patient_email,
        t.name as treatment_name,
        t.estimated_cost_paise
      FROM appointments a
      LEFT JOIN patients p ON p.id = a.patient_id
      LEFT JOIN treatments t ON t.id = a.treatment_id
      WHERE a.id = ?
    `).get(id);
    },
    create(data) {
        const db = (0, connection_1.getDatabase)();
        const result = db.prepare(`
      INSERT INTO appointments (patient_id, treatment_id, appointment_date, duration_minutes, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(data.patient_id, data.treatment_id || null, data.appointment_date, data.duration_minutes || 30, data.notes || null);
        return { id: result.lastInsertRowid };
    },
    update(id, data) {
        const db = (0, connection_1.getDatabase)();
        const fields = [];
        const values = [];
        const allowed = ['patient_id', 'treatment_id', 'appointment_date', 'duration_minutes', 'status', 'notes', 'google_event_id'];
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
        return db.prepare(`UPDATE appointments SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    },
    delete(id) {
        const db = (0, connection_1.getDatabase)();
        return db.prepare('DELETE FROM appointments WHERE id = ?').run(id);
    },
    getUpcoming(limit = 10) {
        const db = (0, connection_1.getDatabase)();
        return db.prepare(`
      SELECT a.*,
        p.first_name || ' ' || p.last_name as patient_name,
        p.phone_primary as patient_phone,
        p.email as patient_email,
        t.name as treatment_name
      FROM appointments a
      LEFT JOIN patients p ON p.id = a.patient_id
      LEFT JOIN treatments t ON t.id = a.treatment_id
      WHERE a.status IN ('scheduled', 'confirmed')
        AND a.appointment_date >= datetime('now')
      ORDER BY a.appointment_date ASC
      LIMIT ?
    `).all(limit);
    },
    getTodaysAppointments() {
        const db = (0, connection_1.getDatabase)();
        return db.prepare(`
      SELECT a.*,
        p.first_name || ' ' || p.last_name as patient_name,
        p.phone_primary as patient_phone,
        p.email as patient_email,
        t.name as treatment_name
      FROM appointments a
      LEFT JOIN patients p ON p.id = a.patient_id
      LEFT JOIN treatments t ON t.id = a.treatment_id
      WHERE date(a.appointment_date) = date('now')
      ORDER BY a.appointment_date ASC
    `).all();
    },
};
//# sourceMappingURL=appointment.service.js.map