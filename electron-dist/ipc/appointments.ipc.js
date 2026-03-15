"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAppointmentHandlers = registerAppointmentHandlers;
const electron_1 = require("electron");
const appointment_service_1 = require("../services/appointment.service");
function registerAppointmentHandlers() {
    electron_1.ipcMain.handle('appointments:list', (_, filters) => appointment_service_1.appointmentService.list(filters));
    electron_1.ipcMain.handle('appointments:getById', (_, id) => appointment_service_1.appointmentService.getById(id));
    electron_1.ipcMain.handle('appointments:create', (_, data) => appointment_service_1.appointmentService.create(data));
    electron_1.ipcMain.handle('appointments:update', (_, id, data) => appointment_service_1.appointmentService.update(id, data));
    electron_1.ipcMain.handle('appointments:delete', (_, id) => appointment_service_1.appointmentService.delete(id));
    electron_1.ipcMain.handle('appointments:getUpcoming', (_, limit) => appointment_service_1.appointmentService.getUpcoming(limit));
    electron_1.ipcMain.handle('appointments:getTodays', () => appointment_service_1.appointmentService.getTodaysAppointments());
}
//# sourceMappingURL=appointments.ipc.js.map