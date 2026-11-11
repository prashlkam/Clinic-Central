import { getDatabase } from '../database/connection';
import { saveRow } from '../database/helpers';

export const consentService = {
  listTemplates() {
    return getDatabase().prepare('SELECT * FROM consent_templates WHERE is_active = 1 ORDER BY name').all();
  },
  saveTemplate(data: Record<string, any>) {
    if (!data.id && (!data.name?.trim() || !data.body?.trim())) throw new Error('Template name and text are required');
    return { id: saveRow('consent_templates', data, ['name', 'body', 'is_active'], false) };
  },
  deleteTemplate(id: number) {
    return getDatabase().prepare('UPDATE consent_templates SET is_active = 0 WHERE id = ?').run(id);
  },

  listByPatient(patientId: number) {
    return getDatabase().prepare('SELECT * FROM patient_consents WHERE patient_id = ? ORDER BY created_at DESC, id DESC').all(patientId);
  },

  create(data: { patient_id: number; template_id?: number; title: string; procedure_name?: string; body: string }) {
    if (!data.patient_id || !data.title?.trim() || !data.body?.trim()) throw new Error('Patient, title and consent text are required');
    return { id: saveRow('patient_consents', data, ['patient_id', 'template_id', 'title', 'procedure_name', 'body'], false) };
  },

  /** Attach a signature. A signed consent is a record and cannot be re-signed or edited. */
  sign(id: number, signedBy: string, signatureData: string) {
    const db = getDatabase();
    const row = db.prepare('SELECT signed_at FROM patient_consents WHERE id = ?').get(id) as any;
    if (!row) throw new Error('Consent not found');
    if (row.signed_at) throw new Error('This consent has already been signed');
    if (!signedBy?.trim()) throw new Error('Name of the person signing is required');
    if (!signatureData?.startsWith('data:image/')) throw new Error('Signature is missing');
    db.prepare('UPDATE patient_consents SET signed_by = ?, signature_data = ?, signed_at = ? WHERE id = ?')
      .run(signedBy.trim(), signatureData, new Date().toISOString(), id);
    return { success: true };
  },

  delete(id: number) {
    return getDatabase().prepare('DELETE FROM patient_consents WHERE id = ?').run(id);
  },
};
