"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.backupService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const connection_1 = require("../database/connection");
const migrate_1 = require("../database/migrate");
exports.backupService = {
    createBackup(destinationDir) {
        const dbPath = (0, connection_1.getDbPath)();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        const backupFileName = `clinic-central-backup-${timestamp}.db`;
        const backupPath = path_1.default.join(destinationDir, backupFileName);
        // Use SQLite backup API via VACUUM INTO for consistency
        const db = (0, connection_1.getDatabase)();
        db.exec(`VACUUM INTO '${backupPath.replace(/'/g, "''")}'`);
        return backupPath;
    },
    restoreBackup(backupFilePath) {
        const dbPath = (0, connection_1.getDbPath)();
        // Validate backup file has expected tables
        const backupDb = require('better-sqlite3')(backupFilePath, { readonly: true });
        try {
            const tables = backupDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
            const tableNames = tables.map((t) => t.name);
            const required = ['patients', 'appointments', 'treatments', 'invoices', 'transactions'];
            for (const table of required) {
                if (!tableNames.includes(table)) {
                    throw new Error(`Invalid backup: missing table '${table}'`);
                }
            }
        }
        finally {
            backupDb.close();
        }
        // Copy backup over current db
        fs_1.default.copyFileSync(backupFilePath, dbPath);
        return true;
    },
    getLastBackupInfo() {
        const db = (0, connection_1.getDatabase)();
        try {
            const setting = db.prepare("SELECT value FROM settings WHERE key = 'last_backup_date'").get();
            return setting?.value || null;
        }
        catch {
            return null;
        }
    },
    recordBackup() {
        const db = (0, connection_1.getDatabase)();
        const now = new Date().toISOString();
        db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('last_backup_date', ?)").run(now);
    },
    factoryReset() {
        const dbPath = (0, connection_1.getDbPath)();
        // Close the current database connection
        (0, connection_1.closeDatabase)();
        // Delete the database file and WAL/SHM files
        if (fs_1.default.existsSync(dbPath))
            fs_1.default.unlinkSync(dbPath);
        if (fs_1.default.existsSync(dbPath + '-wal'))
            fs_1.default.unlinkSync(dbPath + '-wal');
        if (fs_1.default.existsSync(dbPath + '-shm'))
            fs_1.default.unlinkSync(dbPath + '-shm');
        // Re-initialize the database by running migrations (which recreates all tables and seeds default data)
        (0, migrate_1.runMigrations)();
        return true;
    },
};
//# sourceMappingURL=backup.service.js.map