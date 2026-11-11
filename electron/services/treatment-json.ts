import { getDatabase } from '../database/connection';
import { parseTreatmentFile } from './treatment-tree-parser';

export interface TreatmentNode {
  name: string;
  cost?: number;        // rupees
  duration?: number;    // minutes
  description?: string;
  children?: TreatmentNode[];
}

export interface TreatmentCategory {
  name: string;
  description?: string;
  treatments: TreatmentNode[];
}

export interface TreatmentFile {
  version: number;
  currency?: string;
  description?: string;
  categories: TreatmentCategory[];
}

function validateNode(node: any, where: string): TreatmentNode {
  if (!node || typeof node !== 'object') throw new Error(`${where}: each treatment must be an object`);
  if (typeof node.name !== 'string' || !node.name.trim()) throw new Error(`${where}: treatment is missing a "name"`);
  const at = `${where} > ${node.name}`;
  const cost = node.cost === undefined || node.cost === null ? 0 : Number(node.cost);
  const duration = node.duration === undefined || node.duration === null ? 30 : Number(node.duration);
  if (!Number.isFinite(cost) || cost < 0) throw new Error(`${at}: "cost" must be a non-negative number`);
  if (!Number.isFinite(duration) || duration <= 0) throw new Error(`${at}: "duration" must be a positive number of minutes`);
  if (node.children !== undefined && !Array.isArray(node.children)) throw new Error(`${at}: "children" must be an array`);
  return {
    name: node.name.trim(),
    cost,
    duration: Math.round(duration),
    description: typeof node.description === 'string' ? node.description : undefined,
    children: (node.children || []).map((c: any) => validateNode(c, at)),
  };
}

/** Parse and validate the JSON treatment list format. */
export function parseTreatmentJson(content: string): TreatmentFile {
  let raw: any;
  try {
    raw = JSON.parse(content);
  } catch (e: any) {
    throw new Error(`Not valid JSON: ${e.message}`);
  }
  if (!raw || !Array.isArray(raw.categories)) {
    throw new Error('Treatment file must be an object with a "categories" array');
  }
  const categories = raw.categories.map((c: any, i: number) => {
    if (!c || typeof c.name !== 'string' || !c.name.trim()) throw new Error(`Category #${i + 1} is missing a "name"`);
    if (c.treatments !== undefined && !Array.isArray(c.treatments)) throw new Error(`${c.name}: "treatments" must be an array`);
    return {
      name: c.name.trim(),
      description: typeof c.description === 'string' ? c.description : undefined,
      treatments: (c.treatments || []).map((t: any) => validateNode(t, c.name)),
    };
  });
  return { version: Number(raw.version) || 1, currency: 'INR', categories };
}

/** Convert the legacy indented .txt format into the JSON structure. */
export function legacyTextToJson(content: string): TreatmentFile {
  const categories = parseTreatmentFile(content).map(tree => {
    const roots: TreatmentNode[] = [];
    const stack: TreatmentNode[] = [];
    for (const t of tree.treatments) {
      const node: TreatmentNode = { name: t.name, cost: t.cost || 0, duration: t.duration || 30, children: [] };
      const depth = Math.max(0, t.depth - 1); // depth 1 = directly under TREE:
      const parent = depth > 0 ? stack[depth - 1] : undefined;
      (parent ? parent.children! : roots).push(node);
      stack[depth] = node;
      stack.length = depth + 1;
    }
    return { name: tree.name, treatments: roots };
  });
  return { version: 1, currency: 'INR', categories };
}

/** Import a treatment list. Categories/treatments that already exist (same name, same parent) are kept, not duplicated. */
export function importTreatments(file: TreatmentFile) {
  const db = getDatabase();
  let treesCreated = 0;
  let treatmentsCreated = 0;
  let skipped = 0;

  const getTree = db.prepare('SELECT id FROM treatment_trees WHERE name = ?');
  const insertTree = db.prepare('INSERT INTO treatment_trees (name, description) VALUES (?, ?)');
  const findTreatment = db.prepare(
    'SELECT id FROM treatments WHERE tree_id = ? AND parent_id IS ? AND name = ? AND is_active = 1'
  );
  const insertTreatment = db.prepare(`
    INSERT INTO treatments (tree_id, parent_id, name, description, estimated_cost_paise, duration_minutes, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  db.transaction(() => {
    for (const cat of file.categories) {
      let tree = getTree.get(cat.name) as any;
      if (!tree) {
        tree = { id: Number(insertTree.run(cat.name, cat.description || null).lastInsertRowid) };
        treesCreated++;
      }
      let order = 0;
      const walk = (nodes: TreatmentNode[], parentId: number | null) => {
        for (const n of nodes) {
          const existing = findTreatment.get(tree.id, parentId, n.name) as any;
          let id: number;
          if (existing) {
            id = existing.id;
            skipped++;
          } else {
            id = Number(insertTreatment.run(
              tree.id, parentId, n.name, n.description || null,
              Math.round((n.cost || 0) * 100), n.duration || 30, order
            ).lastInsertRowid);
            treatmentsCreated++;
          }
          order++;
          if (n.children?.length) walk(n.children, id);
        }
      };
      walk(cat.treatments, null);
    }
  })();

  return { treesCreated, treatmentsCreated, skipped };
}

/** Import from file content: JSON (preferred) or the legacy text format. */
export function importTreatmentContent(content: string) {
  const text = content.replace(/^﻿/, '');
  const file = /^\s*[{[]/.test(text) ? parseTreatmentJson(text) : legacyTextToJson(text);
  if (file.categories.length === 0) throw new Error('No treatment categories found in the file');
  return importTreatments(file);
}

/** Export the current (active) treatment list in the JSON format. */
export function exportTreatments(): TreatmentFile {
  const db = getDatabase();
  const trees = db.prepare('SELECT * FROM treatment_trees ORDER BY id').all() as any[];
  const rows = db.prepare('SELECT * FROM treatments WHERE is_active = 1 ORDER BY sort_order, id').all() as any[];

  const build = (treeId: number, parentId: number | null): TreatmentNode[] =>
    rows.filter(r => r.tree_id === treeId && (r.parent_id ?? null) === parentId).map(r => {
      const node: TreatmentNode = { name: r.name, cost: r.estimated_cost_paise / 100, duration: r.duration_minutes };
      if (r.description) node.description = r.description;
      const children = build(treeId, r.id);
      if (children.length) node.children = children;
      return node;
    });

  return {
    version: 1,
    currency: 'INR',
    categories: trees.map(t => ({
      name: t.name,
      ...(t.description ? { description: t.description } : {}),
      treatments: build(t.id, null),
    })),
  };
}
