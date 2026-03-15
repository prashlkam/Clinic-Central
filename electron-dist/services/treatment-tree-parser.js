"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseTreatmentFile = parseTreatmentFile;
exports.importTreatmentTrees = importTreatmentTrees;
const connection_1 = require("../database/connection");
function parseTreatmentFile(content) {
    const trees = [];
    let currentTree = null;
    const lines = content.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#'))
            continue;
        if (trimmed.startsWith('TREE:')) {
            const name = trimmed.substring(5).trim();
            currentTree = { name, treatments: [] };
            trees.push(currentTree);
            continue;
        }
        if (!currentTree)
            continue;
        // Count leading spaces for depth
        const leadingSpaces = line.length - line.trimStart().length;
        const depth = Math.floor(leadingSpaces / 2);
        // Parse: name | cost | duration
        const parts = trimmed.split('|').map(p => p.trim());
        const name = parts[0];
        const cost = parts[1] ? parseInt(parts[1], 10) : 0;
        const duration = parts[2] ? parseInt(parts[2], 10) : 30;
        currentTree.treatments.push({ name, cost, duration, depth });
    }
    return trees;
}
function importTreatmentTrees(content) {
    const db = (0, connection_1.getDatabase)();
    const parsed = parseTreatmentFile(content);
    let treesCreated = 0;
    let treatmentsCreated = 0;
    const insertTree = db.prepare('INSERT OR IGNORE INTO treatment_trees (name) VALUES (?)');
    const getTreeId = db.prepare('SELECT id FROM treatment_trees WHERE name = ?');
    const insertTreatment = db.prepare(`
    INSERT INTO treatments (tree_id, parent_id, name, estimated_cost_paise, duration_minutes, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
    const transaction = db.transaction(() => {
        for (const tree of parsed) {
            insertTree.run(tree.name);
            const treeRow = getTreeId.get(tree.name);
            const treeId = treeRow.id;
            treesCreated++;
            // Stack: depth -> last inserted ID at that depth
            const stack = new Map();
            for (let i = 0; i < tree.treatments.length; i++) {
                const t = tree.treatments[i];
                let parentId = null;
                if (t.depth > 0) {
                    parentId = stack.get(t.depth - 1) || null;
                }
                const result = insertTreatment.run(treeId, parentId, t.name, t.cost * 100, // Convert INR to paise
                t.duration, i);
                stack.set(t.depth, Number(result.lastInsertRowid));
                treatmentsCreated++;
            }
        }
    });
    transaction();
    return { treesCreated, treatmentsCreated };
}
//# sourceMappingURL=treatment-tree-parser.js.map