"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerClinicHandlers = registerClinicHandlers;
const electron_1 = require("electron");
const clinical_service_1 = require("../services/clinical.service");
const plan_service_1 = require("../services/plan.service");
const prescription_service_1 = require("../services/prescription.service");
const lab_service_1 = require("../services/lab.service");
const consent_service_1 = require("../services/consent.service");
const inventory_service_1 = require("../services/inventory.service");
const membership_service_1 = require("../services/membership.service");
const analytics_service_1 = require("../services/analytics.service");
const file_service_1 = require("../services/file.service");
/** Expose every function of a service as the IPC channel `<namespace>:<functionName>`. */
function registerService(namespace, service) {
    for (const name of Object.keys(service)) {
        if (typeof service[name] !== 'function')
            continue;
        electron_1.ipcMain.handle(`${namespace}:${name}`, (_event, ...args) => service[name](...args));
    }
}
function registerClinicHandlers() {
    registerService('notes', clinical_service_1.notesService);
    registerService('teeth', clinical_service_1.toothService);
    registerService('plans', plan_service_1.planService);
    registerService('medicines', prescription_service_1.medicineService);
    registerService('prescriptions', prescription_service_1.prescriptionService);
    registerService('rxTemplates', prescription_service_1.rxTemplateService);
    registerService('lab', lab_service_1.labService);
    registerService('consents', consent_service_1.consentService);
    registerService('inventory', inventory_service_1.inventoryService);
    registerService('memberships', membership_service_1.membershipService);
    registerService('analytics', analytics_service_1.analyticsService);
    // Files: the renderer never supplies source paths; they always come from the native picker.
    const { addFiles, ...safeFileService } = file_service_1.fileService;
    registerService('files', safeFileService);
    electron_1.ipcMain.handle('files:pick', async (_event, patientId, category, notes) => {
        const result = await electron_1.dialog.showOpenDialog({
            title: 'Attach files to patient record',
            properties: ['openFile', 'multiSelections'],
            filters: [
                { name: 'Images and documents', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'pdf', 'dcm', 'txt', 'doc', 'docx'] },
                { name: 'All files', extensions: ['*'] },
            ],
        });
        if (result.canceled || result.filePaths.length === 0)
            return null;
        return addFiles(patientId, result.filePaths, category, notes);
    });
    electron_1.ipcMain.handle('app:dataFolder', () => ({ userData: electron_1.app.getPath('userData'), files: (0, file_service_1.getFilesRoot)() }));
    electron_1.ipcMain.handle('app:openDataFolder', () => electron_1.shell.openPath(electron_1.app.getPath('userData')));
}
//# sourceMappingURL=clinic.ipc.js.map