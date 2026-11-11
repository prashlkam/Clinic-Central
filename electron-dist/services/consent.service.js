"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.consentService = void 0;
const connection_1 = require("../database/connection");
const helpers_1 = require("../database/helpers");
exports.consentService = {
    listTemplates() {
        return (0, connection_1.getDatabase)().prepare('SELECT * FROM consent_templates WHERE is_active = 1 ORDER BY name').all();
    },
    saveTemplate(data) {
        if (!data.id && (!data.name?.trim() || !data.body?.trim()))
            throw new Error('Template name and text are required');
        return { id: (0, helpers_1.saveRow)('consent_templates', data, ['name', 'body', 'is_active'], false) };
    },
    deleteTemplate(id) {
        return (0, connection_1.getDatabase)().prepare('UPDATE consent_templates SET is_active = 0 WHERE id = ?').run(id);
    },
    listByPatient(patientId) {
        return (0, connection_1.getDatabase)().prepare('SELECT * FROM patient_consents WHERE patient_id = ? ORDER BY created_at DESC, id DESC').all(patientId);
    },
    create(data) {
        if (!data.patient_id || !data.title?.trim() || !data.body?.trim())
            throw new Error('Patient, title and consent text are required');
        return { id: (0, helpers_1.saveRow)('patient_consents', data, ['patient_id', 'template_id', 'title', 'procedure_name', 'body'], false) };
    },
    /** Attach a signature. A signed consent is a record and cannot be re-signed or edited. */
    sign(id, signedBy, signatureData) {
        const db = (0, connection_1.getDatabase)();
        const row = db.prepare('SELECT signed_at FROM patient_consents WHERE id = ?').get(id);
        if (!row)
            throw new Error('Consent not found');
        if (row.signed_at)
            throw new Error('This consent has already been signed');
        if (!signedBy?.trim())
            throw new Error('Name of the person signing is required');
        if (!signatureData?.startsWith('data:image/'))
            throw new Error('Signature is missing');
        db.prepare('UPDATE patient_consents SET signed_by = ?, signature_data = ?, signed_at = ? WHERE id = ?')
            .run(signedBy.trim(), signatureData, new Date().toISOString(), id);
        return { success: true };
    },
    delete(id) {
        return (0, connection_1.getDatabase)().prepare('DELETE FROM patient_consents WHERE id = ?').run(id);
    },
};
//# sourceMappingURL=consent.service.js.map