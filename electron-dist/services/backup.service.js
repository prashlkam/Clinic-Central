"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.backupService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const electron_1 = require("electron");
const connection_1 = require("../database/connection");
const migrate_1 = require("../database/migrate");
const seed_1 = require("../database/seed");
const helpers_1 = require("../database/helpers");
const file_service_1 = require("./file.service");
const AUTO_BACKUP_KEEP = 14;
const AUTO_BACKUP_INTERVAL_MS = 20 * 60 * 60 * 1000; // at most one automatic backup per day
function timestamp() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}
function removeDbFiles(dbPath) {
    for (const f of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
        if (fs_1.default.existsSync(f))
            fs_1.default.unlinkSync(f);
    }
}
function writeDbCopy(destination) {
    // VACUUM INTO produces a consistent single-file snapshot even while the database is in WAL mode.
    (0, connection_1.getDatabase)().exec(`VACUUM INTO '${destination.replace(/'/g, "''")}'`);
}
exports.backupService = {
    /** Folder used for automatic backups: the configured one, else <userData>/backups. */
    getAutoBackupDir() {
        const configured = (0, helpers_1.getSetting)('backup_path');
        return configured && configured.trim() ? configured : path_1.default.join(electron_1.app.getPath('userData'), 'backups');
    },
    /** Manual backup: database snapshot plus a copy of the patient attachments folder. */
    createBackup(destinationDir) {
        const base = `clinic-central-backup-${timestamp()}`;
        const backupPath = path_1.default.join(destinationDir, `${base}.db`);
        writeDbCopy(backupPath);
        const filesRoot = (0, file_service_1.getFilesRoot)();
        if (fs_1.default.existsSync(filesRoot) && fs_1.default.readdirSync(filesRoot).length > 0) {
            fs_1.default.cpSync(filesRoot, path_1.default.join(destinationDir, `${base}-files`), { recursive: true });
        }
        return backupPath;
    },
    /**
     * Daily automatic database backup, run at startup. Never throws: a failed backup must not
     * stop the clinic from opening the app. Keeps the newest AUTO_BACKUP_KEEP snapshots.
     */
    autoBackup() {
        try {
            if ((0, helpers_1.getSetting)('auto_backup_enabled') === '0')
                return null;
            const last = (0, helpers_1.getSetting)('last_auto_backup_date');
            if (last && Date.now() - new Date(last).getTime() < AUTO_BACKUP_INTERVAL_MS)
                return null;
            const dir = this.getAutoBackupDir();
            fs_1.default.mkdirSync(dir, { recursive: true });
            const target = path_1.default.join(dir, `clinic-central-auto-${timestamp()}.db`);
            writeDbCopy(target);
            (0, helpers_1.setSetting)('last_auto_backup_date', new Date().toISOString());
            const old = fs_1.default.readdirSync(dir)
                .filter(f => /^clinic-central-auto-.*\.db$/.test(f))
                .sort()
                .reverse()
                .slice(AUTO_BACKUP_KEEP);
            for (const f of old)
                fs_1.default.unlinkSync(path_1.default.join(dir, f));
            return target;
        }
        catch (err) {
            console.error('Automatic backup failed:', err);
            return null;
        }
    },
    restoreBackup(backupFilePath) {
        const dbPath = (0, connection_1.getDbPath)();
        // Validate backup file has expected tables before touching the live database
        const backupDb = require('better-sqlite3')(backupFilePath, { readonly: true });
        try {
            const tables = backupDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
            const tableNames = tables.map((t) => t.name);
            for (const table of ['patients', 'appointments', 'treatments', 'invoices', 'transactions']) {
                if (!tableNames.includes(table))
                    throw new Error(`Invalid backup: missing table '${table}'`);
            }
        }
        finally {
            backupDb.close();
        }
        // Keep a safety copy of the current data, then swap the file with the connection closed
        // (copying over an open WAL database can corrupt it).
        const safetyDir = path_1.default.join(electron_1.app.getPath('userData'), 'backups');
        fs_1.default.mkdirSync(safetyDir, { recursive: true });
        writeDbCopy(path_1.default.join(safetyDir, `clinic-central-before-restore-${timestamp()}.db`));
        (0, connection_1.closeDatabase)();
        removeDbFiles(dbPath);
        fs_1.default.copyFileSync(backupFilePath, dbPath);
        // Bring back attachments if the backup has its "-files" folder next to it
        const filesBackup = backupFilePath.replace(/\.db$/i, '') + '-files';
        if (fs_1.default.existsSync(filesBackup)) {
            fs_1.default.cpSync(filesBackup, (0, file_service_1.getFilesRoot)(), { recursive: true });
        }
        (0, migrate_1.runMigrations)(); // upgrades older backups to the current schema
        (0, seed_1.seedDefaults)();
        return true;
    },
    getLastBackupInfo() {
        try {
            return (0, helpers_1.getSetting)('last_backup_date');
        }
        catch {
            return null;
        }
    },
    getStatus() {
        return {
            lastManual: (0, helpers_1.getSetting)('last_backup_date'),
            lastAuto: (0, helpers_1.getSetting)('last_auto_backup_date'),
            autoEnabled: (0, helpers_1.getSetting)('auto_backup_enabled') !== '0',
            autoDir: this.getAutoBackupDir(),
        };
    },
    recordBackup() {
        (0, helpers_1.setSetting)('last_backup_date', new Date().toISOString());
    },
    factoryReset() {
        const dbPath = (0, connection_1.getDbPath)();
        (0, connection_1.closeDatabase)();
        removeDbFiles(dbPath);
        // Patient attachments are part of "all data"
        fs_1.default.rmSync((0, file_service_1.getFilesRoot)(), { recursive: true, force: true });
        // Recreate all tables and the default treatments/medicines/consent templates
        (0, migrate_1.runMigrations)();
        (0, seed_1.seedDefaults)();
        return true;
    },
};
//# sourceMappingURL=backup.service.js.map