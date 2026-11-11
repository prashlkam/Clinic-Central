import fs from 'fs';
import path from 'path';
import { getDatabase } from './connection';
import { getSetting, setSetting } from './helpers';
import { importTreatmentContent } from '../services/treatment-json';

/** Folder holding the bundled default JSON data (treatments, medicines, consent templates). */
export function getDataDir(): string {
  const candidates = [
    path.join(process.resourcesPath || '', 'data'),   // packaged app (extraResources)
    path.join(__dirname, '..', '..', 'data'),         // running from the project folder
    path.join(process.cwd(), 'data'),
  ];
  return candidates.find(p => fs.existsSync(p)) || candidates[1];
}

function readJson(relative: string): any | null {
  const file = path.join(getDataDir(), relative);
  if (!fs.existsSync(file)) {
    console.warn(`Default data file not found: ${file}`);
    return null;
  }
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

export function loadDefaultTreatments() {
  const file = path.join(getDataDir(), 'treatments', 'default-treatments.json');
  if (!fs.existsSync(file)) throw new Error(`Default treatment list not found at ${file}`);
  return importTreatmentContent(fs.readFileSync(file, 'utf-8'));
}

export function loadDefaultMedicines() {
  const db = getDatabase();
  const data = readJson(path.join('medicines', 'default-medicines.json'));
  if (!data?.medicines) return { added: 0 };
  const exists = db.prepare("SELECT id FROM medicines WHERE name = ? AND COALESCE(strength, '') = ? AND is_active = 1");
  const insert = db.prepare('INSERT INTO medicines (name, form, strength, frequency, duration, instructions) VALUES (?, ?, ?, ?, ?, ?)');
  let added = 0;
  db.transaction(() => {
    for (const m of data.medicines) {
      if (!m?.name || exists.get(m.name, m.strength || '')) continue;
      insert.run(m.name, m.form || null, m.strength || null, m.frequency || null, m.duration || null, m.instructions || null);
      added++;
    }
  })();
  return { added };
}

export function loadDefaultConsentTemplates() {
  const db = getDatabase();
  const data = readJson(path.join('consents', 'default-consent-templates.json'));
  if (!data?.templates) return { added: 0 };
  const insert = db.prepare('INSERT OR IGNORE INTO consent_templates (name, body) VALUES (?, ?)');
  let added = 0;
  db.transaction(() => {
    for (const t of data.templates) {
      if (t?.name && t?.body) added += insert.run(t.name, t.body).changes;
    }
  })();
  return { added };
}

/**
 * First-run seeding. Each data set is loaded at most once per database (tracked in settings),
 * so anything the doctor later deletes is never silently re-added.
 */
export function seedDefaults(): void {
  const db = getDatabase();
  const once = (key: string, table: string, load: () => unknown) => {
    if (getSetting(key)) return;
    try {
      const count = (db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get() as any).c;
      if (count === 0) load();
      setSetting(key, new Date().toISOString());
    } catch (err) {
      console.error(`Seeding ${table} failed:`, err);
    }
  };
  once('seeded_treatments', 'treatment_trees', loadDefaultTreatments);
  once('seeded_medicines', 'medicines', loadDefaultMedicines);
  once('seeded_consent_templates', 'consent_templates', loadDefaultConsentTemplates);
}
