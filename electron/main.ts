import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import path from 'path';
import fs from 'fs';

// One data location no matter how the app is started (project folder, desktop shortcut or
// installed package): <appData>/clinic-central. Must be set before anything touches userData.
app.setPath('userData', path.join(app.getPath('appData'), 'clinic-central'));

import { runMigrations } from './database/migrate';
import { seedDefaults } from './database/seed';
import { closeDatabase } from './database/connection';
import { backupService } from './services/backup.service';
import { registerPatientHandlers } from './ipc/patients.ipc';
import { registerTreatmentHandlers } from './ipc/treatments.ipc';
import { registerAppointmentHandlers } from './ipc/appointments.ipc';
import { registerFinanceHandlers } from './ipc/finance.ipc';
import { registerSettingsHandlers } from './ipc/settings.ipc';
import { registerExcelHandlers } from './ipc/excel.ipc';
import { registerDoctorHandlers } from './ipc/doctor.ipc';
import { registerClinicHandlers } from './ipc/clinic.ipc';

let mainWindow: BrowserWindow | null = null;
const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  const iconPath = [
    path.join(__dirname, '../resources/icon.png'),
    path.join(process.resourcesPath || '', 'icon.png'),
  ].find(p => fs.existsSync(p));

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 820,
    minWidth: 1024,
    minHeight: 600,
    title: 'Clinic Central',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    ...(iconPath ? { icon: iconPath } : {}),
  });

  mainWindow.once('ready-to-show', () => mainWindow?.show());

  // The app itself is fully local. Links to the outside world (e.g. "add to Google Calendar")
  // open in the system browser and never inside the app window.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^(https?|mailto|tel):/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const local = url.startsWith('file://') || (isDev && url.startsWith('http://localhost'));
    if (!local) {
      event.preventDefault();
      if (/^(https?|mailto|tel):/i.test(url)) shell.openExternal(url);
    }
  });

  if (isDev) {
    // Development only: Vite dev server with hot reload
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // Normal use: the pre-built UI is loaded straight from disk, no server involved
    const indexHtml = path.join(__dirname, '../dist/index.html');
    if (!fs.existsSync(indexHtml)) {
      dialog.showErrorBox('Clinic Central', 'The application has not been built yet.\n\nRun "npm run build" in the project folder once, then start it again.');
      app.quit();
      return;
    }
    mainWindow.loadFile(indexHtml);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// A second double-click on the shortcut focuses the running window instead of opening
// another copy against the same database.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    try {
      runMigrations();
      seedDefaults();
    } catch (err: any) {
      dialog.showErrorBox('Clinic Central - database error',
        `The database could not be opened or upgraded.\n\n${err?.message || err}\n\nYour data has not been changed. Automatic backups are kept in:\n${path.join(app.getPath('userData'), 'backups')}`);
      app.quit();
      return;
    }
    backupService.autoBackup();

    registerPatientHandlers();
    registerTreatmentHandlers();
    registerAppointmentHandlers();
    registerFinanceHandlers();
    registerSettingsHandlers();
    registerExcelHandlers();
    registerDoctorHandlers();
    registerClinicHandlers();

    ipcMain.handle('app:version', () => app.getVersion());

    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    closeDatabase();
    if (process.platform !== 'darwin') app.quit();
  });
}
