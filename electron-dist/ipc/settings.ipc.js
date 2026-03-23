"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSettingsHandlers = registerSettingsHandlers;
const electron_1 = require("electron");
const connection_1 = require("../database/connection");
const backup_service_1 = require("../services/backup.service");
function registerSettingsHandlers() {
    electron_1.ipcMain.handle('settings:getAll', () => {
        const db = (0, connection_1.getDatabase)();
        const rows = db.prepare('SELECT key, value FROM settings').all();
        const settings = {};
        rows.forEach(r => { settings[r.key] = r.value; });
        return settings;
    });
    electron_1.ipcMain.handle('settings:set', (_, key, value) => {
        const db = (0, connection_1.getDatabase)();
        db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
        return { success: true };
    });
    electron_1.ipcMain.handle('settings:setMultiple', (_, data) => {
        const db = (0, connection_1.getDatabase)();
        const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
        const transaction = db.transaction(() => {
            for (const [key, value] of Object.entries(data)) {
                stmt.run(key, value);
            }
        });
        transaction();
        return { success: true };
    });
    electron_1.ipcMain.handle('backup:create', async () => {
        const result = await electron_1.dialog.showOpenDialog({
            title: 'Select Backup Destination',
            properties: ['openDirectory'],
        });
        if (result.canceled || result.filePaths.length === 0)
            return null;
        const backupPath = backup_service_1.backupService.createBackup(result.filePaths[0]);
        backup_service_1.backupService.recordBackup();
        return { path: backupPath };
    });
    electron_1.ipcMain.handle('backup:restore', async () => {
        const result = await electron_1.dialog.showOpenDialog({
            title: 'Select Backup File to Restore',
            filters: [{ name: 'Database Files', extensions: ['db'] }],
            properties: ['openFile'],
        });
        if (result.canceled || result.filePaths.length === 0)
            return null;
        backup_service_1.backupService.restoreBackup(result.filePaths[0]);
        return { success: true, message: 'Backup restored. Please restart the application.' };
    });
    electron_1.ipcMain.handle('backup:lastInfo', () => backup_service_1.backupService.getLastBackupInfo());
    electron_1.ipcMain.handle('backup:factoryReset', () => {
        backup_service_1.backupService.factoryReset();
        return { success: true, message: 'Factory reset complete. Please restart the application.' };
    });
}
//# sourceMappingURL=settings.ipc.js.map