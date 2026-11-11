"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMigrations = runMigrations;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const connection_1 = require("./connection");
function runMigrations() {
    const db = (0, connection_1.getDatabase)();
    // Ensure schema_migrations table exists
    db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT DEFAULT (datetime('now'))
    );
  `);
    // Try compiled location first, then source location
    let migrationsDir = path_1.default.join(__dirname, 'migrations');
    if (!fs_1.default.existsSync(migrationsDir)) {
        migrationsDir = path_1.default.join(__dirname, '..', 'electron', 'database', 'migrations');
    }
    if (!fs_1.default.existsSync(migrationsDir)) {
        // In production, check extraResources
        const { app } = require('electron');
        migrationsDir = path_1.default.join(process.resourcesPath || app.getAppPath(), 'migrations');
    }
    if (!fs_1.default.existsSync(migrationsDir))
        return;
    const files = fs_1.default.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();
    const appliedVersions = new Set(db.prepare('SELECT version FROM schema_migrations').all().map(r => r.version));
    const pending = files.filter(f => !appliedVersions.has(parseInt(f.split('_')[0], 10)));
    // Upgrading a database that already holds clinic data: keep a snapshot of it first.
    if (pending.length > 0 && appliedVersions.size > 0) {
        const backupDir = path_1.default.join(path_1.default.dirname((0, connection_1.getDbPath)()), 'backups');
        fs_1.default.mkdirSync(backupDir, { recursive: true });
        const stamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        const target = path_1.default.join(backupDir, `clinic-central-before-upgrade-${stamp}.db`);
        db.exec(`VACUUM INTO '${target.replace(/'/g, "''")}'`);
        console.log(`Pre-upgrade backup written to ${target}`);
    }
    for (const file of files) {
        const version = parseInt(file.split('_')[0], 10);
        const applied = appliedVersions.has(version);
        if (!applied) {
            const sql = fs_1.default.readFileSync(path_1.default.join(migrationsDir, file), 'utf-8');
            // All-or-nothing: a half-applied migration must never be recorded or left behind.
            db.transaction(() => {
                db.exec(sql);
                db.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(version);
            })();
            console.log(`Applied migration: ${file}`);
        }
    }
}
//# sourceMappingURL=migrate.js.map