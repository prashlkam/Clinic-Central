"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerExcelHandlers = registerExcelHandlers;
const electron_1 = require("electron");
const excel_service_1 = require("../services/excel.service");
function registerExcelHandlers() {
    electron_1.ipcMain.handle('excel:exportPatients', async () => {
        const result = await electron_1.dialog.showSaveDialog({
            title: 'Export Patients',
            defaultPath: `patients-${new Date().toISOString().split('T')[0]}.xlsx`,
            filters: [{ name: 'Excel Files', extensions: ['xlsx'] }],
        });
        if (result.canceled || !result.filePath)
            return null;
        return excel_service_1.excelService.exportPatients(result.filePath);
    });
    electron_1.ipcMain.handle('excel:exportAppointments', async (_, filters) => {
        const result = await electron_1.dialog.showSaveDialog({
            title: 'Export Appointments',
            defaultPath: `appointments-${new Date().toISOString().split('T')[0]}.xlsx`,
            filters: [{ name: 'Excel Files', extensions: ['xlsx'] }],
        });
        if (result.canceled || !result.filePath)
            return null;
        return excel_service_1.excelService.exportAppointments(result.filePath, filters);
    });
    electron_1.ipcMain.handle('excel:exportTransactions', async (_, filters) => {
        const result = await electron_1.dialog.showSaveDialog({
            title: 'Export Transactions',
            defaultPath: `transactions-${new Date().toISOString().split('T')[0]}.xlsx`,
            filters: [{ name: 'Excel Files', extensions: ['xlsx'] }],
        });
        if (result.canceled || !result.filePath)
            return null;
        return excel_service_1.excelService.exportTransactions(result.filePath, filters);
    });
    electron_1.ipcMain.handle('excel:exportInvoices', async (_, filters) => {
        const result = await electron_1.dialog.showSaveDialog({
            title: 'Export Invoices',
            defaultPath: `invoices-${new Date().toISOString().split('T')[0]}.xlsx`,
            filters: [{ name: 'Excel Files', extensions: ['xlsx'] }],
        });
        if (result.canceled || !result.filePath)
            return null;
        return excel_service_1.excelService.exportInvoices(result.filePath, filters);
    });
    electron_1.ipcMain.handle('excel:exportReport', async (_, reportData) => {
        const result = await electron_1.dialog.showSaveDialog({
            title: 'Export Report',
            defaultPath: `report-${new Date().toISOString().split('T')[0]}.xlsx`,
            filters: [{ name: 'Excel Files', extensions: ['xlsx'] }],
        });
        if (result.canceled || !result.filePath)
            return null;
        await excel_service_1.excelService.exportReport(result.filePath, reportData);
        return { success: true };
    });
    electron_1.ipcMain.handle('excel:importPatients', async () => {
        const result = await electron_1.dialog.showOpenDialog({
            title: 'Import Patients from Excel',
            filters: [{ name: 'Excel Files', extensions: ['xlsx', 'xls'] }],
            properties: ['openFile'],
        });
        if (result.canceled || result.filePaths.length === 0)
            return null;
        return excel_service_1.excelService.importPatients(result.filePaths[0]);
    });
    electron_1.ipcMain.handle('excel:importTransactions', async () => {
        const result = await electron_1.dialog.showOpenDialog({
            title: 'Import Transactions from Excel',
            filters: [{ name: 'Excel Files', extensions: ['xlsx', 'xls'] }],
            properties: ['openFile'],
        });
        if (result.canceled || result.filePaths.length === 0)
            return null;
        return excel_service_1.excelService.importTransactions(result.filePaths[0]);
    });
}
//# sourceMappingURL=excel.ipc.js.map