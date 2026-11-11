import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { getDbPath, getDatabase, closeDatabase } from '../database/connection';
import { runMigrations } from '../database/migrate';
import { seedDefaults } from '../database/seed';
import { getSetting, setSetting } from '../database/helpers';
import { getFilesRoot } from './file.service';

const AUTO_BACKUP_KEEP = 14;
const AUTO_BACKUP_INTERVAL_MS = 20 * 60 * 60 * 1000; // at most one automatic backup per day

function timestamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function removeDbFiles(dbPath: string) {
  for (const f of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }
}

function writeDbCopy(destination: string) {
  // VACUUM INTO produces a consistent single-file snapshot even while the database is in WAL mode.
  getDatabase().exec(`VACUUM INTO '${destination.replace(/'/g, "''")}'`);
}

export const backupService = {
  /** Folder used for automatic backups: the configured one, else <userData>/backups. */
  getAutoBackupDir(): string {
    const configured = getSetting('backup_path');
    return configured && configured.trim() ? configured : path.join(app.getPath('userData'), 'backups');
  },

  /** Manual backup: database snapshot plus a copy of the patient attachments folder. */
  createBackup(destinationDir: string): string {
    const base = `clinic-central-backup-${timestamp()}`;
    const backupPath = path.join(destinationDir, `${base}.db`);
    writeDbCopy(backupPath);
    const filesRoot = getFilesRoot();
    if (fs.existsSync(filesRoot) && fs.readdirSync(filesRoot).length > 0) {
      fs.cpSync(filesRoot, path.join(destinationDir, `${base}-files`), { recursive: true });
    }
    return backupPath;
  },

  /**
   * Daily automatic database backup, run at startup. Never throws: a failed backup must not
   * stop the clinic from opening the app. Keeps the newest AUTO_BACKUP_KEEP snapshots.
   */
  autoBackup(): string | null {
    try {
      if (getSetting('auto_backup_enabled') === '0') return null;
      const last = getSetting('last_auto_backup_date');
      if (last && Date.now() - new Date(last).getTime() < AUTO_BACKUP_INTERVAL_MS) return null;

      const dir = this.getAutoBackupDir();
      fs.mkdirSync(dir, { recursive: true });
      const target = path.join(dir, `clinic-central-auto-${timestamp()}.db`);
      writeDbCopy(target);
      setSetting('last_auto_backup_date', new Date().toISOString());

      const old = fs.readdirSync(dir)
        .filter(f => /^clinic-central-auto-.*\.db$/.test(f))
        .sort()
        .reverse()
        .slice(AUTO_BACKUP_KEEP);
      for (const f of old) fs.unlinkSync(path.join(dir, f));
      return target;
    } catch (err) {
      console.error('Automatic backup failed:', err);
      return null;
    }
  },

  restoreBackup(backupFilePath: string): boolean {
    const dbPath = getDbPath();

    // Validate backup file has expected tables before touching the live database
    const backupDb = require('better-sqlite3')(backupFilePath, { readonly: true });
    try {
      const tables = backupDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as any[];
      const tableNames = tables.map((t: any) => t.name);
      for (const table of ['patients', 'appointments', 'treatments', 'invoices', 'transactions']) {
        if (!tableNames.includes(table)) throw new Error(`Invalid backup: missing table '${table}'`);
      }
    } finally {
      backupDb.close();
    }

    // Keep a safety copy of the current data, then swap the file with the connection closed
    // (copying over an open WAL database can corrupt it).
    const safetyDir = path.join(app.getPath('userData'), 'backups');
    fs.mkdirSync(safetyDir, { recursive: true });
    writeDbCopy(path.join(safetyDir, `clinic-central-before-restore-${timestamp()}.db`));

    closeDatabase();
    removeDbFiles(dbPath);
    fs.copyFileSync(backupFilePath, dbPath);

    // Bring back attachments if the backup has its "-files" folder next to it
    const filesBackup = backupFilePath.replace(/\.db$/i, '') + '-files';
    if (fs.existsSync(filesBackup)) {
      fs.cpSync(filesBackup, getFilesRoot(), { recursive: true });
    }

    runMigrations(); // upgrades older backups to the current schema
    seedDefaults();
    return true;
  },

  getLastBackupInfo() {
    try {
      return getSetting('last_backup_date');
    } catch {
      return null;
    }
  },

  getStatus() {
    return {
      lastManual: getSetting('last_backup_date'),
      lastAuto: getSetting('last_auto_backup_date'),
      autoEnabled: getSetting('auto_backup_enabled') !== '0',
      autoDir: this.getAutoBackupDir(),
    };
  },

  recordBackup() {
    setSetting('last_backup_date', new Date().toISOString());
  },

  factoryReset(): boolean {
    const dbPath = getDbPath();
    closeDatabase();
    removeDbFiles(dbPath);

    // Patient attachments are part of "all data"
    fs.rmSync(getFilesRoot(), { recursive: true, force: true });

    // Recreate all tables and the default treatments/medicines/consent templates
    runMigrations();
    seedDefaults();
    return true;
  },
};
