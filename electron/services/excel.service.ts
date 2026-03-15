import ExcelJS from 'exceljs';
import { getDatabase } from '../database/connection';
import { formatINR } from '../utils/currency';

export const excelService = {
  async exportPatients(filePath: string) {
    const db = getDatabase();
    const patients = db.prepare(`
      SELECT id, first_name, last_name, phone_primary, phone_secondary, email,
        date_of_birth, gender, address_line1, city, state, pincode, medical_history, notes, created_at
      FROM patients WHERE is_active = 1 ORDER BY first_name, last_name
    `).all() as any[];

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Clinic Central';
    const sheet = workbook.addWorksheet('Patients');

    sheet.columns = [
      { header: 'ID', key: 'id', width: 6 },
      { header: 'First Name', key: 'first_name', width: 18 },
      { header: 'Last Name', key: 'last_name', width: 18 },
      { header: 'Phone', key: 'phone_primary', width: 15 },
      { header: 'Alt Phone', key: 'phone_secondary', width: 15 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'DOB', key: 'date_of_birth', width: 12 },
      { header: 'Gender', key: 'gender', width: 8 },
      { header: 'Address', key: 'address_line1', width: 30 },
      { header: 'City', key: 'city', width: 15 },
      { header: 'State', key: 'state', width: 15 },
      { header: 'Pincode', key: 'pincode', width: 10 },
      { header: 'Medical History', key: 'medical_history', width: 30 },
      { header: 'Notes', key: 'notes', width: 20 },
      { header: 'Registered', key: 'created_at', width: 20 },
    ];

    styleHeaderRow(sheet);
    patients.forEach(p => sheet.addRow(p));

    await workbook.xlsx.writeFile(filePath);
    return { count: patients.length };
  },

  async exportAppointments(filePath: string, filters: { startDate?: string; endDate?: string; patientId?: number } = {}) {
    const db = getDatabase();
    let where = 'WHERE 1=1';
    const params: any[] = [];

    if (filters.startDate) { where += ' AND a.appointment_date >= ?'; params.push(filters.startDate); }
    if (filters.endDate) { where += ' AND a.appointment_date <= ?'; params.push(filters.endDate); }
    if (filters.patientId) { where += ' AND a.patient_id = ?'; params.push(filters.patientId); }

    const rows = db.prepare(`
      SELECT a.appointment_date, p.first_name || ' ' || p.last_name as patient_name,
        p.phone_primary, t.name as treatment, a.status, a.duration_minutes, a.notes
      FROM appointments a
      LEFT JOIN patients p ON p.id = a.patient_id
      LEFT JOIN treatments t ON t.id = a.treatment_id
      ${where}
      ORDER BY a.appointment_date DESC
    `).all(...params) as any[];

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Appointments');

    sheet.columns = [
      { header: 'Date & Time', key: 'appointment_date', width: 20 },
      { header: 'Patient', key: 'patient_name', width: 25 },
      { header: 'Phone', key: 'phone_primary', width: 15 },
      { header: 'Treatment', key: 'treatment', width: 25 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Duration (min)', key: 'duration_minutes', width: 14 },
      { header: 'Notes', key: 'notes', width: 30 },
    ];

    styleHeaderRow(sheet);
    rows.forEach(r => sheet.addRow(r));

    await workbook.xlsx.writeFile(filePath);
    return { count: rows.length };
  },

  async exportTransactions(filePath: string, filters: { startDate?: string; endDate?: string; type?: string; patientId?: number } = {}) {
    const db = getDatabase();
    let where = 'WHERE 1=1';
    const params: any[] = [];

    if (filters.startDate) { where += ' AND t.transaction_date >= ?'; params.push(filters.startDate); }
    if (filters.endDate) { where += ' AND t.transaction_date <= ?'; params.push(filters.endDate); }
    if (filters.type) { where += ' AND t.type = ?'; params.push(filters.type); }
    if (filters.patientId) { where += ' AND t.patient_id = ?'; params.push(filters.patientId); }

    const rows = db.prepare(`
      SELECT t.transaction_date, t.type, t.category,
        p.first_name || ' ' || p.last_name as patient_name,
        t.amount_paise, t.payment_method, t.reference_number, t.notes,
        i.invoice_number
      FROM transactions t
      LEFT JOIN patients p ON p.id = t.patient_id
      LEFT JOIN invoices i ON i.id = t.invoice_id
      ${where}
      ORDER BY t.transaction_date DESC
    `).all(...params) as any[];

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Transactions');

    sheet.columns = [
      { header: 'Date', key: 'transaction_date', width: 15 },
      { header: 'Type', key: 'type', width: 12 },
      { header: 'Category', key: 'category', width: 18 },
      { header: 'Patient', key: 'patient_name', width: 25 },
      { header: 'Amount (₹)', key: 'amount_rupees', width: 15 },
      { header: 'Payment Method', key: 'payment_method', width: 15 },
      { header: 'Reference', key: 'reference_number', width: 18 },
      { header: 'Invoice', key: 'invoice_number', width: 18 },
      { header: 'Notes', key: 'notes', width: 25 },
    ];

    styleHeaderRow(sheet);
    rows.forEach(r => {
      sheet.addRow({ ...r, amount_rupees: r.amount_paise / 100 });
    });

    // Format amount column
    sheet.getColumn('amount_rupees').numFmt = '₹#,##0.00';

    await workbook.xlsx.writeFile(filePath);
    return { count: rows.length };
  },

  async exportInvoices(filePath: string, filters: { startDate?: string; endDate?: string; patientId?: number } = {}) {
    const db = getDatabase();
    let where = 'WHERE 1=1';
    const params: any[] = [];

    if (filters.startDate) { where += ' AND i.invoice_date >= ?'; params.push(filters.startDate); }
    if (filters.endDate) { where += ' AND i.invoice_date <= ?'; params.push(filters.endDate); }
    if (filters.patientId) { where += ' AND i.patient_id = ?'; params.push(filters.patientId); }

    const invoices = db.prepare(`
      SELECT i.invoice_number, i.invoice_date, p.first_name || ' ' || p.last_name as patient_name,
        i.subtotal_paise, i.discount_paise, i.tax_paise, i.total_paise, i.status
      FROM invoices i
      LEFT JOIN patients p ON p.id = i.patient_id
      ${where}
      ORDER BY i.invoice_date DESC
    `).all(...params) as any[];

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Invoices');

    sheet.columns = [
      { header: 'Invoice #', key: 'invoice_number', width: 18 },
      { header: 'Date', key: 'invoice_date', width: 15 },
      { header: 'Patient', key: 'patient_name', width: 25 },
      { header: 'Subtotal (₹)', key: 'subtotal', width: 14 },
      { header: 'Discount (₹)', key: 'discount', width: 14 },
      { header: 'Tax (₹)', key: 'tax', width: 12 },
      { header: 'Total (₹)', key: 'total', width: 14 },
      { header: 'Status', key: 'status', width: 12 },
    ];

    styleHeaderRow(sheet);
    invoices.forEach(r => {
      sheet.addRow({
        ...r,
        subtotal: r.subtotal_paise / 100,
        discount: r.discount_paise / 100,
        tax: r.tax_paise / 100,
        total: r.total_paise / 100,
      });
    });

    ['subtotal', 'discount', 'tax', 'total'].forEach(col => {
      sheet.getColumn(col).numFmt = '₹#,##0.00';
    });

    await workbook.xlsx.writeFile(filePath);
    return { count: invoices.length };
  },

  async exportReport(filePath: string, reportData: any) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Income Statement');

    sheet.columns = [
      { header: 'Period', key: 'period', width: 18 },
      { header: 'Income (₹)', key: 'income', width: 16 },
      { header: 'Expenses (₹)', key: 'expenses', width: 16 },
      { header: 'Net Profit (₹)', key: 'net_profit', width: 16 },
    ];

    styleHeaderRow(sheet);

    if (reportData.periods) {
      reportData.periods.forEach((p: any) => {
        sheet.addRow({
          period: p.period,
          income: p.income / 100,
          expenses: p.expenses / 100,
          net_profit: p.net_profit / 100,
        });
      });

      // Totals row
      const totalRow = sheet.addRow({
        period: 'TOTAL',
        income: reportData.totals.income / 100,
        expenses: reportData.totals.expenses / 100,
        net_profit: reportData.totals.net_profit / 100,
      });
      totalRow.font = { bold: true };
    }

    ['income', 'expenses', 'net_profit'].forEach(col => {
      sheet.getColumn(col).numFmt = '₹#,##0.00';
    });

    await workbook.xlsx.writeFile(filePath);
  },

  async importPatients(filePath: string) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const sheet = workbook.worksheets[0];
    if (!sheet) throw new Error('No worksheet found');

    const headers: string[] = [];
    sheet.getRow(1).eachCell((cell) => {
      headers.push(String(cell.value || '').toLowerCase().trim());
    });

    const db = getDatabase();
    const insert = db.prepare(`
      INSERT INTO patients (first_name, last_name, phone_primary, phone_secondary, email,
        date_of_birth, gender, address_line1, address_line2, city, state, pincode, medical_history, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let imported = 0;
    const errors: { row: number; error: string }[] = [];

    const transaction = db.transaction(() => {
      sheet.eachRow((row, rowNum) => {
        if (rowNum === 1) return; // skip header

        try {
          const getValue = (keys: string[]) => {
            for (const key of keys) {
              const idx = headers.indexOf(key);
              if (idx >= 0) return String(row.getCell(idx + 1).value || '').trim();
            }
            return '';
          };

          const firstName = getValue(['first_name', 'first name', 'firstname', 'name']);
          const lastName = getValue(['last_name', 'last name', 'lastname', 'surname']);
          const phone = getValue(['phone_primary', 'phone', 'mobile', 'contact']);

          if (!firstName || !phone) {
            errors.push({ row: rowNum, error: 'Missing first name or phone' });
            return;
          }

          insert.run(
            firstName, lastName || '', phone,
            getValue(['phone_secondary', 'alt phone', 'phone2']) || null,
            getValue(['email']) || null,
            getValue(['date_of_birth', 'dob', 'birth date']) || null,
            getValue(['gender', 'sex']) || null,
            getValue(['address_line1', 'address', 'street']) || null,
            getValue(['address_line2', 'address2']) || null,
            getValue(['city']) || null,
            getValue(['state']) || null,
            getValue(['pincode', 'zip', 'postal code']) || null,
            getValue(['medical_history', 'medical history']) || null,
            getValue(['notes']) || null
          );
          imported++;
        } catch (e: any) {
          errors.push({ row: rowNum, error: e.message });
        }
      });
    });

    transaction();

    return { imported, errors, total: (sheet.rowCount || 1) - 1 };
  },

  async importTransactions(filePath: string) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const sheet = workbook.worksheets[0];
    if (!sheet) throw new Error('No worksheet found');

    const headers: string[] = [];
    sheet.getRow(1).eachCell((cell) => {
      headers.push(String(cell.value || '').toLowerCase().trim());
    });

    const db = getDatabase();
    const insert = db.prepare(`
      INSERT INTO transactions (type, category, amount_paise, payment_method, transaction_date, reference_number, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    let imported = 0;
    const errors: { row: number; error: string }[] = [];

    const transaction = db.transaction(() => {
      sheet.eachRow((row, rowNum) => {
        if (rowNum === 1) return;

        try {
          const getValue = (keys: string[]) => {
            for (const key of keys) {
              const idx = headers.indexOf(key);
              if (idx >= 0) return String(row.getCell(idx + 1).value || '').trim();
            }
            return '';
          };

          const type = getValue(['type']) || 'expense';
          const amountStr = getValue(['amount', 'amount (₹)', 'amount_rupees']);
          const date = getValue(['date', 'transaction_date', 'transaction date']);

          if (!amountStr || !date) {
            errors.push({ row: rowNum, error: 'Missing amount or date' });
            return;
          }

          const amount = Math.round(parseFloat(amountStr) * 100);

          insert.run(
            type,
            getValue(['category']) || null,
            amount,
            getValue(['payment_method', 'payment method', 'method']) || 'cash',
            date,
            getValue(['reference_number', 'reference', 'ref']) || null,
            getValue(['notes']) || null
          );
          imported++;
        } catch (e: any) {
          errors.push({ row: rowNum, error: e.message });
        }
      });
    });

    transaction();

    return { imported, errors, total: (sheet.rowCount || 1) - 1 };
  },
};

function styleHeaderRow(sheet: ExcelJS.Worksheet) {
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0891B2' },
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 24;
}
