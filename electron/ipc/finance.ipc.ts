import { ipcMain } from 'electron';
import { invoiceService } from '../services/invoice.service';
import { transactionService } from '../services/transaction.service';
import { reportService } from '../services/report.service';

export function registerFinanceHandlers() {
  // Invoices
  ipcMain.handle('invoices:list', (_, filters) => invoiceService.list(filters));
  ipcMain.handle('invoices:getById', (_, id) => invoiceService.getById(id));
  ipcMain.handle('invoices:create', (_, data) => invoiceService.create(data));
  ipcMain.handle('invoices:updateStatus', (_, id, status) => invoiceService.updateStatus(id, status));
  ipcMain.handle('invoices:delete', (_, id) => invoiceService.delete(id));

  // Transactions
  ipcMain.handle('transactions:list', (_, filters) => transactionService.list(filters));
  ipcMain.handle('transactions:create', (_, data) => transactionService.create(data));
  ipcMain.handle('transactions:delete', (_, id) => transactionService.delete(id));
  ipcMain.handle('transactions:getExpenseCategories', () => transactionService.getExpenseCategories());
  ipcMain.handle('transactions:createExpenseCategory', (_, name) => transactionService.createExpenseCategory(name));

  // Reports
  ipcMain.handle('reports:incomeStatement', (_, filters) => reportService.getIncomeStatement(filters));
  ipcMain.handle('reports:balanceSheet', (_, asOfDate) => reportService.getBalanceSheet(asOfDate));
  ipcMain.handle('reports:outstandingReceivables', (_, filters) => reportService.getOutstandingReceivables(filters));
  ipcMain.handle('reports:expenseBreakdown', (_, filters) => reportService.getExpenseBreakdown(filters));
  ipcMain.handle('reports:patientLedger', (_, patientId) => reportService.getPatientLedger(patientId));
  ipcMain.handle('reports:dashboardStats', () => reportService.getDashboardStats());
}
