"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inventoryService = void 0;
const connection_1 = require("../database/connection");
const helpers_1 = require("../database/helpers");
const ITEM_FIELDS = ['name', 'category', 'unit', 'reorder_level', 'unit_cost_paise', 'supplier', 'expiry_date', 'is_active'];
exports.inventoryService = {
    list(filters = {}) {
        let where = 'WHERE is_active = 1';
        const params = [];
        if (filters.search) {
            where += ' AND (name LIKE ? OR category LIKE ? OR supplier LIKE ?)';
            const s = `%${filters.search}%`;
            params.push(s, s, s);
        }
        if (filters.lowOnly)
            where += ' AND quantity <= reorder_level';
        return (0, connection_1.getDatabase)().prepare(`SELECT * FROM inventory_items ${where} ORDER BY name`).all(...params);
    },
    /** Create/update item details. Stock quantity only changes through movements, so there is an audit trail. */
    save(data) {
        const db = (0, connection_1.getDatabase)();
        if (!data.id && !data.name?.trim())
            throw new Error('Item name is required');
        return db.transaction(() => {
            const isNew = !data.id;
            const id = (0, helpers_1.saveRow)('inventory_items', data, ITEM_FIELDS);
            const opening = Number(data.opening_quantity) || 0;
            if (isNew && opening > 0) {
                db.prepare("INSERT INTO inventory_movements (item_id, type, quantity, movement_date, notes) VALUES (?, 'in', ?, ?, 'Opening stock')")
                    .run(id, opening, (0, helpers_1.localDate)());
                db.prepare('UPDATE inventory_items SET quantity = ? WHERE id = ?').run(opening, id);
            }
            return { id };
        })();
    },
    delete(id) {
        return (0, connection_1.getDatabase)().prepare("UPDATE inventory_items SET is_active = 0, updated_at = datetime('now') WHERE id = ?").run(id);
    },
    /** type 'in' adds, 'out' removes, 'adjust' sets the counted quantity. */
    addMovement(data) {
        const db = (0, connection_1.getDatabase)();
        const qty = Number(data.quantity);
        if (!Number.isFinite(qty) || qty < 0 || (qty === 0 && data.type !== 'adjust'))
            throw new Error('Enter a valid quantity');
        return db.transaction(() => {
            const item = db.prepare('SELECT quantity, name FROM inventory_items WHERE id = ?').get(data.item_id);
            if (!item)
                throw new Error('Item not found');
            let next;
            if (data.type === 'in')
                next = item.quantity + qty;
            else if (data.type === 'out')
                next = item.quantity - qty;
            else if (data.type === 'adjust')
                next = qty;
            else
                throw new Error('Unknown movement type');
            if (next < 0)
                throw new Error(`Only ${item.quantity} of ${item.name} in stock`);
            db.prepare('INSERT INTO inventory_movements (item_id, type, quantity, movement_date, notes) VALUES (?, ?, ?, ?, ?)')
                .run(data.item_id, data.type, qty, data.movement_date || (0, helpers_1.localDate)(), data.notes || null);
            db.prepare("UPDATE inventory_items SET quantity = ?, updated_at = datetime('now') WHERE id = ?").run(next, data.item_id);
            return { quantity: next };
        })();
    },
    movements(itemId) {
        return (0, connection_1.getDatabase)().prepare('SELECT * FROM inventory_movements WHERE item_id = ? ORDER BY movement_date DESC, id DESC LIMIT 200').all(itemId);
    },
    lowStock() {
        return (0, connection_1.getDatabase)().prepare('SELECT * FROM inventory_items WHERE is_active = 1 AND quantity <= reorder_level ORDER BY name').all();
    },
};
//# sourceMappingURL=inventory.service.js.map