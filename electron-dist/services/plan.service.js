"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.planService = void 0;
const connection_1 = require("../database/connection");
const helpers_1 = require("../database/helpers");
const invoice_service_1 = require("./invoice.service");
function refreshPlanStatus(planId) {
    const db = (0, connection_1.getDatabase)();
    const plan = db.prepare('SELECT status FROM treatment_plans WHERE id = ?').get(planId);
    if (!plan || plan.status === 'cancelled')
        return;
    const items = db.prepare("SELECT status FROM treatment_plan_items WHERE plan_id = ? AND status != 'cancelled'").all(planId);
    if (items.length === 0)
        return;
    let status = plan.status;
    if (items.every(i => i.status === 'completed'))
        status = 'completed';
    else if (items.some(i => i.status !== 'planned'))
        status = 'in_progress';
    else if (plan.status === 'completed' || plan.status === 'in_progress')
        status = 'accepted';
    if (status !== plan.status) {
        db.prepare("UPDATE treatment_plans SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, planId);
    }
}
exports.planService = {
    list(filters = {}) {
        let where = 'WHERE 1=1';
        const params = [];
        if (filters.patientId) {
            where += ' AND tp.patient_id = ?';
            params.push(filters.patientId);
        }
        if (filters.status && filters.status !== 'all') {
            where += ' AND tp.status = ?';
            params.push(filters.status);
        }
        return (0, connection_1.getDatabase)().prepare(`
      SELECT tp.*, p.first_name || ' ' || p.last_name AS patient_name,
        COALESCE((SELECT SUM(total_paise) FROM treatment_plan_items i WHERE i.plan_id = tp.id AND i.status != 'cancelled'), 0) AS subtotal_paise,
        (SELECT COUNT(*) FROM treatment_plan_items i WHERE i.plan_id = tp.id AND i.status != 'cancelled') AS item_count,
        (SELECT COUNT(*) FROM treatment_plan_items i WHERE i.plan_id = tp.id AND i.status = 'completed') AS completed_count
      FROM treatment_plans tp
      JOIN patients p ON p.id = tp.patient_id
      ${where}
      ORDER BY tp.created_at DESC, tp.id DESC
    `).all(...params);
    },
    getById(id) {
        const db = (0, connection_1.getDatabase)();
        const plan = db.prepare(`
      SELECT tp.*, p.first_name || ' ' || p.last_name AS patient_name, p.phone_primary AS patient_phone
      FROM treatment_plans tp JOIN patients p ON p.id = tp.patient_id WHERE tp.id = ?
    `).get(id);
        if (!plan)
            return null;
        const items = db.prepare(`
      SELECT i.*, inv.invoice_number
      FROM treatment_plan_items i LEFT JOIN invoices inv ON inv.id = i.invoice_id
      WHERE i.plan_id = ? ORDER BY i.stage, i.sort_order, i.id
    `).all(id);
        return { ...plan, items };
    },
    /** Create or update a plan together with its items (items not in the payload are removed). */
    save(data) {
        const db = (0, connection_1.getDatabase)();
        if (!data.title?.trim())
            throw new Error('Plan title is required');
        if (!data.items?.length)
            throw new Error('Add at least one procedure to the plan');
        return db.transaction(() => {
            const planId = (0, helpers_1.saveRow)('treatment_plans', data, ['patient_id', 'title', 'status', 'notes', 'discount_paise']);
            const keep = data.items.filter(i => i.id).map(i => i.id);
            const existing = db.prepare('SELECT id FROM treatment_plan_items WHERE plan_id = ?').all(planId);
            for (const row of existing) {
                if (!keep.includes(row.id))
                    db.prepare('DELETE FROM treatment_plan_items WHERE id = ?').run(row.id);
            }
            data.items.forEach((item, index) => {
                if (!item.description?.trim())
                    throw new Error('Every procedure needs a description');
                const quantity = Math.max(1, Math.round(item.quantity || 1));
                const status = item.status || 'planned';
                (0, helpers_1.saveRow)('treatment_plan_items', {
                    ...item,
                    plan_id: planId,
                    stage: item.stage || 1,
                    quantity,
                    total_paise: quantity * (item.unit_price_paise || 0),
                    status,
                    completed_date: status === 'completed' ? (item.completed_date || (0, helpers_1.localDate)()) : null,
                    sort_order: index,
                }, ['plan_id', 'stage', 'treatment_id', 'description', 'teeth', 'quantity', 'unit_price_paise',
                    'total_paise', 'status', 'completed_date', 'sort_order'], false);
            });
            refreshPlanStatus(planId);
            return { id: planId };
        })();
    },
    setStatus(id, status) {
        return (0, connection_1.getDatabase)().prepare("UPDATE treatment_plans SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
    },
    setItemStatus(itemId, status) {
        const db = (0, connection_1.getDatabase)();
        const item = db.prepare('SELECT plan_id FROM treatment_plan_items WHERE id = ?').get(itemId);
        if (!item)
            throw new Error('Plan item not found');
        db.prepare('UPDATE treatment_plan_items SET status = ?, completed_date = ? WHERE id = ?')
            .run(status, status === 'completed' ? (0, helpers_1.localDate)() : null, itemId);
        refreshPlanStatus(item.plan_id);
        return { success: true };
    },
    delete(id) {
        return (0, connection_1.getDatabase)().prepare('DELETE FROM treatment_plans WHERE id = ?').run(id);
    },
    /** Raise an invoice for the given (not yet invoiced) plan items. */
    createInvoice(planId, itemIds, applyPlanDiscount = false) {
        const db = (0, connection_1.getDatabase)();
        const plan = db.prepare('SELECT * FROM treatment_plans WHERE id = ?').get(planId);
        if (!plan)
            throw new Error('Treatment plan not found');
        const all = db.prepare('SELECT * FROM treatment_plan_items WHERE plan_id = ? ORDER BY stage, sort_order, id').all(planId);
        const items = all.filter(i => itemIds.includes(i.id) && !i.invoice_id && i.status !== 'cancelled');
        if (items.length === 0)
            throw new Error('No un-invoiced procedures selected');
        return db.transaction(() => {
            const subtotal = items.reduce((s, i) => s + i.total_paise, 0);
            const invoice = invoice_service_1.invoiceService.create({
                patient_id: plan.patient_id,
                invoice_date: (0, helpers_1.localDate)(),
                discount_paise: applyPlanDiscount ? Math.min(plan.discount_paise || 0, subtotal) : 0,
                notes: `Treatment plan: ${plan.title}`,
                items: items.map(i => ({
                    treatment_id: i.treatment_id,
                    description: i.teeth ? `${i.description} (Tooth ${i.teeth})` : i.description,
                    quantity: i.quantity,
                    unit_price_paise: i.unit_price_paise,
                    total_paise: i.total_paise,
                })),
            });
            const mark = db.prepare('UPDATE treatment_plan_items SET invoice_id = ? WHERE id = ?');
            for (const i of items)
                mark.run(invoice.id, i.id);
            return invoice;
        })();
    },
};
//# sourceMappingURL=plan.service.js.map