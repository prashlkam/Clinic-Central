"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transactionService = void 0;
const connection_1 = require("../database/connection");
exports.transactionService = {
    list(filters = {}) {
        const db = (0, connection_1.getDatabase)();
        const { search, type, patientId, startDate, endDate, paymentMethod, category, page = 1, pageSize = 50 } = filters;
        let where = 'WHERE 1=1';
        const params = [];
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
    `).get(...params);
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
    `).all(...params);
        return { data: rows, total: countRow.total, page, pageSize };
    },
    create(data) {
        const db = (0, connection_1.getDatabase)();
        const result = db.prepare(`
      INSERT INTO transactions (type, category, patient_id, invoice_id, appointment_id,
        amount_paise, payment_method, transaction_date, reference_number, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(data.type, data.category || null, data.patient_id || null, data.invoice_id || null, data.appointment_id || null, data.amount_paise, data.payment_method || 'cash', data.transaction_date, data.reference_number || null, data.notes || null);
        // Auto-update invoice status if payment is against an invoice
        if (data.invoice_id && data.type === 'income') {
            this.updateInvoiceStatus(data.invoice_id);
        }
        return { id: result.lastInsertRowid };
    },
    updateInvoiceStatus(invoiceId) {
        const db = (0, connection_1.getDatabase)();
        const invoice = db.prepare('SELECT total_paise FROM invoices WHERE id = ?').get(invoiceId);
        if (!invoice)
            return;
        const paid = db.prepare("SELECT COALESCE(SUM(amount_paise), 0) as total FROM transactions WHERE invoice_id = ? AND type = 'income'").get(invoiceId);
        let status = 'sent';
        if (paid.total >= invoice.total_paise) {
            status = 'paid';
        }
        else if (paid.total > 0) {
            status = 'partial';
        }
        db.prepare("UPDATE invoices SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, invoiceId);
    },
    delete(id) {
        const db = (0, connection_1.getDatabase)();
        return db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
    },
    getExpenseCategories() {
        const db = (0, connection_1.getDatabase)();
        return db.prepare('SELECT * FROM expense_categories ORDER BY name').all();
    },
    createExpenseCategory(name) {
        const db = (0, connection_1.getDatabase)();
        return db.prepare('INSERT OR IGNORE INTO expense_categories (name) VALUES (?)').run(name);
    },
};
//# sourceMappingURL=transaction.service.js.map