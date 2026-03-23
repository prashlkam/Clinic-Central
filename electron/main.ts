import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { runMigrations } from './database/migrate';
import { closeDatabase } from './database/connection';
import { registerPatientHandlers } from './ipc/patients.ipc';
import { registerTreatmentHandlers } from './ipc/treatments.ipc';
import { registerAppointmentHandlers } from './ipc/appointments.ipc';
import { registerFinanceHandlers } from './ipc/finance.ipc';
import { registerSettingsHandlers } from './ipc/settings.ipc';
import { registerExcelHandlers } from './ipc/excel.ipc';
import { registerDoctorHandlers } from './ipc/doctor.ipc';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    title: 'Clinic Central',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '../resources/icon.png'),
  });

  // In dev mode (with Vite dev server), load from URL; otherwise load built files
  const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Run database migrations
  runMigrations();

  // Register all IPC handlers
  registerPatientHandlers();
  registerTreatmentHandlers();
  registerAppointmentHandlers();
  registerFinanceHandlers();
  registerSettingsHandlers();
  registerExcelHandlers();
  registerDoctorHandlers();

  ipcMain.handle('app:version', () => app.getVersion());

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  closeDatabase();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
