import fs from 'fs';
import path from 'path';
import { getDbPath } from '../database/connection';
import { getDatabase } from '../database/connection';

export const backupService = {
  createBackup(destinationDir: string): string {
    const dbPath = getDbPath();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const backupFileName = `clinic-central-backup-${timestamp}.db`;
    const backupPath = path.join(destinationDir, backupFileName);

    // Use SQLite backup API via VACUUM INTO for consistency
    const db = getDatabase();
    db.exec(`VACUUM INTO '${backupPath.replace(/'/g, "''")}'`);

    return backupPath;
  },

  restoreBackup(backupFilePath: string): boolean {
    const dbPath = getDbPath();

    // Validate backup file has expected tables
    const backupDb = require('better-sqlite3')(backupFilePath, { readonly: true });
    try {
      const tables = backupDb.prepare(
        "SELECT name FROM sqlite_master WHERE type='table'"
      ).all() as any[];
      const tableNames = tables.map((t: any) => t.name);

      const required = ['patients', 'appointments', 'treatments', 'invoices', 'transactions'];
      for (const table of required) {
        if (!tableNames.includes(table)) {
          throw new Error(`Invalid backup: missing table '${table}'`);
        }
      }
    } finally {
      backupDb.close();
    }

    // Copy backup over current db
    fs.copyFileSync(backupFilePath, dbPath);
    return true;
  },

  getLastBackupInfo() {
    const db = getDatabase();
    try {
      const setting = db.prepare("SELECT value FROM settings WHERE key = 'last_backup_date'").get() as any;
      return setting?.value || null;
    } catch {
      return null;
    }
  },

  recordBackup() {
    const db = getDatabase();
    const now = new Date().toISOString();
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('last_backup_date', ?)").run(now);
  },
};
