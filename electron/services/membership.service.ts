import { getDatabase } from '../database/connection';
import { saveRow, localDate } from '../database/helpers';

export const membershipService = {
  list() {
    return getDatabase().prepare(`
      SELECT m.*, (SELECT COUNT(*) FROM patients p WHERE p.membership_plan_id = m.id AND p.is_active = 1
        AND (p.membership_expiry IS NULL OR p.membership_expiry >= ?)) AS member_count
      FROM membership_plans m WHERE m.is_active = 1 ORDER BY m.name
    `).all(localDate());
  },
  save(data: Record<string, any>) {
    if (!data.id && !data.name?.trim()) throw new Error('Plan name is required');
    const pct = Number(data.discount_percent);
    if (data.discount_percent !== undefined && (!Number.isFinite(pct) || pct < 0 || pct > 100)) {
      throw new Error('Discount must be between 0 and 100 percent');
    }
    return { id: saveRow('membership_plans', data, ['name', 'description', 'discount_percent', 'price_paise', 'validity_months', 'is_active'], false) };
  },
  delete(id: number) {
    return getDatabase().prepare('UPDATE membership_plans SET is_active = 0 WHERE id = ?').run(id);
  },

  /** The patient's membership if it exists and has not expired, else null. */
  activeForPatient(patientId: number) {
    return getDatabase().prepare(`
      SELECT m.id, m.name, m.discount_percent, p.membership_expiry
      FROM patients p JOIN membership_plans m ON m.id = p.membership_plan_id
      WHERE p.id = ? AND m.is_active = 1 AND (p.membership_expiry IS NULL OR p.membership_expiry >= ?)
    `).get(patientId, localDate()) || null;
  },
};
