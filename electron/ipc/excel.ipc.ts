import { ipcMain, dialog } from 'electron';
import { excelService } from '../services/excel.service';

export function registerExcelHandlers() {
  ipcMain.handle('excel:exportPatients', async () => {
    const result = await dialog.showSaveDialog({
      title: 'Export Patients',
      defaultPath: `patients-${new Date().toISOString().split('T')[0]}.xlsx`,
      filters: [{ name: 'Excel Files', extensions: ['xlsx'] }],
    });
    if (result.canceled || !result.filePath) return null;
    return excelService.exportPatients(result.filePath);
  });

  ipcMain.handle('excel:exportAppointments', async (_, filters) => {
    const result = await dialog.showSaveDialog({
      title: 'Export Appointments',
      defaultPath: `appointments-${new Date().toISOString().split('T')[0]}.xlsx`,
      filters: [{ name: 'Excel Files', extensions: ['xlsx'] }],
    });
    if (result.canceled || !result.filePath) return null;
    return excelService.exportAppointments(result.filePath, filters);
  });

  ipcMain.handle('excel:exportTransactions', async (_, filters) => {
    const result = await dialog.showSaveDialog({
      title: 'Export Transactions',
      defaultPath: `transactions-${new Date().toISOString().split('T')[0]}.xlsx`,
      filters: [{ name: 'Excel Files', extensions: ['xlsx'] }],
    });
    if (result.canceled || !result.filePath) return null;
    return excelService.exportTransactions(result.filePath, filters);
  });

  ipcMain.handle('excel:exportInvoices', async (_, filters) => {
    const result = await dialog.showSaveDialog({
      title: 'Export Invoices',
      defaultPath: `invoices-${new Date().toISOString().split('T')[0]}.xlsx`,
      filters: [{ name: 'Excel Files', extensions: ['xlsx'] }],
    });
    if (result.canceled || !result.filePath) return null;
    return excelService.exportInvoices(result.filePath, filters);
  });

  ipcMain.handle('excel:exportReport', async (_, reportData) => {
    const result = await dialog.showSaveDialog({
      title: 'Export Report',
      defaultPath: `report-${new Date().toISOString().split('T')[0]}.xlsx`,
      filters: [{ name: 'Excel Files', extensions: ['xlsx'] }],
    });
    if (result.canceled || !result.filePath) return null;
    await excelService.exportReport(result.filePath, reportData);
    return { success: true };
  });

  ipcMain.handle('excel:importPatients', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Import Patients from Excel',
      filters: [{ name: 'Excel Files', extensions: ['xlsx', 'xls'] }],
      properties: ['openFile'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return excelService.importPatients(result.filePaths[0]);
  });

  ipcMain.handle('excel:importTransactions', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Import Transactions from Excel',
      filters: [{ name: 'Excel Files', extensions: ['xlsx', 'xls'] }],
      properties: ['openFile'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return excelService.importTransactions(result.filePaths[0]);
  });
}
