import { getDatabase } from '../database/connection';

export interface ReportFilters {
  startDate: string;
  endDate: string;
  patientId?: number;
  granularity: 'daily' | 'weekly' | 'monthly' | 'yearly';
  category?: string;
}

export interface PeriodData {
  period: string;
  income: number;
  expenses: number;
  net_profit: number;
}

function getStrftimeFormat(granularity: string): string {
  switch (granularity) {
    case 'daily': return '%Y-%m-%d';
    case 'weekly': return '%Y-W%W';
    case 'monthly': return '%Y-%m';
    case 'yearly': return '%Y';
    default: return '%Y-%m';
  }
}

export const reportService = {
  getIncomeStatement(filters: ReportFilters) {
    const db = getDatabase();
    const fmt = getStrftimeFormat(filters.granularity);
    const params: any[] = [filters.startDate, filters.endDate];

    let patientFilter = '';
    if (filters.patientId) {
      patientFilter = ' AND patient_id = ?';
      params.push(filters.patientId);
    }

    const rows = db.prepare(`
      SELECT
        strftime('${fmt}', transaction_date) AS period,
        SUM(CASE WHEN type IN ('income','advance') THEN amount_paise ELSE 0 END) AS income,
        SUM(CASE WHEN type = 'expense' THEN amount_paise ELSE 0 END) AS expenses,
        SUM(CASE WHEN type = 'refund' THEN amount_paise ELSE 0 END) AS refunds
      FROM transactions
      WHERE transaction_date BETWEEN ? AND ?${patientFilter}
      GROUP BY period
      ORDER BY period
    `).all(...params) as any[];

    const periods = rows.map(r => ({
      period: r.period,
      income: r.income - r.refunds,
      expenses: r.expenses,
      net_profit: r.income - r.refunds - r.expenses,
    }));

    const totals = periods.reduce(
      (acc, p) => ({
        income: acc.income + p.income,
        expenses: acc.expenses + p.expenses,
        net_profit: acc.net_profit + p.net_profit,
      }),
      { income: 0, expenses: 0, net_profit: 0 }
    );

    return { periods, totals };
  },

  getBalanceSheet(asOfDate: string) {
    const db = getDatabase();

    // Cash = all income - all expenses - all refunds up to date
    const cash = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN type IN ('income','advance') THEN amount_paise ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN type IN ('expense','refund') THEN amount_paise ELSE 0 END), 0) as balance
      FROM transactions WHERE transaction_date <= ?
    `).get(asOfDate) as any;

    // Outstanding receivables
    const receivables = db.prepare(`
      SELECT COALESCE(SUM(i.total_paise), 0) -
        COALESCE((SELECT SUM(t.amount_paise) FROM transactions t WHERE t.invoice_id = i.id AND t.type = 'income'), 0) as total
      FROM invoices i
      WHERE i.status NOT IN ('cancelled', 'paid') AND i.invoice_date <= ?
    `).get(asOfDate) as any;

    // Advances received (liability - services not yet delivered)
    const advances = db.prepare(`
      SELECT COALESCE(SUM(amount_paise), 0) as total
      FROM transactions WHERE type = 'advance' AND transaction_date <= ?
    `).get(asOfDate) as any;

    return {
      assets: {
        cash: cash.balance,
        receivables: receivables.total,
        total: cash.balance + receivables.total,
      },
      liabilities: {
        advances: advances.total,
        total: advances.total,
      },
      equity: cash.balance + receivables.total - advances.total,
    };
  },

  getOutstandingReceivables(filters: { patientId?: number } = {}) {
    const db = getDatabase();
    let patientFilter = '';
    const params: any[] = [];

    if (filters.patientId) {
      patientFilter = ' AND i.patient_id = ?';
      params.push(filters.patientId);
    }

    return db.prepare(`
      SELECT
        i.id, i.invoice_number, i.invoice_date, i.total_paise,
        p.first_name || ' ' || p.last_name as patient_name,
        p.phone_primary as patient_phone,
        COALESCE(paid.total, 0) as paid_paise,
        i.total_paise - COALESCE(paid.total, 0) as outstanding_paise
      FROM invoices i
      JOIN patients p ON p.id = i.patient_id
      LEFT JOIN (
        SELECT invoice_id, SUM(amount_paise) as total
        FROM transactions WHERE type = 'income'
        GROUP BY invoice_id
      ) paid ON paid.invoice_id = i.id
      WHERE i.status NOT IN ('cancelled', 'paid')${patientFilter}
      HAVING outstanding_paise > 0
      ORDER BY i.invoice_date DESC
    `).all(...params);
  },

  getExpenseBreakdown(filters: ReportFilters) {
    const db = getDatabase();
    const params: any[] = [filters.startDate, filters.endDate];

    return db.prepare(`
      SELECT
        COALESCE(category, 'Uncategorized') as category,
        SUM(amount_paise) as total,
        COUNT(*) as count
      FROM transactions
      WHERE type = 'expense' AND transaction_date BETWEEN ? AND ?
      GROUP BY category
      ORDER BY total DESC
    `).all(...params);
  },

  getPatientLedger(patientId: number) {
    const db = getDatabase();
    return db.prepare(`
      SELECT
        t.transaction_date as date,
        t.type,
        COALESCE(t.category, '') as category,
        COALESCE(i.invoice_number, '') as reference,
        t.amount_paise,
        t.payment_method,
        t.notes
      FROM transactions t
      LEFT JOIN invoices i ON i.id = t.invoice_id
      WHERE t.patient_id = ?
      ORDER BY t.transaction_date ASC, t.created_at ASC
    `).all(patientId);
  },

  getDashboardStats() {
    const db = getDatabase();

    const today = new Date().toISOString().split('T')[0];
    const monthStart = today.substring(0, 7) + '-01';

    const todayAppts = db.prepare(`
      SELECT COUNT(*) as count FROM appointments
      WHERE date(appointment_date) = date('now')
        AND status NOT IN ('cancelled', 'no_show')
    `).get() as any;

    const monthIncome = db.prepare(`
      SELECT COALESCE(SUM(amount_paise), 0) as total
      FROM transactions WHERE type IN ('income','advance')
        AND transaction_date >= ?
    `).get(monthStart) as any;

    const monthExpenses = db.prepare(`
      SELECT COALESCE(SUM(amount_paise), 0) as total
      FROM transactions WHERE type = 'expense'
        AND transaction_date >= ?
    `).get(monthStart) as any;

    const totalOutstanding = db.prepare(`
      SELECT COALESCE(SUM(i.total_paise - COALESCE(paid.total, 0)), 0) as total
      FROM invoices i
      LEFT JOIN (
        SELECT invoice_id, SUM(amount_paise) as total
        FROM transactions WHERE type = 'income'
        GROUP BY invoice_id
      ) paid ON paid.invoice_id = i.id
      WHERE i.status NOT IN ('cancelled', 'paid')
    `).get() as any;

    const totalPatients = db.prepare(
      "SELECT COUNT(*) as count FROM patients WHERE is_active = 1"
    ).get() as any;

    return {
      todayAppointments: todayAppts.count,
      monthIncome: monthIncome.total,
      monthExpenses: monthExpenses.total,
      totalOutstanding: totalOutstanding.total,
      totalPatients: totalPatients.count,
    };
  },
};
