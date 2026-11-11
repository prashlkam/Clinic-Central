"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// One data location no matter how the app is started (project folder, desktop shortcut or
// installed package): <appData>/clinic-central. Must be set before anything touches userData.
electron_1.app.setPath('userData', path_1.default.join(electron_1.app.getPath('appData'), 'clinic-central'));
const migrate_1 = require("./database/migrate");
const seed_1 = require("./database/seed");
const connection_1 = require("./database/connection");
const backup_service_1 = require("./services/backup.service");
const patients_ipc_1 = require("./ipc/patients.ipc");
const treatments_ipc_1 = require("./ipc/treatments.ipc");
const appointments_ipc_1 = require("./ipc/appointments.ipc");
const finance_ipc_1 = require("./ipc/finance.ipc");
const settings_ipc_1 = require("./ipc/settings.ipc");
const excel_ipc_1 = require("./ipc/excel.ipc");
const doctor_ipc_1 = require("./ipc/doctor.ipc");
const clinic_ipc_1 = require("./ipc/clinic.ipc");
let mainWindow = null;
const isDev = process.env.NODE_ENV === 'development';
function createWindow() {
    const iconPath = [
        path_1.default.join(__dirname, '../resources/icon.png'),
        path_1.default.join(process.resourcesPath || '', 'icon.png'),
    ].find(p => fs_1.default.existsSync(p));
    mainWindow = new electron_1.BrowserWindow({
        width: 1366,
        height: 820,
        minWidth: 1024,
        minHeight: 600,
        title: 'Clinic Central',
        autoHideMenuBar: true,
        show: false,
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
        ...(iconPath ? { icon: iconPath } : {}),
    });
    mainWindow.once('ready-to-show', () => mainWindow?.show());
    // The app itself is fully local. Links to the outside world (e.g. "add to Google Calendar")
    // open in the system browser and never inside the app window.
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (/^(https?|mailto|tel):/i.test(url))
            electron_1.shell.openExternal(url);
        return { action: 'deny' };
    });
    mainWindow.webContents.on('will-navigate', (event, url) => {
        const local = url.startsWith('file://') || (isDev && url.startsWith('http://localhost'));
        if (!local) {
            event.preventDefault();
            if (/^(https?|mailto|tel):/i.test(url))
                electron_1.shell.openExternal(url);
        }
    });
    if (isDev) {
        // Development only: Vite dev server with hot reload
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173');
        mainWindow.webContents.openDevTools();
    }
    else {
        // Normal use: the pre-built UI is loaded straight from disk, no server involved
        const indexHtml = path_1.default.join(__dirname, '../dist/index.html');
        if (!fs_1.default.existsSync(indexHtml)) {
            electron_1.dialog.showErrorBox('Clinic Central', 'The application has not been built yet.\n\nRun "npm run build" in the project folder once, then start it again.');
            electron_1.app.quit();
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
if (!electron_1.app.requestSingleInstanceLock()) {
    electron_1.app.quit();
}
else {
    electron_1.app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized())
                mainWindow.restore();
            mainWindow.focus();
        }
    });
    electron_1.app.whenReady().then(() => {
        try {
            (0, migrate_1.runMigrations)();
            (0, seed_1.seedDefaults)();
        }
        catch (err) {
            electron_1.dialog.showErrorBox('Clinic Central - database error', `The database could not be opened or upgraded.\n\n${err?.message || err}\n\nYour data has not been changed. Automatic backups are kept in:\n${path_1.default.join(electron_1.app.getPath('userData'), 'backups')}`);
            electron_1.app.quit();
            return;
        }
        backup_service_1.backupService.autoBackup();
        (0, patients_ipc_1.registerPatientHandlers)();
        (0, treatments_ipc_1.registerTreatmentHandlers)();
        (0, appointments_ipc_1.registerAppointmentHandlers)();
        (0, finance_ipc_1.registerFinanceHandlers)();
        (0, settings_ipc_1.registerSettingsHandlers)();
        (0, excel_ipc_1.registerExcelHandlers)();
        (0, doctor_ipc_1.registerDoctorHandlers)();
        (0, clinic_ipc_1.registerClinicHandlers)();
        electron_1.ipcMain.handle('app:version', () => electron_1.app.getVersion());
        createWindow();
        electron_1.app.on('activate', () => {
            if (electron_1.BrowserWindow.getAllWindows().length === 0)
                createWindow();
        });
    });
    electron_1.app.on('window-all-closed', () => {
        (0, connection_1.closeDatabase)();
        if (process.platform !== 'darwin')
            electron_1.app.quit();
    });
}
//# sourceMappingURL=main.js.map