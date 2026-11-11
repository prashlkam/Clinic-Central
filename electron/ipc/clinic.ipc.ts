import { ipcMain, dialog, shell, app } from 'electron';
import { notesService, toothService } from '../services/clinical.service';
import { planService } from '../services/plan.service';
import { medicineService, prescriptionService, rxTemplateService } from '../services/prescription.service';
import { labService } from '../services/lab.service';
import { consentService } from '../services/consent.service';
import { inventoryService } from '../services/inventory.service';
import { membershipService } from '../services/membership.service';
import { analyticsService } from '../services/analytics.service';
import { fileService, getFilesRoot } from '../services/file.service';

/** Expose every function of a service as the IPC channel `<namespace>:<functionName>`. */
function registerService(namespace: string, service: Record<string, any>) {
  for (const name of Object.keys(service)) {
    if (typeof service[name] !== 'function') continue;
    ipcMain.handle(`${namespace}:${name}`, (_event, ...args) => service[name](...args));
  }
}

export function registerClinicHandlers() {
  registerService('notes', notesService);
  registerService('teeth', toothService);
  registerService('plans', planService);
  registerService('medicines', medicineService);
  registerService('prescriptions', prescriptionService);
  registerService('rxTemplates', rxTemplateService);
  registerService('lab', labService);
  registerService('consents', consentService);
  registerService('inventory', inventoryService);
  registerService('memberships', membershipService);
  registerService('analytics', analyticsService);

  // Files: the renderer never supplies source paths; they always come from the native picker.
  const { addFiles, ...safeFileService } = fileService;
  registerService('files', safeFileService);
  ipcMain.handle('files:pick', async (_event, patientId: number, category?: string, notes?: string) => {
    const result = await dialog.showOpenDialog({
      title: 'Attach files to patient record',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Images and documents', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'pdf', 'dcm', 'txt', 'doc', 'docx'] },
        { name: 'All files', extensions: ['*'] },
      ],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return addFiles(patientId, result.filePaths, category, notes);
  });

  ipcMain.handle('app:dataFolder', () => ({ userData: app.getPath('userData'), files: getFilesRoot() }));
  ipcMain.handle('app:openDataFolder', () => shell.openPath(app.getPath('userData')));
}
