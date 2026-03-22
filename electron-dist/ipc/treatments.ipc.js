"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTreatmentHandlers = registerTreatmentHandlers;
const electron_1 = require("electron");
const fs_1 = __importDefault(require("fs"));
const treatment_service_1 = require("../services/treatment.service");
const treatment_tree_parser_1 = require("../services/treatment-tree-parser");
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
            filters: [{ name: 'Text Files', extensions: ['txt'] }],
            properties: ['openFile'],
        });
        if (result.canceled || result.filePaths.length === 0)
            return null;
        const content = fs_1.default.readFileSync(result.filePaths[0], 'utf-8');
        return (0, treatment_tree_parser_1.importTreatmentTrees)(content);
    });
    electron_1.ipcMain.handle('treatments:importContent', (_, content) => {
        return (0, treatment_tree_parser_1.importTreatmentTrees)(content);
    });
    electron_1.ipcMain.handle('treatments:clearAll', () => treatment_service_1.treatmentService.clearAll());
}
//# sourceMappingURL=treatments.ipc.js.map