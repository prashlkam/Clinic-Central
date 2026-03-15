import { ipcMain } from 'electron';
import { appointmentService } from '../services/appointment.service';

export function registerAppointmentHandlers() {
  ipcMain.handle('appointments:list', (_, filters) => appointmentService.list(filters));
  ipcMain.handle('appointments:getById', (_, id) => appointmentService.getById(id));
  ipcMain.handle('appointments:create', (_, data) => appointmentService.create(data));
  ipcMain.handle('appointments:update', (_, id, data) => appointmentService.update(id, data));
  ipcMain.handle('appointments:delete', (_, id) => appointmentService.delete(id));
  ipcMain.handle('appointments:getUpcoming', (_, limit) => appointmentService.getUpcoming(limit));
  ipcMain.handle('appointments:getTodays', () => appointmentService.getTodaysAppointments());
}
