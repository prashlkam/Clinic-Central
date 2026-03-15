import { ipcMain } from 'electron';
import { patientService } from '../services/patient.service';

export function registerPatientHandlers() {
  ipcMain.handle('patients:list', (_, filters) => patientService.list(filters));
  ipcMain.handle('patients:getById', (_, id) => patientService.getById(id));
  ipcMain.handle('patients:getAll', () => patientService.getAll());
  ipcMain.handle('patients:create', (_, data) => patientService.create(data));
  ipcMain.handle('patients:update', (_, id, data) => patientService.update(id, data));
  ipcMain.handle('patients:delete', (_, id) => patientService.softDelete(id));
}
