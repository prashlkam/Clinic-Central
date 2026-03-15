import { ipcMain, dialog } from 'electron';
import { getDatabase } from '../database/connection';
import { backupService } from '../services/backup.service';

export function registerSettingsHandlers() {
  ipcMain.handle('settings:getAll', () => {
    const db = getDatabase();
    const rows = db.prepare('SELECT key, value FROM settings').all() as any[];
    const settings: Record<string, string> = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    return settings;
  });

  ipcMain.handle('settings:set', (_, key: string, value: string) => {
    const db = getDatabase();
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
    return { success: true };
  });

  ipcMain.handle('settings:setMultiple', (_, data: Record<string, string>) => {
    const db = getDatabase();
    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    const transaction = db.transaction(() => {
      for (const [key, value] of Object.entries(data)) {
        stmt.run(key, value);
      }
    });
    transaction();
    return { success: true };
  });

  ipcMain.handle('backup:create', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select Backup Destination',
      properties: ['openDirectory'],
    });

    if (result.canceled || result.filePaths.length === 0) return null;

    const backupPath = backupService.createBackup(result.filePaths[0]);
    backupService.recordBackup();
    return { path: backupPath };
  });

  ipcMain.handle('backup:restore', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select Backup File to Restore',
      filters: [{ name: 'Database Files', extensions: ['db'] }],
      properties: ['openFile'],
    });

    if (result.canceled || result.filePaths.length === 0) return null;

    backupService.restoreBackup(result.filePaths[0]);
    return { success: true, message: 'Backup restored. Please restart the application.' };
  });

  ipcMain.handle('backup:lastInfo', () => backupService.getLastBackupInfo());
}
