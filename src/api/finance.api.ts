import { ReportFilters, TransactionFilters } from '../types/finance.types';

const invoke = window.electronAPI.invoke;

export const invoicesApi = {
  list: (filters?: any) => invoke('invoices:list', filters),
  getById: (id: number) => invoke('invoices:getById', id),
  create: (data: any) => invoke('invoices:create', data),
  updateStatus: (id: number, status: string) => invoke('invoices:updateStatus', id, status),
  delete: (id: number) => invoke('invoices:delete', id),
};

export const transactionsApi = {
  list: (filters?: TransactionFilters) => invoke('transactions:list', filters),
  create: (data: any) => invoke('transactions:create', data),
  delete: (id: number) => invoke('transactions:delete', id),
  getPatientAdvanceBalance: (patientId: number) => invoke('transactions:getPatientAdvanceBalance', patientId),
  applyAdvanceToInvoice: (data: any) => invoke('transactions:applyAdvanceToInvoice', data),
  getExpenseCategories: () => invoke('transactions:getExpenseCategories'),
  createExpenseCategory: (name: string) => invoke('transactions:createExpenseCategory', name),
};

export const reportsApi = {
  incomeStatement: (filters: ReportFilters) => invoke('reports:incomeStatement', filters),
  balanceSheet: (asOfDate: string) => invoke('reports:balanceSheet', asOfDate),
  outstandingReceivables: (filters?: any) => invoke('reports:outstandingReceivables', filters),
  expenseBreakdown: (filters: ReportFilters) => invoke('reports:expenseBreakdown', filters),
  patientLedger: (patientId: number) => invoke('reports:patientLedger', patientId),
  dashboardStats: () => invoke('reports:dashboardStats'),
};

export const excelApi = {
  exportPatients: () => invoke('excel:exportPatients'),
  exportAppointments: (filters?: any) => invoke('excel:exportAppointments', filters),
  exportTransactions: (filters?: any) => invoke('excel:exportTransactions', filters),
  exportInvoices: (filters?: any) => invoke('excel:exportInvoices', filters),
  exportReport: (reportData: any) => invoke('excel:exportReport', reportData),
  importPatients: () => invoke('excel:importPatients'),
  importTransactions: () => invoke('excel:importTransactions'),
};

export const settingsApi = {
  getAll: () => invoke('settings:getAll'),
  set: (key: string, value: string) => invoke('settings:set', key, value),
  setMultiple: (data: Record<string, string>) => invoke('settings:setMultiple', data),
};

export const backupApi = {
  create: () => invoke('backup:create'),
  restore: () => invoke('backup:restore'),
  lastInfo: () => invoke('backup:lastInfo'),
};
