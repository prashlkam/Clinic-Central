import { ipcMain } from 'electron';
import { doctorService } from '../services/doctor.service';

export function registerDoctorHandlers() {
  ipcMain.handle('doctor:isRegistered', () => {
    return doctorService.isRegistered();
  });

  ipcMain.handle('doctor:register', (_, data) => {
    return doctorService.register(data);
  });

  ipcMain.handle('doctor:login', (_, password: string) => {
    return doctorService.login(password);
  });

  ipcMain.handle('doctor:getProfile', () => {
    return doctorService.getProfile();
  });

  ipcMain.handle('doctor:updateProfile', (_, data) => {
    return doctorService.updateProfile(data);
  });

  ipcMain.handle('doctor:changePassword', (_, oldPassword: string, newPassword: string) => {
    return doctorService.changePassword(oldPassword, newPassword);
  });
}
