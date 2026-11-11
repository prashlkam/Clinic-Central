"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rxTemplateService = exports.prescriptionService = exports.medicineService = void 0;
const connection_1 = require("../database/connection");
const helpers_1 = require("../database/helpers");
const MEDICINE_FIELDS = ['name', 'form', 'strength', 'frequency', 'duration', 'instructions', 'is_active'];
function cleanItems(items = []) {
    return items.filter(i => i && i.medicine_name?.trim()).map(i => ({
        medicine_name: i.medicine_name.trim(),
        strength: i.strength || '',
        frequency: i.frequency || '',
        duration: i.duration || '',
        instructions: i.instructions || '',
    }));
}
exports.medicineService = {
    list() {
        return (0, connection_1.getDatabase)().prepare('SELECT * FROM medicines WHERE is_active = 1 ORDER BY name, strength').all();
    },
    save(data) {
        if (!data.id && !data.name?.trim())
            throw new Error('Medicine name is required');
        return { id: (0, helpers_1.saveRow)('medicines', data, MEDICINE_FIELDS, false) };
    },
    delete(id) {
        return (0, connection_1.getDatabase)().prepare('UPDATE medicines SET is_active = 0 WHERE id = ?').run(id);
    },
};
exports.prescriptionService = {
    listByPatient(patientId) {
        const db = (0, connection_1.getDatabase)();
        const rows = db.prepare('SELECT * FROM prescriptions WHERE patient_id = ? ORDER BY prescription_date DESC, id DESC').all(patientId);
        const itemStmt = db.prepare('SELECT * FROM prescription_items WHERE prescription_id = ? ORDER BY sort_order, id');
        return rows.map(r => ({ ...r, items: itemStmt.all(r.id) }));
    },
    save(data) {
        const db = (0, connection_1.getDatabase)();
        const items = cleanItems(data.items);
        if (items.length === 0)
            throw new Error('Add at least one medicine');
        return db.transaction(() => {
            const id = (0, helpers_1.saveRow)('prescriptions', { ...data, follow_up_date: data.follow_up_date ?? null }, ['patient_id', 'prescription_date', 'diagnosis', 'advice', 'follow_up_date']);
            db.prepare('DELETE FROM prescription_items WHERE prescription_id = ?').run(id);
            const insert = db.prepare(`
        INSERT INTO prescription_items (prescription_id, medicine_name, strength, frequency, duration, instructions, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
            items.forEach((i, idx) => insert.run(id, i.medicine_name, i.strength, i.frequency, i.duration, i.instructions, idx));
            return { id };
        })();
    },
    delete(id) {
        return (0, connection_1.getDatabase)().prepare('DELETE FROM prescriptions WHERE id = ?').run(id);
    },
};
exports.rxTemplateService = {
    list() {
        const rows = (0, connection_1.getDatabase)().prepare('SELECT * FROM prescription_templates ORDER BY name').all();
        return rows.map(r => {
            let items = [];
            try {
                items = JSON.parse(r.items_json);
            }
            catch { /* keep empty */ }
            return { id: r.id, name: r.name, diagnosis: r.diagnosis, advice: r.advice, items };
        });
    },
    save(data) {
        if (!data.name?.trim())
            throw new Error('Template name is required');
        const items = cleanItems(data.items);
        if (items.length === 0)
            throw new Error('Add at least one medicine to the template');
        return {
            id: (0, helpers_1.saveRow)('prescription_templates', { ...data, name: data.name.trim(), items_json: JSON.stringify(items) }, ['name', 'diagnosis', 'advice', 'items_json'], false),
        };
    },
    delete(id) {
        return (0, connection_1.getDatabase)().prepare('DELETE FROM prescription_templates WHERE id = ?').run(id);
    },
};
//# sourceMappingURL=prescription.service.js.map