"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTreatmentHandlers = registerTreatmentHandlers;
const electron_1 = require("electron");
const fs_1 = __importDefault(require("fs"));
const treatment_service_1 = require("../services/treatment.service");
const treatment_json_1 = require("../services/treatment-json");
const seed_1 = require("../database/seed");
function registerTreatmentHandlers() {
    electron_1.ipcMain.handle('treatments:listTrees', () => treatment_service_1.treatmentService.listTrees());
    electron_1.ipcMain.handle('treatments:getTreeWithTreatments', (_, treeId) => treatment_service_1.treatmentService.getTreeWithTreatments(treeId));
    electron_1.ipcMain.handle('treatments:getAllFlat', () => treatment_service_1.treatmentService.getAllTreatmentsFlat());
    electron_1.ipcMain.handle('treatments:getByTree', (_, treeId) => treatment_service_1.treatmentService.getByTree(treeId));
    electron_1.ipcMain.handle('treatments:getById', (_, id) => treatment_service_1.treatmentService.getById(id));
    electron_1.ipcMain.handle('treatments:create', (_, data) => treatment_service_1.treatmentService.create(data));
    electron_1.ipcMain.handle('treatments:update', (_, id, data) => treatment_service_1.treatmentService.update(id, data));
    electron_1.ipcMain.handle('treatments:delete', (_, id) => treatment_service_1.treatmentService.delete(id));
    electron_1.ipcMain.handle('treatments:createTree', (_, name, desc) => treatment_service_1.treatmentService.createTree(name, desc));
    electron_1.ipcMain.handle('treatments:updateTree', (_, id, data) => treatment_service_1.treatmentService.updateTree(id, data));
    electron_1.ipcMain.handle('treatments:deleteTree', (_, id) => treatment_service_1.treatmentService.deleteTree(id));
    electron_1.ipcMain.handle('treatments:importFile', async (event) => {
        const result = await electron_1.dialog.showOpenDialog({
            title: 'Import Treatment Definitions',
            filters: [
                { name: 'Treatment lists (JSON, or legacy TXT)', extensions: ['json', 'txt'] },
            ],
            properties: ['openFile'],
        });
        if (result.canceled || result.filePaths.length === 0)
            return null;
        const content = fs_1.default.readFileSync(result.filePaths[0], 'utf-8');
        return (0, treatment_json_1.importTreatmentContent)(content);
    });
    electron_1.ipcMain.handle('treatments:importContent', (_, content) => (0, treatment_json_1.importTreatmentContent)(content));
    electron_1.ipcMain.handle('treatments:exportFile', async () => {
        const result = await electron_1.dialog.showSaveDialog({
            title: 'Export Treatment List',
            defaultPath: 'treatments.json',
            filters: [{ name: 'JSON', extensions: ['json'] }],
        });
        if (result.canceled || !result.filePath)
            return null;
        const data = (0, treatment_json_1.exportTreatments)();
        fs_1.default.writeFileSync(result.filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
        return { path: result.filePath, categories: data.categories.length };
    });
    electron_1.ipcMain.handle('treatments:loadDefaults', () => (0, seed_1.loadDefaultTreatments)());
    electron_1.ipcMain.handle('treatments:clearAll', () => treatment_service_1.treatmentService.clearAll());
}
//# sourceMappingURL=treatments.ipc.js.map