"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const migrate_1 = require("./database/migrate");
const connection_1 = require("./database/connection");
const patients_ipc_1 = require("./ipc/patients.ipc");
const treatments_ipc_1 = require("./ipc/treatments.ipc");
const appointments_ipc_1 = require("./ipc/appointments.ipc");
const finance_ipc_1 = require("./ipc/finance.ipc");
const settings_ipc_1 = require("./ipc/settings.ipc");
const excel_ipc_1 = require("./ipc/excel.ipc");
const doctor_ipc_1 = require("./ipc/doctor.ipc");
let mainWindow = null;
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 1024,
        minHeight: 600,
        title: 'Clinic Central',
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
        icon: path_1.default.join(__dirname, '../resources/icon.png'),
    });
    // In dev mode (with Vite dev server), load from URL; otherwise load built files
    const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    const isDev = process.env.NODE_ENV === 'development';
    if (isDev) {
        mainWindow.loadURL(devServerUrl);
        mainWindow.webContents.openDevTools();
    }
    else {
        mainWindow.loadFile(path_1.default.join(__dirname, '../dist/index.html'));
    }
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
electron_1.app.whenReady().then(() => {
    // Run database migrations
    (0, migrate_1.runMigrations)();
    // Register all IPC handlers
    (0, patients_ipc_1.registerPatientHandlers)();
    (0, treatments_ipc_1.registerTreatmentHandlers)();
    (0, appointments_ipc_1.registerAppointmentHandlers)();
    (0, finance_ipc_1.registerFinanceHandlers)();
    (0, settings_ipc_1.registerSettingsHandlers)();
    (0, excel_ipc_1.registerExcelHandlers)();
    (0, doctor_ipc_1.registerDoctorHandlers)();
    electron_1.ipcMain.handle('app:version', () => electron_1.app.getVersion());
    createWindow();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
electron_1.app.on('window-all-closed', () => {
    (0, connection_1.closeDatabase)();
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
//# sourceMappingURL=main.js.map