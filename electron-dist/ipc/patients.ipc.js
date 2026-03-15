"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerPatientHandlers = registerPatientHandlers;
const electron_1 = require("electron");
const patient_service_1 = require("../services/patient.service");
function registerPatientHandlers() {
    electron_1.ipcMain.handle('patients:list', (_, filters) => patient_service_1.patientService.list(filters));
    electron_1.ipcMain.handle('patients:getById', (_, id) => patient_service_1.patientService.getById(id));
    electron_1.ipcMain.handle('patients:getAll', () => patient_service_1.patientService.getAll());
    electron_1.ipcMain.handle('patients:create', (_, data) => patient_service_1.patientService.create(data));
    electron_1.ipcMain.handle('patients:update', (_, id, data) => patient_service_1.patientService.update(id, data));
    electron_1.ipcMain.handle('patients:delete', (_, id) => patient_service_1.patientService.softDelete(id));
}
//# sourceMappingURL=patients.ipc.js.map