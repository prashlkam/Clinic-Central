import { ipcMain, dialog } from 'electron';
import fs from 'fs';
import { treatmentService } from '../services/treatment.service';
import { importTreatmentContent, exportTreatments } from '../services/treatment-json';
import { loadDefaultTreatments } from '../database/seed';

export function registerTreatmentHandlers() {
  ipcMain.handle('treatments:listTrees', () => treatmentService.listTrees());
  ipcMain.handle('treatments:getTreeWithTreatments', (_, treeId) => treatmentService.getTreeWithTreatments(treeId));
  ipcMain.handle('treatments:getAllFlat', () => treatmentService.getAllTreatmentsFlat());
  ipcMain.handle('treatments:getByTree', (_, treeId) => treatmentService.getByTree(treeId));
  ipcMain.handle('treatments:getById', (_, id) => treatmentService.getById(id));
  ipcMain.handle('treatments:create', (_, data) => treatmentService.create(data));
  ipcMain.handle('treatments:update', (_, id, data) => treatmentService.update(id, data));
  ipcMain.handle('treatments:delete', (_, id) => treatmentService.delete(id));
  ipcMain.handle('treatments:createTree', (_, name, desc) => treatmentService.createTree(name, desc));
  ipcMain.handle('treatments:updateTree', (_, id, data) => treatmentService.updateTree(id, data));
  ipcMain.handle('treatments:deleteTree', (_, id) => treatmentService.deleteTree(id));

  ipcMain.handle('treatments:importFile', async (event) => {
    const result = await dialog.showOpenDialog({
      title: 'Import Treatment Definitions',
      filters: [
        { name: 'Treatment lists (JSON, or legacy TXT)', extensions: ['json', 'txt'] },
      ],
      properties: ['openFile'],
    });

    if (result.canceled || result.filePaths.length === 0) return null;

    const content = fs.readFileSync(result.filePaths[0], 'utf-8');
    return importTreatmentContent(content);
  });

  ipcMain.handle('treatments:importContent', (_, content: string) => importTreatmentContent(content));

  ipcMain.handle('treatments:exportFile', async () => {
    const result = await dialog.showSaveDialog({
      title: 'Export Treatment List',
      defaultPath: 'treatments.json',
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (result.canceled || !result.filePath) return null;
    const data = exportTreatments();
    fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
    return { path: result.filePath, categories: data.categories.length };
  });

  ipcMain.handle('treatments:loadDefaults', () => loadDefaultTreatments());

  ipcMain.handle('treatments:clearAll', () => treatmentService.clearAll());
}
