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
    for (const file of files) {
        const version = parseInt(file.split('_')[0], 10);
        const applied = db.prepare('SELECT version FROM schema_migrations WHERE version = ?').get(version);
        if (!applied) {
            const sql = fs_1.default.readFileSync(path_1.default.join(migrationsDir, file), 'utf-8');
            db.exec(sql);
            db.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(version);
            console.log(`Applied migration: ${file}`);
        }
    }
}
//# sourceMappingURL=migrate.js.map