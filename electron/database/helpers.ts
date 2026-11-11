import { getDatabase } from './connection';

function clean(v: any) {
  if (v === undefined || v === '') return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  return v;
}

/** Insert the allowed keys of `data` into `table`; returns the new row id. */
export function insertRow(table: string, data: Record<string, any>, allowed: string[]): number {
  const keys = allowed.filter(k => data[k] !== undefined);
  if (keys.length === 0) throw new Error(`Nothing to insert into ${table}`);
  const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`;
  const result = getDatabase().prepare(sql).run(...keys.map(k => clean(data[k])));
  return Number(result.lastInsertRowid);
}

/** Update the allowed keys of `data` on the row with the given id. */
export function updateRow(table: string, id: number, data: Record<string, any>, allowed: string[], touch = true): number {
  const keys = allowed.filter(k => k in data && data[k] !== undefined);
  if (keys.length === 0) return 0;
  const sets = keys.map(k => `${k} = ?`);
  if (touch) sets.push("updated_at = datetime('now')");
  const result = getDatabase().prepare(`UPDATE ${table} SET ${sets.join(', ')} WHERE id = ?`)
    .run(...keys.map(k => clean(data[k])), id);
  return result.changes;
}

/** Insert when there is no id, otherwise update. Returns the row id. */
export function saveRow(table: string, data: Record<string, any>, allowed: string[], touch = true): number {
  if (data.id) {
    updateRow(table, Number(data.id), data, allowed, touch);
    return Number(data.id);
  }
  return insertRow(table, data, allowed);
}

/** Local calendar date as YYYY-MM-DD (the clinic's wall-clock day, not UTC). */
export function localDate(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** ISO (UTC) start and end instants of a local calendar day. */
export function localDayRange(date?: string): [string, string] {
  const base = date ? new Date(`${date}T00:00:00`) : new Date();
  const start = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  const end = new Date(base.getFullYear(), base.getMonth(), base.getDate() + 1);
  return [start.toISOString(), end.toISOString()];
}

export function getSetting(key: string): string | null {
  const row = getDatabase().prepare('SELECT value FROM settings WHERE key = ?').get(key) as any;
  return row ? row.value : null;
}

export function setSetting(key: string, value: string): void {
  getDatabase().prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
}
