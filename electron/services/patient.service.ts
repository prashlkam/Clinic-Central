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
  advance_balance_paise?: number;
}

export const patientService = {
  list(filters: PatientFilters = {}) {
    const db = getDatabase();
    const { search, page = 1, pageSize = 50, sortBy = 'first_name', sortOrder = 'asc' } = filters;

    const allowedSorts = ['first_name', 'last_name', 'phone_primary', 'created_at', 'city'];
    const sort = allowedSorts.includes(sortBy) ? sortBy : 'first_name';
    const order = sortOrder === 'desc' ? 'DESC' : 'ASC';

    let where = 'WHERE p.is_active = 1';
    const params: any[] = [];

    if (search) {
      where += ` AND (p.first_name LIKE ? OR p.last_name LIKE ? OR p.phone_primary LIKE ? OR p.email LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    const countRow = db.prepare(`SELECT COUNT(*) as total FROM patients p ${where}`).get(...params) as any;
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
    `).all(...params) as Patient[];

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
      WHERE i.patient_id = ? AND i.status NOT IN ('cancelled', 'paid') AND t.type = 'income'
    `).get(id) as any;

    // Advance balance = direct advances + un-split overpayments - advances applied
    const advances = db.prepare(`
      SELECT COALESCE(SUM(amount_paise), 0) as total
      FROM transactions WHERE patient_id = ? AND type = 'advance'
    `).get(id) as any;
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
    `).get(id) as any;
    const advancesUsed = db.prepare(`
      SELECT COALESCE(SUM(amount_paise), 0) as total
      FROM transactions WHERE patient_id = ? AND type = 'income' AND category = 'Advance Adjustment'
    `).get(id) as any;

    return {
      ...patient,
      next_appointment: nextAppt?.appointment_date || null,
      next_treatment: nextAppt?.treatment_name || null,
      total_paid_paise: paid.total,
      outstanding_paise: invoiceTotal.total - paidAgainstInvoices.total,
      advance_balance_paise: advances.total + overpayments.total - advancesUsed.total,
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
