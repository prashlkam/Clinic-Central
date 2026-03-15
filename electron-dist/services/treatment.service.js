"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.treatmentService = void 0;
const connection_1 = require("../database/connection");
exports.treatmentService = {
    listTrees() {
        const db = (0, connection_1.getDatabase)();
        return db.prepare('SELECT * FROM treatment_trees ORDER BY name').all();
    },
    getTreeWithTreatments(treeId) {
        const db = (0, connection_1.getDatabase)();
        const tree = db.prepare('SELECT * FROM treatment_trees WHERE id = ?').get(treeId);
        const treatments = db.prepare('SELECT * FROM treatments WHERE tree_id = ? AND is_active = 1 ORDER BY sort_order').all(treeId);
        // Build tree structure
        const rootTreatments = buildTree(treatments);
        return { ...tree, treatments: rootTreatments };
    },
    getAllTreatmentsFlat() {
        const db = (0, connection_1.getDatabase)();
        return db.prepare(`
      SELECT t.*, tt.name as tree_name
      FROM treatments t
      JOIN treatment_trees tt ON tt.id = t.tree_id
      WHERE t.is_active = 1
      ORDER BY tt.name, t.sort_order
    `).all();
    },
    getByTree(treeId) {
        const db = (0, connection_1.getDatabase)();
        return db.prepare('SELECT * FROM treatments WHERE tree_id = ? AND is_active = 1 ORDER BY sort_order').all(treeId);
    },
    getById(id) {
        const db = (0, connection_1.getDatabase)();
        return db.prepare(`
      SELECT t.*, tt.name as tree_name
      FROM treatments t
      JOIN treatment_trees tt ON tt.id = t.tree_id
      WHERE t.id = ?
    `).get(id);
    },
    create(data) {
        const db = (0, connection_1.getDatabase)();
        const result = db.prepare(`
      INSERT INTO treatments (tree_id, parent_id, name, description, estimated_cost_paise, duration_minutes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(data.tree_id, data.parent_id || null, data.name, data.description || null, data.estimated_cost_paise, data.duration_minutes || 30);
        return { id: result.lastInsertRowid };
    },
    update(id, data) {
        const db = (0, connection_1.getDatabase)();
        const fields = [];
        const values = [];
        const allowed = ['name', 'description', 'estimated_cost_paise', 'duration_minutes', 'parent_id', 'sort_order'];
        for (const key of allowed) {
            if (key in data) {
                fields.push(`${key} = ?`);
                values.push(data[key]);
            }
        }
        if (fields.length === 0)
            return { changes: 0 };
        fields.push("updated_at = datetime('now')");
        values.push(id);
        return db.prepare(`UPDATE treatments SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    },
    delete(id) {
        const db = (0, connection_1.getDatabase)();
        return db.prepare("UPDATE treatments SET is_active = 0, updated_at = datetime('now') WHERE id = ?").run(id);
    },
    createTree(name, description) {
        const db = (0, connection_1.getDatabase)();
        const result = db.prepare('INSERT INTO treatment_trees (name, description) VALUES (?, ?)').run(name, description || null);
        return { id: result.lastInsertRowid };
    },
    deleteTree(id) {
        const db = (0, connection_1.getDatabase)();
        db.prepare("UPDATE treatments SET is_active = 0 WHERE tree_id = ?").run(id);
        db.prepare("DELETE FROM treatment_trees WHERE id = ?").run(id);
        return { success: true };
    },
    clearAll() {
        const db = (0, connection_1.getDatabase)();
        db.prepare('DELETE FROM treatments').run();
        db.prepare('DELETE FROM treatment_trees').run();
        return { success: true };
    },
};
function buildTree(treatments) {
    const map = new Map();
    const roots = [];
    for (const t of treatments) {
        map.set(t.id, { ...t, children: [] });
    }
    for (const t of treatments) {
        const node = map.get(t.id);
        if (t.parent_id && map.has(t.parent_id)) {
            map.get(t.parent_id).children.push(node);
        }
        else {
            roots.push(node);
        }
    }
    return roots;
}
//# sourceMappingURL=treatment.service.js.map