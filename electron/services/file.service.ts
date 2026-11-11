import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { app, shell } from 'electron';
import { getDatabase } from '../database/connection';

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp',
  '.bmp': 'image/bmp', '.pdf': 'application/pdf', '.txt': 'text/plain', '.dcm': 'application/dicom',
  '.doc': 'application/msword', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};
const MAX_PREVIEW_BYTES = 20 * 1024 * 1024;

/** All patient attachments live under <userData>/patient-files/<patientId>/ on this computer. */
export function getFilesRoot(): string {
  return path.join(app.getPath('userData'), 'patient-files');
}

function filePath(row: { patient_id: number; stored_name: string }): string {
  return path.join(getFilesRoot(), String(row.patient_id), row.stored_name);
}

function getRow(id: number) {
  const row = getDatabase().prepare('SELECT * FROM patient_files WHERE id = ?').get(id) as any;
  if (!row) throw new Error('File record not found');
  return row;
}

export const fileService = {
  list(patientId: number) {
    return getDatabase().prepare('SELECT * FROM patient_files WHERE patient_id = ? ORDER BY created_at DESC, id DESC').all(patientId);
  },

  /** Copy the chosen files into the app's data folder and record them. */
  addFiles(patientId: number, sourcePaths: string[], category = 'other', notes?: string) {
    const db = getDatabase();
    const dir = path.join(getFilesRoot(), String(patientId));
    fs.mkdirSync(dir, { recursive: true });
    const insert = db.prepare(`
      INSERT INTO patient_files (patient_id, category, original_name, stored_name, mime_type, size_bytes, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    let added = 0;
    for (const src of sourcePaths) {
      const ext = path.extname(src).toLowerCase();
      const stored = `${crypto.randomUUID()}${ext}`;
      fs.copyFileSync(src, path.join(dir, stored));
      const size = fs.statSync(path.join(dir, stored)).size;
      insert.run(patientId, category, path.basename(src), stored, MIME[ext] || 'application/octet-stream', size, notes || null);
      added++;
    }
    return { added };
  },

  /** Image content as a data URL for in-app preview (null for non-images / very large files). */
  getPreview(id: number): string | null {
    const row = getRow(id);
    if (!row.mime_type?.startsWith('image/') || row.size_bytes > MAX_PREVIEW_BYTES) return null;
    const p = filePath(row);
    if (!fs.existsSync(p)) return null;
    return `data:${row.mime_type};base64,${fs.readFileSync(p).toString('base64')}`;
  },

  /** Open with the operating system's default viewer. */
  async open(id: number) {
    const p = filePath(getRow(id));
    if (!fs.existsSync(p)) throw new Error('The file is missing from the data folder');
    const err = await shell.openPath(p);
    if (err) throw new Error(err);
    return { success: true };
  },

  update(id: number, data: { category?: string; notes?: string }) {
    const row = getRow(id);
    getDatabase().prepare('UPDATE patient_files SET category = ?, notes = ? WHERE id = ?')
      .run(data.category ?? row.category, data.notes ?? row.notes, id);
    return { success: true };
  },

  delete(id: number) {
    const row = getRow(id);
    const p = filePath(row);
    getDatabase().prepare('DELETE FROM patient_files WHERE id = ?').run(id);
    if (fs.existsSync(p)) fs.unlinkSync(p);
    return { success: true };
  },
};
