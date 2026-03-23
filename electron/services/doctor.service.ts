import crypto from 'crypto';
import { getDatabase } from '../database/connection';

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
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

    const hash = hashPassword(password);
    if (hash !== row.password_hash) {
      throw new Error('Invalid password');
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

    if (hashPassword(oldPassword) !== row.password_hash) {
      throw new Error('Current password is incorrect');
    }

    const newHash = hashPassword(newPassword);
    db.prepare('UPDATE doctor SET password_hash = ? WHERE id = (SELECT id FROM doctor LIMIT 1)').run(newHash);
    return { success: true };
  },
};
