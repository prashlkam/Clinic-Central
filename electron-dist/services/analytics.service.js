"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsService = void 0;
const connection_1 = require("../database/connection");
const helpers_1 = require("../database/helpers");
const clinical_service_1 = require("./clinical.service");
const lab_service_1 = require("./lab.service");
const inventory_service_1 = require("./inventory.service");
exports.analyticsService = {
    /** Procedure-wise billing: what was invoiced, how often and for how much. */
    procedureReport(range) {
        return (0, connection_1.getDatabase)().prepare(`
      SELECT COALESCE(t.name, ii.description) AS procedure_name,
        COALESCE(tt.name, 'Other') AS category,
        SUM(ii.quantity) AS quantity,
        COUNT(DISTINCT i.id) AS invoices,
        SUM(ii.total_paise) AS total_paise
      FROM invoice_items ii
      JOIN invoices i ON i.id = ii.invoice_id AND i.status != 'cancelled'
      LEFT JOIN treatments t ON t.id = ii.treatment_id
      LEFT JOIN treatment_trees tt ON tt.id = t.tree_id
      WHERE i.invoice_date BETWEEN ? AND ?
      GROUP BY procedure_name, category
      ORDER BY total_paise DESC
    `).all(range.startDate, range.endDate);
    },
    /** New vs returning patients per month, based on attended visits. */
    patientTrends(range) {
        const db = (0, connection_1.getDatabase)();
        const rows = db.prepare(`
      SELECT strftime('%Y-%m', a.appointment_date, 'localtime') AS period,
        COUNT(DISTINCT CASE WHEN first.first_visit = a.appointment_date THEN a.patient_id END) AS new_patients,
        COUNT(DISTINCT a.patient_id) AS visiting_patients,
        COUNT(*) AS visits
      FROM appointments a
      JOIN (
        SELECT patient_id, MIN(appointment_date) AS first_visit
        FROM appointments WHERE status NOT IN ('cancelled','no_show') GROUP BY patient_id
      ) first ON first.patient_id = a.patient_id
      WHERE a.status NOT IN ('cancelled','no_show')
        AND date(a.appointment_date, 'localtime') BETWEEN ? AND ?
      GROUP BY period ORDER BY period
    `).all(range.startDate, range.endDate);
        const registered = db.prepare("SELECT COUNT(*) AS c FROM patients WHERE is_active = 1 AND date(created_at, 'localtime') BETWEEN ? AND ?").get(range.startDate, range.endDate);
        return {
            periods: rows.map(r => ({ ...r, returning_patients: r.visiting_patients - r.new_patients })),
            registered: registered.c,
        };
    },
    /** Money actually received, split by payment method (advance adjustments are not new money). */
    collections(range) {
        const db = (0, connection_1.getDatabase)();
        const byMethod = db.prepare(`
      SELECT payment_method, COUNT(*) AS count, SUM(amount_paise) AS total_paise
      FROM transactions
      WHERE type IN ('income','advance') AND payment_method != 'advance'
        AND transaction_date BETWEEN ? AND ?
      GROUP BY payment_method ORDER BY total_paise DESC
    `).all(range.startDate, range.endDate);
        const byDay = db.prepare(`
      SELECT substr(transaction_date, 1, 10) AS day, COUNT(*) AS count, SUM(amount_paise) AS total_paise
      FROM transactions
      WHERE type IN ('income','advance') AND payment_method != 'advance'
        AND transaction_date BETWEEN ? AND ?
      GROUP BY day ORDER BY day DESC
    `).all(range.startDate, range.endDate);
        return { byMethod, byDay };
    },
    appointmentStats(range) {
        return (0, connection_1.getDatabase)().prepare(`
      SELECT status, COUNT(*) AS count FROM appointments
      WHERE date(appointment_date, 'localtime') BETWEEN ? AND ?
      GROUP BY status ORDER BY count DESC
    `).all(range.startDate, range.endDate);
    },
    /** Everything the dashboard needs beyond the financial stats, in one round trip. */
    dashboardExtras() {
        const db = (0, connection_1.getDatabase)();
        const [start, end] = (0, helpers_1.localDayRange)();
        const queue = db.prepare(`
      SELECT
        SUM(CASE WHEN checked_in_at IS NOT NULL AND status IN ('scheduled','confirmed') THEN 1 ELSE 0 END) AS waiting,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed
      FROM appointments WHERE appointment_date >= ? AND appointment_date < ?
    `).get(start, end);
        const birthdays = db.prepare(`
      SELECT id, first_name || ' ' || last_name AS patient_name, phone_primary AS patient_phone, date_of_birth
      FROM patients WHERE is_active = 1 AND date_of_birth IS NOT NULL AND strftime('%m-%d', date_of_birth) = ?
      ORDER BY first_name
    `).all((0, helpers_1.localDate)().substring(5));
        return {
            queue: { waiting: queue?.waiting || 0, in_progress: queue?.in_progress || 0, completed: queue?.completed || 0 },
            followUps: clinical_service_1.notesService.followUpsDue(),
            labDue: lab_service_1.labService.dueSoon(),
            lowStock: inventory_service_1.inventoryService.lowStock(),
            birthdays,
        };
    },
};
//# sourceMappingURL=analytics.service.js.map