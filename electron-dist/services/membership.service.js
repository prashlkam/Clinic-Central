"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.membershipService = void 0;
const connection_1 = require("../database/connection");
const helpers_1 = require("../database/helpers");
exports.membershipService = {
    list() {
        return (0, connection_1.getDatabase)().prepare(`
      SELECT m.*, (SELECT COUNT(*) FROM patients p WHERE p.membership_plan_id = m.id AND p.is_active = 1
        AND (p.membership_expiry IS NULL OR p.membership_expiry >= ?)) AS member_count
      FROM membership_plans m WHERE m.is_active = 1 ORDER BY m.name
    `).all((0, helpers_1.localDate)());
    },
    save(data) {
        if (!data.id && !data.name?.trim())
            throw new Error('Plan name is required');
        const pct = Number(data.discount_percent);
        if (data.discount_percent !== undefined && (!Number.isFinite(pct) || pct < 0 || pct > 100)) {
            throw new Error('Discount must be between 0 and 100 percent');
        }
        return { id: (0, helpers_1.saveRow)('membership_plans', data, ['name', 'description', 'discount_percent', 'price_paise', 'validity_months', 'is_active'], false) };
    },
    delete(id) {
        return (0, connection_1.getDatabase)().prepare('UPDATE membership_plans SET is_active = 0 WHERE id = ?').run(id);
    },
    /** The patient's membership if it exists and has not expired, else null. */
    activeForPatient(patientId) {
        return (0, connection_1.getDatabase)().prepare(`
      SELECT m.id, m.name, m.discount_percent, p.membership_expiry
      FROM patients p JOIN membership_plans m ON m.id = p.membership_plan_id
      WHERE p.id = ? AND m.is_active = 1 AND (p.membership_expiry IS NULL OR p.membership_expiry >= ?)
    `).get(patientId, (0, helpers_1.localDate)()) || null;
    },
};
//# sourceMappingURL=membership.service.js.map