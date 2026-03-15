import fs from 'fs';
import path from 'path';
import { getDatabase } from './connection';

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

  for (const file of files) {
    const version = parseInt(file.split('_')[0], 10);
    const applied = db.prepare('SELECT version FROM schema_migrations WHERE version = ?').get(version);

    if (!applied) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      db.exec(sql);
      db.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(version);
      console.log(`Applied migration: ${file}`);
    }
  }
}
