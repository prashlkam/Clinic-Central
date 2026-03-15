import { getDatabase } from '../database/connection';

export interface Patient {
  id: number;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  gender: string | null;
  phone_primary: string;
  phone_secondary: string | null;
  email: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  medical_history: string | null;
  notes: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface PatientFilters {
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PatientSummary extends Patient {
  next_appointment?: string | null;
  next_treatment?: string | null;
  total_paid_paise?: number;
  outstanding_paise?: number;
}

export const patientService = {
  list(filters: PatientFilters = {}) {
    const db = getDatabase();
    const { search, page = 1, pageSize = 50, sortBy = 'first_name', sortOrder = 'asc' } = filters;

    const allowedSorts = ['first_name', 'last_name', 'phone_primary', 'created_at', 'city'];
    const sort = allowedSorts.includes(sortBy) ? sortBy : 'first_name';
    const order = sortOrder === 'desc' ? 'DESC' : 'ASC';

    let where = 'WHERE is_active = 1';
    const params: any[] = [];

    if (search) {
      where += ` AND (first_name LIKE ? OR last_name LIKE ? OR phone_primary LIKE ? OR email LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    const countRow = db.prepare(`SELECT COUNT(*) as total FROM patients ${where}`).get(...params) as any;
    const total = countRow.total;

    const offset = (page - 1) * pageSize;
    params.push(pageSize, offset);
    const rows = db.prepare(
      `SELECT * FROM patients ${where} ORDER BY ${sort} ${order} LIMIT ? OFFSET ?`
    ).all(...params) as Patient[];

    return { data: rows, total, page, pageSize };
  },

  getById(id: number): PatientSummary | null {
    const db = getDatabase();
    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(id) as Patient | undefined;
    if (!patient) return null;

    // Next appointment
    const nextAppt = db.prepare(`
      SELECT a.appointment_date, t.name as treatment_name
      FROM appointments a
      LEFT JOIN treatments t ON t.id = a.treatment_id
      WHERE a.patient_id = ? AND a.status IN ('scheduled','confirmed')
        AND a.appointment_date >= datetime('now')
      ORDER BY a.appointment_date ASC LIMIT 1
    `).get(id) as any;

    // Total paid
    const paid = db.prepare(`
      SELECT COALESCE(SUM(amount_paise), 0) as total
      FROM transactions WHERE patient_id = ? AND type = 'income'
    `).get(id) as any;

    // Outstanding
    const invoiceTotal = db.prepare(`
      SELECT COALESCE(SUM(total_paise), 0) as total
      FROM invoices WHERE patient_id = ? AND status NOT IN ('cancelled', 'paid')
    `).get(id) as any;
    const paidAgainstInvoices = db.prepare(`
      SELECT COALESCE(SUM(t.amount_paise), 0) as total
      FROM transactions t
      JOIN invoices i ON i.id = t.invoice_id
      WHERE i.patient_id = ? AND t.type = 'income'
    `).get(id) as any;

    return {
      ...patient,
      next_appointment: nextAppt?.appointment_date || null,
      next_treatment: nextAppt?.treatment_name || null,
      total_paid_paise: paid.total,
      outstanding_paise: invoiceTotal.total - paidAgainstInvoices.total,
    };
  },

  create(data: Omit<Patient, 'id' | 'is_active' | 'created_at' | 'updated_at'>) {
    const db = getDatabase();
    const result = db.prepare(`
      INSERT INTO patients (first_name, last_name, date_of_birth, gender, phone_primary,
        phone_secondary, email, address_line1, address_line2, city, state, pincode,
        medical_history, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.first_name, data.last_name, data.date_of_birth, data.gender,
      data.phone_primary, data.phone_secondary, data.email,
      data.address_line1, data.address_line2, data.city, data.state, data.pincode,
      data.medical_history, data.notes
    );
    return { id: result.lastInsertRowid };
  },

  update(id: number, data: Partial<Patient>) {
    const db = getDatabase();
    const fields: string[] = [];
    const values: any[] = [];

    const allowed = ['first_name', 'last_name', 'date_of_birth', 'gender', 'phone_primary',
      'phone_secondary', 'email', 'address_line1', 'address_line2', 'city', 'state',
      'pincode', 'medical_history', 'notes'];

    for (const key of allowed) {
      if (key in data) {
        fields.push(`${key} = ?`);
        values.push((data as any)[key]);
      }
    }

    if (fields.length === 0) return { changes: 0 };

    fields.push("updated_at = datetime('now')");
    values.push(id);

    const result = db.prepare(
      `UPDATE patients SET ${fields.join(', ')} WHERE id = ?`
    ).run(...values);

    return { changes: result.changes };
  },

  softDelete(id: number) {
    const db = getDatabase();
    const result = db.prepare(
      "UPDATE patients SET is_active = 0, updated_at = datetime('now') WHERE id = ?"
    ).run(id);
    return { changes: result.changes };
  },

  getAll() {
    const db = getDatabase();
    return db.prepare('SELECT id, first_name, last_name, phone_primary FROM patients WHERE is_active = 1 ORDER BY first_name, last_name').all() as Patient[];
  },
};
