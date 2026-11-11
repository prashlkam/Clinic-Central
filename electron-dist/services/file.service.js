"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileService = void 0;
exports.getFilesRoot = getFilesRoot;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const electron_1 = require("electron");
const connection_1 = require("../database/connection");
const MIME = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp',
    '.bmp': 'image/bmp', '.pdf': 'application/pdf', '.txt': 'text/plain', '.dcm': 'application/dicom',
    '.doc': 'application/msword', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};
const MAX_PREVIEW_BYTES = 20 * 1024 * 1024;
/** All patient attachments live under <userData>/patient-files/<patientId>/ on this computer. */
function getFilesRoot() {
    return path_1.default.join(electron_1.app.getPath('userData'), 'patient-files');
}
function filePath(row) {
    return path_1.default.join(getFilesRoot(), String(row.patient_id), row.stored_name);
}
function getRow(id) {
    const row = (0, connection_1.getDatabase)().prepare('SELECT * FROM patient_files WHERE id = ?').get(id);
    if (!row)
        throw new Error('File record not found');
    return row;
}
exports.fileService = {
    list(patientId) {
        return (0, connection_1.getDatabase)().prepare('SELECT * FROM patient_files WHERE patient_id = ? ORDER BY created_at DESC, id DESC').all(patientId);
    },
    /** Copy the chosen files into the app's data folder and record them. */
    addFiles(patientId, sourcePaths, category = 'other', notes) {
        const db = (0, connection_1.getDatabase)();
        const dir = path_1.default.join(getFilesRoot(), String(patientId));
        fs_1.default.mkdirSync(dir, { recursive: true });
        const insert = db.prepare(`
      INSERT INTO patient_files (patient_id, category, original_name, stored_name, mime_type, size_bytes, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
        let added = 0;
        for (const src of sourcePaths) {
            const ext = path_1.default.extname(src).toLowerCase();
            const stored = `${crypto_1.default.randomUUID()}${ext}`;
            fs_1.default.copyFileSync(src, path_1.default.join(dir, stored));
            const size = fs_1.default.statSync(path_1.default.join(dir, stored)).size;
            insert.run(patientId, category, path_1.default.basename(src), stored, MIME[ext] || 'application/octet-stream', size, notes || null);
            added++;
        }
        return { added };
    },
    /** Image content as a data URL for in-app preview (null for non-images / very large files). */
    getPreview(id) {
        const row = getRow(id);
        if (!row.mime_type?.startsWith('image/') || row.size_bytes > MAX_PREVIEW_BYTES)
            return null;
        const p = filePath(row);
        if (!fs_1.default.existsSync(p))
            return null;
        return `data:${row.mime_type};base64,${fs_1.default.readFileSync(p).toString('base64')}`;
    },
    /** Open with the operating system's default viewer. */
    async open(id) {
        const p = filePath(getRow(id));
        if (!fs_1.default.existsSync(p))
            throw new Error('The file is missing from the data folder');
        const err = await electron_1.shell.openPath(p);
        if (err)
            throw new Error(err);
        return { success: true };
    },
    update(id, data) {
        const row = getRow(id);
        (0, connection_1.getDatabase)().prepare('UPDATE patient_files SET category = ?, notes = ? WHERE id = ?')
            .run(data.category ?? row.category, data.notes ?? row.notes, id);
        return { success: true };
    },
    delete(id) {
        const row = getRow(id);
        const p = filePath(row);
        (0, connection_1.getDatabase)().prepare('DELETE FROM patient_files WHERE id = ?').run(id);
        if (fs_1.default.existsSync(p))
            fs_1.default.unlinkSync(p);
        return { success: true };
    },
};
//# sourceMappingURL=file.service.js.map