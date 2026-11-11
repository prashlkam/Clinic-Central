import { getDatabase } from '../database/connection';
import { localDayRange } from '../database/helpers';

export interface Appointment {
  id: number;
  patient_id: number;
  treatment_id: number | null;
  appointment_date: string;
  duration_minutes: number;
  status: string;
  notes: string | null;
  google_event_id: string | null;
  token_number?: number | null;
  checked_in_at?: string | null;
  is_walk_in?: number;
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
      WHERE a.appointment_date >= ? AND a.appointment_date < ?
      ORDER BY a.appointment_date ASC
    `).all(...localDayRange()) as Appointment[];
  },

  /** Today's patients in serving order: checked-in tokens first, then by appointment time. */
  getQueue(date?: string) {
    const db = getDatabase();
    return db.prepare(`
      SELECT a.*,
        p.first_name || ' ' || p.last_name as patient_name,
        p.phone_primary as patient_phone,
        t.name as treatment_name
      FROM appointments a
      LEFT JOIN patients p ON p.id = a.patient_id
      LEFT JOIN treatments t ON t.id = a.treatment_id
      WHERE a.appointment_date >= ? AND a.appointment_date < ?
      ORDER BY (a.token_number IS NULL), a.token_number, a.appointment_date
    `).all(...localDayRange(date)) as Appointment[];
  },

  /** Mark the patient as arrived and issue the next token number for that day. */
  checkIn(id: number) {
    const db = getDatabase();
    return db.transaction(() => {
      const appt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id) as Appointment | undefined;
      if (!appt) throw new Error('Appointment not found');
      if (appt.token_number) return { token_number: appt.token_number };
      if (['cancelled', 'completed'].includes(appt.status)) throw new Error(`Cannot check in a ${appt.status} appointment`);
      const d = new Date(appt.appointment_date);
      const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const max = db.prepare(
        'SELECT COALESCE(MAX(token_number), 0) AS m FROM appointments WHERE appointment_date >= ? AND appointment_date < ?'
      ).get(...localDayRange(day)) as any;
      const token = max.m + 1;
      db.prepare(`
        UPDATE appointments SET token_number = ?, checked_in_at = ?,
          status = CASE WHEN status IN ('scheduled','no_show') THEN 'confirmed' ELSE status END,
          updated_at = datetime('now')
        WHERE id = ?
      `).run(token, new Date().toISOString(), id);
      return { token_number: token };
    })();
  },

  /** Register a walk-in: creates an appointment for right now and checks the patient in. */
  walkIn(data: { patient_id: number; treatment_id?: number; duration_minutes?: number; notes?: string }) {
    const db = getDatabase();
    if (!data.patient_id) throw new Error('Select a patient');
    return db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO appointments (patient_id, treatment_id, appointment_date, duration_minutes, notes, is_walk_in)
        VALUES (?, ?, ?, ?, ?, 1)
      `).run(data.patient_id, data.treatment_id || null, new Date().toISOString(), data.duration_minutes || 30, data.notes || null);
      const id = Number(result.lastInsertRowid);
      return { id, ...this.checkIn(id) };
    })();
  },
};
