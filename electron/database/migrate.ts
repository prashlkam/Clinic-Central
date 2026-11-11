import fs from 'fs';
import path from 'path';
import { getDatabase, getDbPath } from './connection';

export function runMigrations(): void {
  const db = getDatabase();

  // Ensure schema_migrations table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Try compiled location first, then source location
  let migrationsDir = path.join(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    migrationsDir = path.join(__dirname, '..', 'electron', 'database', 'migrations');
  }
  if (!fs.existsSync(migrationsDir)) {
    // In production, check extraResources
    const { app } = require('electron');
    migrationsDir = path.join(process.resourcesPath || app.getAppPath(), 'migrations');
  }
  if (!fs.existsSync(migrationsDir)) return;

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const appliedVersions = new Set(
    (db.prepare('SELECT version FROM schema_migrations').all() as any[]).map(r => r.version)
  );
  const pending = files.filter(f => !appliedVersions.has(parseInt(f.split('_')[0], 10)));

  // Upgrading a database that already holds clinic data: keep a snapshot of it first.
  if (pending.length > 0 && appliedVersions.size > 0) {
    const backupDir = path.join(path.dirname(getDbPath()), 'backups');
    fs.mkdirSync(backupDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const target = path.join(backupDir, `clinic-central-before-upgrade-${stamp}.db`);
    db.exec(`VACUUM INTO '${target.replace(/'/g, "''")}'`);
    console.log(`Pre-upgrade backup written to ${target}`);
  }

  for (const file of files) {
    const version = parseInt(file.split('_')[0], 10);
    const applied = appliedVersions.has(version);

    if (!applied) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      // All-or-nothing: a half-applied migration must never be recorded or left behind.
      db.transaction(() => {
        db.exec(sql);
        db.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(version);
      })();
      console.log(`Applied migration: ${file}`);
    }
  }
}
