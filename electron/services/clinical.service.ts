import { getDatabase } from '../database/connection';
import { saveRow, localDate } from '../database/helpers';

const NOTE_FIELDS = ['patient_id', 'appointment_id', 'visit_date', 'chief_complaint', 'findings', 'radiograph_notes',
  'diagnosis', 'treatment_done', 'advice', 'bp', 'pulse', 'temperature', 'weight', 'follow_up_date'];

export const notesService = {
  listByPatient(patientId: number) {
    return getDatabase().prepare(
      'SELECT * FROM clinical_notes WHERE patient_id = ? ORDER BY visit_date DESC, id DESC'
    ).all(patientId);
  },

  save(data: Record<string, any>) {
    if (!data.id && !data.patient_id) throw new Error('patient_id is required');
    return { id: saveRow('clinical_notes', data, NOTE_FIELDS) };
  },

  delete(id: number) {
    return getDatabase().prepare('DELETE FROM clinical_notes WHERE id = ?').run(id);
  },

  /**
   * Recall list: follow-ups (from notes and prescriptions) falling between `pastDays` ago and
   * `aheadDays` from now, for patients who do not already have an upcoming appointment.
   */
  followUpsDue(aheadDays = 7, pastDays = 14) {
    const today = new Date();
    const from = localDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - pastDays));
    const to = localDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + aheadDays));
    return getDatabase().prepare(`
      SELECT f.patient_id, MIN(f.follow_up_date) AS follow_up_date, f.reason,
        p.first_name || ' ' || p.last_name AS patient_name, p.phone_primary AS patient_phone
      FROM (
        SELECT patient_id, follow_up_date, COALESCE(diagnosis, chief_complaint, 'Follow-up') AS reason
          FROM clinical_notes WHERE follow_up_date BETWEEN ? AND ?
        UNION ALL
        SELECT patient_id, follow_up_date, COALESCE(diagnosis, 'Follow-up') AS reason
          FROM prescriptions WHERE follow_up_date BETWEEN ? AND ?
      ) f
      JOIN patients p ON p.id = f.patient_id AND p.is_active = 1
      WHERE NOT EXISTS (
        SELECT 1 FROM appointments a
        WHERE a.patient_id = f.patient_id AND a.status IN ('scheduled','confirmed')
          AND a.appointment_date >= ?
      )
      GROUP BY f.patient_id
      ORDER BY follow_up_date
    `).all(from, to, from, to, new Date().toISOString());
  },
};

export const toothService = {
  getChart(patientId: number) {
    return getDatabase().prepare('SELECT * FROM tooth_chart WHERE patient_id = ? ORDER BY tooth_number').all(patientId);
  },

  setTooth(patientId: number, tooth: string, data: { condition: string; surfaces?: string; notes?: string }) {
    if (!data.condition) throw new Error('condition is required');
    getDatabase().prepare(`
      INSERT INTO tooth_chart (patient_id, tooth_number, condition, surfaces, notes)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(patient_id, tooth_number) DO UPDATE SET
        condition = excluded.condition, surfaces = excluded.surfaces,
        notes = excluded.notes, updated_at = datetime('now')
    `).run(patientId, String(tooth), data.condition, data.surfaces || null, data.notes || null);
    return { success: true };
  },

  clearTooth(patientId: number, tooth: string) {
    return getDatabase().prepare('DELETE FROM tooth_chart WHERE patient_id = ? AND tooth_number = ?').run(patientId, String(tooth));
  },
};
