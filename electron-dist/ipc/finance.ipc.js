"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerFinanceHandlers = registerFinanceHandlers;
const electron_1 = require("electron");
const invoice_service_1 = require("../services/invoice.service");
const transaction_service_1 = require("../services/transaction.service");
const report_service_1 = require("../services/report.service");
function registerFinanceHandlers() {
    // Invoices
    electron_1.ipcMain.handle('invoices:list', (_, filters) => invoice_service_1.invoiceService.list(filters));
    electron_1.ipcMain.handle('invoices:getById', (_, id) => invoice_service_1.invoiceService.getById(id));
    electron_1.ipcMain.handle('invoices:create', (_, data) => invoice_service_1.invoiceService.create(data));
    electron_1.ipcMain.handle('invoices:updateStatus', (_, id, status) => invoice_service_1.invoiceService.updateStatus(id, status));
    electron_1.ipcMain.handle('invoices:delete', (_, id) => invoice_service_1.invoiceService.delete(id));
    // Transactions
    electron_1.ipcMain.handle('transactions:list', (_, filters) => transaction_service_1.transactionService.list(filters));
    electron_1.ipcMain.handle('transactions:create', (_, data) => transaction_service_1.transactionService.create(data));
    electron_1.ipcMain.handle('transactions:delete', (_, id) => transaction_service_1.transactionService.delete(id));
    electron_1.ipcMain.handle('transactions:getPatientAdvanceBalance', (_, patientId) => transaction_service_1.transactionService.getPatientAdvanceBalance(patientId));
    electron_1.ipcMain.handle('transactions:applyAdvanceToInvoice', (_, data) => transaction_service_1.transactionService.applyAdvanceToInvoice(data));
    electron_1.ipcMain.handle('transactions:getExpenseCategories', () => transaction_service_1.transactionService.getExpenseCategories());
    electron_1.ipcMain.handle('transactions:createExpenseCategory', (_, name) => transaction_service_1.transactionService.createExpenseCategory(name));
    // Reports
    electron_1.ipcMain.handle('reports:incomeStatement', (_, filters) => report_service_1.reportService.getIncomeStatement(filters));
    electron_1.ipcMain.handle('reports:balanceSheet', (_, asOfDate) => report_service_1.reportService.getBalanceSheet(asOfDate));
    electron_1.ipcMain.handle('reports:outstandingReceivables', (_, filters) => report_service_1.reportService.getOutstandingReceivables(filters));
    electron_1.ipcMain.handle('reports:expenseBreakdown', (_, filters) => report_service_1.reportService.getExpenseBreakdown(filters));
    electron_1.ipcMain.handle('reports:patientLedger', (_, patientId) => report_service_1.reportService.getPatientLedger(patientId));
    electron_1.ipcMain.handle('reports:dashboardStats', () => report_service_1.reportService.getDashboardStats());
}
//# sourceMappingURL=finance.ipc.js.map