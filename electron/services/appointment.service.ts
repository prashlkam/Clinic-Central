import { getDatabase } from '../database/connection';

export interface Appointment {
  id: number;
  patient_id: number;
  treatment_id: number | null;
  appointment_date: string;
  duration_minutes: number;
  status: string;
  notes: string | null;
  google_event_id: string | null;
  created_at: string;
  updated_at: string;
  patient_name?: string;
  treatment_name?: string;
  patient_phone?: string;
  patient_email?: string;
}

export interface AppointmentFilters {
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  patientId?: number;
  page?: number;
  pageSize?: number;
}

export const appointmentService = {
  list(filters: AppointmentFilters = {}) {
    const db = getDatabase();
    const { search, status, startDate, endDate, patientId, page = 1, pageSize = 50 } = filters;

    let where = 'WHERE 1=1';
    const params: any[] = [];

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
    `).get(...params) as any;

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
    `).all(...params) as Appointment[];

    return { data: rows, total: countRow.total, page, pageSize };
  },

  getById(id: number) {
    const db = getDatabase();
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

  create(data: { patient_id: number; treatment_id?: number; appointment_date: string; duration_minutes?: number; notes?: string }) {
    const db = getDatabase();
    const result = db.prepare(`
      INSERT INTO appointments (patient_id, treatment_id, appointment_date, duration_minutes, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      data.patient_id, data.treatment_id || null, data.appointment_date,
      data.duration_minutes || 30, data.notes || null
    );
    return { id: result.lastInsertRowid };
  },

  update(id: number, data: Partial<Appointment>) {
    const db = getDatabase();
    const fields: string[] = [];
    const values: any[] = [];
    const allowed = ['patient_id', 'treatment_id', 'appointment_date', 'duration_minutes', 'status', 'notes', 'google_event_id'];

    for (const key of allowed) {
      if (key in data) {
        fields.push(`${key} = ?`);
        values.push((data as any)[key]);
      }
    }

    if (fields.length === 0) return { changes: 0 };
    fields.push("updated_at = datetime('now')");
    values.push(id);

    return db.prepare(`UPDATE appointments SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  },

  delete(id: number) {
    const db = getDatabase();
    return db.prepare('DELETE FROM appointments WHERE id = ?').run(id);
  },

  getUpcoming(limit = 10) {
    const db = getDatabase();
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
    `).all(limit) as Appointment[];
  },

  getTodaysAppointments() {
    const db = getDatabase();
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
    `).all() as Appointment[];
  },
};
