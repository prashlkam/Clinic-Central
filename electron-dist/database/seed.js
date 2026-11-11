"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDataDir = getDataDir;
exports.loadDefaultTreatments = loadDefaultTreatments;
exports.loadDefaultMedicines = loadDefaultMedicines;
exports.loadDefaultConsentTemplates = loadDefaultConsentTemplates;
exports.seedDefaults = seedDefaults;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const connection_1 = require("./connection");
const helpers_1 = require("./helpers");
const treatment_json_1 = require("../services/treatment-json");
/** Folder holding the bundled default JSON data (treatments, medicines, consent templates). */
function getDataDir() {
    const candidates = [
        path_1.default.join(process.resourcesPath || '', 'data'), // packaged app (extraResources)
        path_1.default.join(__dirname, '..', '..', 'data'), // running from the project folder
        path_1.default.join(process.cwd(), 'data'),
    ];
    return candidates.find(p => fs_1.default.existsSync(p)) || candidates[1];
}
function readJson(relative) {
    const file = path_1.default.join(getDataDir(), relative);
    if (!fs_1.default.existsSync(file)) {
        console.warn(`Default data file not found: ${file}`);
        return null;
    }
    return JSON.parse(fs_1.default.readFileSync(file, 'utf-8'));
}
function loadDefaultTreatments() {
    const file = path_1.default.join(getDataDir(), 'treatments', 'default-treatments.json');
    if (!fs_1.default.existsSync(file))
        throw new Error(`Default treatment list not found at ${file}`);
    return (0, treatment_json_1.importTreatmentContent)(fs_1.default.readFileSync(file, 'utf-8'));
}
function loadDefaultMedicines() {
    const db = (0, connection_1.getDatabase)();
    const data = readJson(path_1.default.join('medicines', 'default-medicines.json'));
    if (!data?.medicines)
        return { added: 0 };
    const exists = db.prepare("SELECT id FROM medicines WHERE name = ? AND COALESCE(strength, '') = ? AND is_active = 1");
    const insert = db.prepare('INSERT INTO medicines (name, form, strength, frequency, duration, instructions) VALUES (?, ?, ?, ?, ?, ?)');
    let added = 0;
    db.transaction(() => {
        for (const m of data.medicines) {
            if (!m?.name || exists.get(m.name, m.strength || ''))
                continue;
            insert.run(m.name, m.form || null, m.strength || null, m.frequency || null, m.duration || null, m.instructions || null);
            added++;
        }
    })();
    return { added };
}
function loadDefaultConsentTemplates() {
    const db = (0, connection_1.getDatabase)();
    const data = readJson(path_1.default.join('consents', 'default-consent-templates.json'));
    if (!data?.templates)
        return { added: 0 };
    const insert = db.prepare('INSERT OR IGNORE INTO consent_templates (name, body) VALUES (?, ?)');
    let added = 0;
    db.transaction(() => {
        for (const t of data.templates) {
            if (t?.name && t?.body)
                added += insert.run(t.name, t.body).changes;
        }
    })();
    return { added };
}
/**
 * First-run seeding. Each data set is loaded at most once per database (tracked in settings),
 * so anything the doctor later deletes is never silently re-added.
 */
function seedDefaults() {
    const db = (0, connection_1.getDatabase)();
    const once = (key, table, load) => {
        if ((0, helpers_1.getSetting)(key))
            return;
        try {
            const count = db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get().c;
            if (count === 0)
                load();
            (0, helpers_1.setSetting)(key, new Date().toISOString());
        }
        catch (err) {
            console.error(`Seeding ${table} failed:`, err);
        }
    };
    once('seeded_treatments', 'treatment_trees', loadDefaultTreatments);
    once('seeded_medicines', 'medicines', loadDefaultMedicines);
    once('seeded_consent_templates', 'consent_templates', loadDefaultConsentTemplates);
}
//# sourceMappingURL=seed.js.map