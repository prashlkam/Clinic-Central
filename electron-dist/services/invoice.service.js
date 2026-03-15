"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invoiceService = void 0;
const connection_1 = require("../database/connection");
exports.invoiceService = {
    list(filters = {}) {
        const db = (0, connection_1.getDatabase)();
        const { search, status, patientId, startDate, endDate, page = 1, pageSize = 50 } = filters;
        let where = 'WHERE 1=1';
        const params = [];
        if (search) {
            where += ` AND (i.invoice_number LIKE ? OR p.first_name LIKE ? OR p.last_name LIKE ?)`;
            const s = `%${search}%`;
            params.push(s, s, s);
        }
        if (status && status !== 'all') {
            where += ' AND i.status = ?';
            params.push(status);
        }
        if (patientId) {
            where += ' AND i.patient_id = ?';
            params.push(patientId);
        }
        if (startDate) {
            where += ' AND i.invoice_date >= ?';
            params.push(startDate);
        }
        if (endDate) {
            where += ' AND i.invoice_date <= ?';
            params.push(endDate);
        }
        const countRow = db.prepare(`
      SELECT COUNT(*) as total FROM invoices i
      LEFT JOIN patients p ON p.id = i.patient_id
      ${where}
    `).get(...params);
        const offset = (page - 1) * pageSize;
        params.push(pageSize, offset);
        const rows = db.prepare(`
      SELECT i.*, p.first_name || ' ' || p.last_name as patient_name
      FROM invoices i
      LEFT JOIN patients p ON p.id = i.patient_id
      ${where}
      ORDER BY i.invoice_date DESC
      LIMIT ? OFFSET ?
    `).all(...params);
        return { data: rows, total: countRow.total, page, pageSize };
    },
    getById(id) {
        const db = (0, connection_1.getDatabase)();
        const invoice = db.prepare(`
      SELECT i.*, p.first_name || ' ' || p.last_name as patient_name,
        p.phone_primary as patient_phone, p.address_line1, p.city
      FROM invoices i
      LEFT JOIN patients p ON p.id = i.patient_id
      WHERE i.id = ?
    `).get(id);
        if (!invoice)
            return null;
        const items = db.prepare(`
      SELECT ii.*, t.name as treatment_name
      FROM invoice_items ii
      LEFT JOIN treatments t ON t.id = ii.treatment_id
      WHERE ii.invoice_id = ?
      ORDER BY ii.sort_order
    `).all(id);
        // Payments made against this invoice
        const payments = db.prepare(`
      SELECT * FROM transactions
      WHERE invoice_id = ? AND type = 'income'
      ORDER BY transaction_date
    `).all(id);
        const paidPaise = payments.reduce((sum, p) => sum + p.amount_paise, 0);
        return { ...invoice, items, payments, paid_paise: paidPaise, balance_paise: invoice.total_paise - paidPaise };
    },
    create(data) {
        const db = (0, connection_1.getDatabase)();
        // Generate invoice number
        const settings = db.prepare("SELECT value FROM settings WHERE key = 'invoice_prefix'").get();
        const counter = db.prepare("SELECT value FROM settings WHERE key = 'invoice_counter'").get();
        const prefix = settings?.value || 'INV';
        const nextNum = parseInt(counter?.value || '0', 10) + 1;
        const year = new Date().getFullYear();
        const invoiceNumber = `${prefix}-${year}-${String(nextNum).padStart(4, '0')}`;
        const subtotal = data.items.reduce((sum, item) => sum + item.total_paise, 0);
        const discount = data.discount_paise || 0;
        const tax = data.tax_paise || 0;
        const total = subtotal - discount + tax;
        const insertInvoice = db.prepare(`
      INSERT INTO invoices (invoice_number, patient_id, appointment_id, invoice_date, subtotal_paise, discount_paise, tax_paise, total_paise, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        const insertItem = db.prepare(`
      INSERT INTO invoice_items (invoice_id, treatment_id, description, quantity, unit_price_paise, total_paise, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
        const updateCounter = db.prepare("UPDATE settings SET value = ? WHERE key = 'invoice_counter'");
        let invoiceId = 0;
        const transaction = db.transaction(() => {
            const result = insertInvoice.run(invoiceNumber, data.patient_id, data.appointment_id || null, data.invoice_date, subtotal, discount, tax, total, data.notes || null);
            invoiceId = Number(result.lastInsertRowid);
            for (let i = 0; i < data.items.length; i++) {
                const item = data.items[i];
                insertItem.run(invoiceId, item.treatment_id, item.description, item.quantity, item.unit_price_paise, item.total_paise, i);
            }
            updateCounter.run(String(nextNum));
        });
        transaction();
        return { id: invoiceId, invoice_number: invoiceNumber };
    },
    updateStatus(id, status) {
        const db = (0, connection_1.getDatabase)();
        return db.prepare("UPDATE invoices SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
    },
    delete(id) {
        const db = (0, connection_1.getDatabase)();
        db.prepare('DELETE FROM invoice_items WHERE invoice_id = ?').run(id);
        return db.prepare('DELETE FROM invoices WHERE id = ?').run(id);
    },
};
//# sourceMappingURL=invoice.service.js.map