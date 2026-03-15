import { getDatabase } from '../database/connection';

export interface Treatment {
  id: number;
  tree_id: number;
  parent_id: number | null;
  name: string;
  description: string | null;
  estimated_cost_paise: number;
  duration_minutes: number;
  is_active: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
  tree_name?: string;
  children?: Treatment[];
}

export interface TreatmentTree {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
}

export const treatmentService = {
  listTrees() {
    const db = getDatabase();
    return db.prepare('SELECT * FROM treatment_trees ORDER BY name').all() as TreatmentTree[];
  },

  getTreeWithTreatments(treeId: number) {
    const db = getDatabase();
    const tree = db.prepare('SELECT * FROM treatment_trees WHERE id = ?').get(treeId) as TreatmentTree;
    const treatments = db.prepare(
      'SELECT * FROM treatments WHERE tree_id = ? AND is_active = 1 ORDER BY sort_order'
    ).all(treeId) as Treatment[];

    // Build tree structure
    const rootTreatments = buildTree(treatments);
    return { ...tree, treatments: rootTreatments };
  },

  getAllTreatmentsFlat() {
    const db = getDatabase();
    return db.prepare(`
      SELECT t.*, tt.name as tree_name
      FROM treatments t
      JOIN treatment_trees tt ON tt.id = t.tree_id
      WHERE t.is_active = 1
      ORDER BY tt.name, t.sort_order
    `).all() as Treatment[];
  },

  getByTree(treeId: number) {
    const db = getDatabase();
    return db.prepare(
      'SELECT * FROM treatments WHERE tree_id = ? AND is_active = 1 ORDER BY sort_order'
    ).all(treeId) as Treatment[];
  },

  getById(id: number) {
    const db = getDatabase();
    return db.prepare(`
      SELECT t.*, tt.name as tree_name
      FROM treatments t
      JOIN treatment_trees tt ON tt.id = t.tree_id
      WHERE t.id = ?
    `).get(id) as Treatment | undefined;
  },

  create(data: { tree_id: number; parent_id?: number | null; name: string; description?: string; estimated_cost_paise: number; duration_minutes?: number }) {
    const db = getDatabase();
    const result = db.prepare(`
      INSERT INTO treatments (tree_id, parent_id, name, description, estimated_cost_paise, duration_minutes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      data.tree_id, data.parent_id || null, data.name, data.description || null,
      data.estimated_cost_paise, data.duration_minutes || 30
    );
    return { id: result.lastInsertRowid };
  },

  update(id: number, data: Partial<Treatment>) {
    const db = getDatabase();
    const fields: string[] = [];
    const values: any[] = [];
    const allowed = ['name', 'description', 'estimated_cost_paise', 'duration_minutes', 'parent_id', 'sort_order'];

    for (const key of allowed) {
      if (key in data) {
        fields.push(`${key} = ?`);
        values.push((data as any)[key]);
      }
    }

    if (fields.length === 0) return { changes: 0 };
    fields.push("updated_at = datetime('now')");
    values.push(id);

    return db.prepare(`UPDATE treatments SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  },

  delete(id: number) {
    const db = getDatabase();
    return db.prepare("UPDATE treatments SET is_active = 0, updated_at = datetime('now') WHERE id = ?").run(id);
  },

  createTree(name: string, description?: string) {
    const db = getDatabase();
    const result = db.prepare('INSERT INTO treatment_trees (name, description) VALUES (?, ?)').run(name, description || null);
    return { id: result.lastInsertRowid };
  },

  deleteTree(id: number) {
    const db = getDatabase();
    db.prepare("UPDATE treatments SET is_active = 0 WHERE tree_id = ?").run(id);
    db.prepare("DELETE FROM treatment_trees WHERE id = ?").run(id);
    return { success: true };
  },

  clearAll() {
    const db = getDatabase();
    db.prepare('DELETE FROM treatments').run();
    db.prepare('DELETE FROM treatment_trees').run();
    return { success: true };
  },
};

function buildTree(treatments: Treatment[]): Treatment[] {
  const map = new Map<number, Treatment>();
  const roots: Treatment[] = [];

  for (const t of treatments) {
    map.set(t.id, { ...t, children: [] });
  }

  for (const t of treatments) {
    const node = map.get(t.id)!;
    if (t.parent_id && map.has(t.parent_id)) {
      map.get(t.parent_id)!.children!.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}
