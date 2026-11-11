import crypto from 'crypto';
import { getDatabase } from '../database/connection';

// Stored as "scrypt$<salt>$<hash>". Databases created by older versions hold an unsalted
// SHA-256 hex digest; those still verify and are upgraded on the next successful login.
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  if (stored.startsWith('scrypt$')) {
    const [, salt, hash] = stored.split('$');
    const candidate = crypto.scryptSync(password, salt, 64);
    const expected = Buffer.from(hash, 'hex');
    return expected.length === candidate.length && crypto.timingSafeEqual(candidate, expected);
  }
  return crypto.createHash('sha256').update(password).digest('hex') === stored;
}

function stripHash(row: any) {
  if (!row) return null;
  const { password_hash, ...profile } = row;
  return profile;
}

export const doctorService = {
  isRegistered(): boolean {
    const db = getDatabase();
    const row = db.prepare('SELECT id FROM doctor LIMIT 1').get();
    return !!row;
  },

  register(data: {
    name: string;
    email: string;
    phone?: string;
    specialization?: string;
    qualification?: string;
    registration_number?: string;
    password: string;
  }) {
    const db = getDatabase();
    const existing = db.prepare('SELECT id FROM doctor LIMIT 1').get();
    if (existing) throw new Error('Doctor already registered');

    const hash = hashPassword(data.password);
    db.prepare(`
      INSERT INTO doctor (name, email, phone, specialization, qualification, registration_number, password_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(data.name, data.email, data.phone || '', data.specialization || '', data.qualification || '', data.registration_number || '', hash);

    return this.getProfile();
  },

  login(password: string) {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM doctor LIMIT 1').get() as any;
    if (!row) throw new Error('No doctor registered');

    if (!verifyPassword(password, row.password_hash)) {
      throw new Error('Invalid password');
    }
    if (!row.password_hash.startsWith('scrypt$')) {
      db.prepare('UPDATE doctor SET password_hash = ? WHERE id = ?').run(hashPassword(password), row.id);
    }
    return stripHash(row);
  },

  getProfile() {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM doctor LIMIT 1').get() as any;
    return stripHash(row);
  },

  updateProfile(data: Record<string, any>) {
    const db = getDatabase();
    const allowed = [
      'name', 'email', 'phone', 'specialization', 'qualification',
      'registration_number', 'photo', 'bio', 'experience_years',
      'consultation_fee_paise', 'working_hours_start', 'working_hours_end', 'days_off',
    ];

    const updates: string[] = [];
    const values: any[] = [];
    for (const key of allowed) {
      if (key in data) {
        updates.push(`${key} = ?`);
        values.push(data[key]);
      }
    }
    if (updates.length === 0) return this.getProfile();

    updates.push("updated_at = datetime('now')");
    db.prepare(`UPDATE doctor SET ${updates.join(', ')} WHERE id = (SELECT id FROM doctor LIMIT 1)`).run(...values);
    return this.getProfile();
  },

  changePassword(oldPassword: string, newPassword: string) {
    const db = getDatabase();
    const row = db.prepare('SELECT password_hash FROM doctor LIMIT 1').get() as any;
    if (!row) throw new Error('No doctor registered');

    if (!verifyPassword(oldPassword, row.password_hash)) {
      throw new Error('Current password is incorrect');
    }

    const newHash = hashPassword(newPassword);
    db.prepare('UPDATE doctor SET password_hash = ? WHERE id = (SELECT id FROM doctor LIMIT 1)').run(newHash);
    return { success: true };
  },
};
