"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDoctorHandlers = registerDoctorHandlers;
const electron_1 = require("electron");
const doctor_service_1 = require("../services/doctor.service");
function registerDoctorHandlers() {
    electron_1.ipcMain.handle('doctor:isRegistered', () => {
        return doctor_service_1.doctorService.isRegistered();
    });
    electron_1.ipcMain.handle('doctor:register', (_, data) => {
        return doctor_service_1.doctorService.register(data);
    });
    electron_1.ipcMain.handle('doctor:login', (_, password) => {
        return doctor_service_1.doctorService.login(password);
    });
    electron_1.ipcMain.handle('doctor:getProfile', () => {
        return doctor_service_1.doctorService.getProfile();
    });
    electron_1.ipcMain.handle('doctor:updateProfile', (_, data) => {
        return doctor_service_1.doctorService.updateProfile(data);
    });
    electron_1.ipcMain.handle('doctor:changePassword', (_, oldPassword, newPassword) => {
        return doctor_service_1.doctorService.changePassword(oldPassword, newPassword);
    });
}
//# sourceMappingURL=doctor.ipc.js.map