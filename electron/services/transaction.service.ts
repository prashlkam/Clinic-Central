import { getDatabase } from '../database/connection';

export interface Transaction {
  id: number;
  type: string;
  category: string | null;
  patient_id: number | null;
  invoice_id: number | null;
  appointment_id: number | null;
  amount_paise: number;
  payment_method: string;
  transaction_date: string;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
  patient_name?: string;
  invoice_number?: string;
}

export interface TransactionFilters {
  search?: string;
  type?: string;
  patientId?: number;
  startDate?: string;
  endDate?: string;
  paymentMethod?: string;
  category?: string;
  page?: number;
  pageSize?: number;
}

export const transactionService = {
  list(filters: TransactionFilters = {}) {
    const db = getDatabase();
    const { search, type, patientId, startDate, endDate, paymentMethod, category, page = 1, pageSize = 50 } = filters;

    let where = 'WHERE 1=1';
    const params: any[] = [];

    if (search) {
      where += ` AND (p.first_name LIKE ? OR p.last_name LIKE ? OR t.reference_number LIKE ? OR t.notes LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }
    if (type && type !== 'all') {
      where += ' AND t.type = ?';
      params.push(type);
    }
    if (patientId) {
      where += ' AND t.patient_id = ?';
      params.push(patientId);
    }
    if (startDate) {
      where += ' AND t.transaction_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      where += ' AND t.transaction_date <= ?';
      params.push(endDate);
    }
    if (paymentMethod) {
      where += ' AND t.payment_method = ?';
      params.push(paymentMethod);
    }
    if (category) {
      where += ' AND t.category = ?';
      params.push(category);
    }

    const countRow = db.prepare(`
      SELECT COUNT(*) as total FROM transactions t
      LEFT JOIN patients p ON p.id = t.patient_id
      ${where}
    `).get(...params) as any;

    const offset = (page - 1) * pageSize;
    params.push(pageSize, offset);

    const rows = db.prepare(`
      SELECT t.*,
        p.first_name || ' ' || p.last_name as patient_name,
        i.invoice_number
      FROM transactions t
      LEFT JOIN patients p ON p.id = t.patient_id
      LEFT JOIN invoices i ON i.id = t.invoice_id
      ${where}
      ORDER BY t.transaction_date DESC, t.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params) as Transaction[];

    return { data: rows, total: countRow.total, page, pageSize };
  },

  create(data: {
    type: string; category?: string; patient_id?: number; invoice_id?: number;
    appointment_id?: number; amount_paise: number; payment_method?: string;
    transaction_date: string; reference_number?: string; notes?: string;
  }) {
    const db = getDatabase();

    const run = db.transaction(() => {
      // Detect overpayment on invoice — auto-split into income + advance
      let advancePaise = 0;
      if (data.invoice_id && data.type === 'income' && data.patient_id) {
        const invoice = db.prepare('SELECT total_paise FROM invoices WHERE id = ?').get(data.invoice_id) as any;
        const paid = db.prepare(
          "SELECT COALESCE(SUM(amount_paise), 0) as total FROM transactions WHERE invoice_id = ? AND type = 'income'"
        ).get(data.invoice_id) as any;
        if (invoice) {
          const balance = invoice.total_paise - paid.total;
          if (balance > 0 && data.amount_paise > balance) {
            advancePaise = data.amount_paise - balance;
            data.amount_paise = balance;
          }
        }
      }

      const result = db.prepare(`
        INSERT INTO transactions (type, category, patient_id, invoice_id, appointment_id,
          amount_paise, payment_method, transaction_date, reference_number, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.type, data.category || null, data.patient_id || null,
        data.invoice_id || null, data.appointment_id || null,
        data.amount_paise, data.payment_method || 'cash',
        data.transaction_date, data.reference_number || null, data.notes || null
      );

      // Auto-update invoice status if payment is against an invoice
      if (data.invoice_id && data.type === 'income') {
        this.updateInvoiceStatus(data.invoice_id);
      }

      // Create advance transaction for the excess amount
      if (advancePaise > 0) {
        db.prepare(`
          INSERT INTO transactions (type, category, patient_id, invoice_id, appointment_id,
            amount_paise, payment_method, transaction_date, reference_number, notes)
          VALUES ('advance', 'Overpayment Advance', ?, NULL, NULL, ?, ?, ?, ?, ?)
        `).run(
          data.patient_id, advancePaise, data.payment_method || 'cash',
          data.transaction_date, data.reference_number || null,
          `Advance from overpayment on invoice`
        );
      }

      return { id: result.lastInsertRowid, advance_created: advancePaise };
    });

    return run();
  },

  updateInvoiceStatus(invoiceId: number) {
    const db = getDatabase();
    const invoice = db.prepare('SELECT total_paise FROM invoices WHERE id = ?').get(invoiceId) as any;
    if (!invoice) return;

    const paid = db.prepare(
      "SELECT COALESCE(SUM(amount_paise), 0) as total FROM transactions WHERE invoice_id = ? AND type = 'income'"
    ).get(invoiceId) as any;

    let status = 'sent';
    if (paid.total >= invoice.total_paise) {
      status = 'paid';
    } else if (paid.total > 0) {
      status = 'partial';
    }

    db.prepare("UPDATE invoices SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, invoiceId);
  },

  delete(id: number) {
    const db = getDatabase();
    return db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
  },

  getPatientAdvanceBalance(patientId: number): number {
    const db = getDatabase();

    // Direct advance deposits
    const advances = db.prepare(`
      SELECT COALESCE(SUM(amount_paise), 0) as total
      FROM transactions WHERE patient_id = ? AND type = 'advance'
    `).get(patientId) as any;

    // Overpayments on invoices that weren't split into advance transactions
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
    `).get(patientId) as any;

    // Advance adjustments already applied to invoices
    const used = db.prepare(`
      SELECT COALESCE(SUM(amount_paise), 0) as total
      FROM transactions WHERE patient_id = ? AND type = 'income' AND category = 'Advance Adjustment'
    `).get(patientId) as any;

    return advances.total + overpayments.total - used.total;
  },

  applyAdvanceToInvoice(data: { patient_id: number; invoice_id: number; amount_paise: number; transaction_date: string }) {
    const db = getDatabase();

    const run = db.transaction(() => {
      // Verify advance balance is sufficient
      const balance = this.getPatientAdvanceBalance(data.patient_id);
      if (data.amount_paise > balance) {
        throw new Error(`Insufficient advance balance. Available: ${balance}, Requested: ${data.amount_paise}`);
      }

      // Verify invoice balance
      const invoice = db.prepare('SELECT total_paise, patient_id FROM invoices WHERE id = ?').get(data.invoice_id) as any;
      if (!invoice) throw new Error('Invoice not found');
      if (invoice.patient_id !== data.patient_id) throw new Error('Invoice does not belong to this patient');

      const paid = db.prepare(
        "SELECT COALESCE(SUM(amount_paise), 0) as total FROM transactions WHERE invoice_id = ? AND type = 'income'"
      ).get(data.invoice_id) as any;
      const invoiceBalance = invoice.total_paise - paid.total;

      if (invoiceBalance <= 0) throw new Error('Invoice is already fully paid');

      const applyAmount = Math.min(data.amount_paise, invoiceBalance);

      // Record as income against the invoice
      db.prepare(`
        INSERT INTO transactions (type, category, patient_id, invoice_id, amount_paise,
          payment_method, transaction_date, notes)
        VALUES ('income', 'Advance Adjustment', ?, ?, ?, 'advance', ?, 'Applied from advance balance')
      `).run(data.patient_id, data.invoice_id, applyAmount, data.transaction_date);

      this.updateInvoiceStatus(data.invoice_id);

      return { applied: applyAmount };
    });

    return run();
  },

  getExpenseCategories() {
    const db = getDatabase();
    return db.prepare('SELECT * FROM expense_categories ORDER BY name').all();
  },

  createExpenseCategory(name: string) {
    const db = getDatabase();
    return db.prepare('INSERT OR IGNORE INTO expense_categories (name) VALUES (?)').run(name);
  },
};
