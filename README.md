# Clinic Central

A desktop clinic management application for a small dental clinic with a single main doctor, in India. Patients, clinical notes, dental chart, treatment plans, prescriptions, lab orders, consents, appointments and queue, invoices, expenses, inventory and reports — all in one app that runs **completely on your own computer**. No internet, no server, no account: double-click the desktop shortcut and work.

![Electron](https://img.shields.io/badge/Electron-41-47848F?logo=electron&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-Local-003B57?logo=sqlite&logoColor=white)
![Platform](https://img.shields.io/badge/Platform-Linux%20%7C%20Windows-0078D6)

---

## Features

### Quick Start

```bash
npm install                 # once
npm run desktop-shortcut    # builds the app and puts "Clinic Central" on your desktop
```

Then double-click **Clinic Central** on the desktop. See [Getting Started](#getting-started) for details.

### Clinical Record (per patient)
- **Clinical notes** for each visit: chief complaint, intraoral findings, radiograph observations, diagnosis, treatment done, advice, vitals, follow-up date
- **Dental chart** (FDI numbering, permanent and milk teeth): condition, surfaces and notes per tooth
- **Treatment plans** with stages, teeth and per-procedure status; printable estimate; create an invoice straight from the plan
- **Prescriptions** from a drug library, reusable templates, repeat prescription, letterhead print; allergy warning while prescribing
- **Lab orders**: lab, work type, material, teeth, shade, trial / due / received dates, status, overdue flag, lab charge booked as an expense
- **Consent forms** from editable templates, signed on screen or printed for a pen signature
- **Files & X-rays**: attach images and documents; they are copied into the app's own data folder

### Reception
- **Today's Queue**: check in arrivals (issues the next token), register walk-ins, call in, complete
- Dashboard lists for follow-ups due, lab work due, low stock and birthdays

### Inventory & Libraries
- Stock items with stock-in / stock-out / count adjustment, movement history, reorder level and expiry
- Libraries: drug library, prescription templates, consent templates, dental labs, membership plans
- **Membership plans** with a bill-level discount applied in one click on the invoice

### Patient Management
- Full patient records with contact info, blood group, allergies, medical conditions, current medication and notes
- Search by name, phone, or email with real-time filtering
- Patient detail view with appointment history, invoices, and financial ledger
- Soft-delete support for data retention
- Excel import/export with column mapping and validation preview

### Treatment Catalog
- Hierarchical treatment trees (e.g., Endodontics > Root Canal > Single Canal)
- Default treatment list shipped as **JSON** (`data/treatments/default-treatments.json`), loaded on first run
- Import / export the treatment list as JSON; re-importing never creates duplicates
- Configurable pricing (INR) and estimated duration per treatment
- Two-step selection: pick a tree, then pick a treatment within it

### Appointment Scheduling
- List and calendar views for appointments
- Status workflow: Scheduled → Confirmed → In Progress → Completed / Cancelled / No-Show
- Auto-fill duration from selected treatment
- Today's appointments and upcoming appointments dashboard
- Export an appointment as an `.ics` calendar file

### Invoicing
- Auto-numbered invoices by year (e.g., `INV-2025-0001`)
- Line items from treatment catalog or manual entry
- Discount and tax (GST) support
- Status workflow: Draft → Sent → Partial → Paid → Cancelled
- Letterhead invoice / receipt print (the print dialog can also save a PDF)

### Financial Tracking
- Transaction types: Income, Expense, Advance, Refund
- Payment methods: Cash, UPI, Card, Bank Transfer, Cheque
- Expense categories with hierarchical grouping (Rent, Salaries, Dental Supplies, etc.)
- Per-patient financial ledger

### Reports & Analytics
- **Income Statement (P&L):** Drill down from yearly → monthly → daily with interactive charts
- **Balance Sheet:** Assets (cash + receivables), Liabilities (advances), Equity
- **Outstanding Receivables:** Per-patient unpaid balances with aging
- **Expense Breakdown:** By category with pie chart visualization
- **Patient Ledger:** Complete transaction history for any patient
- **Collections:** By payment mode and by day
- **Procedure-wise billing** and **new vs returning patients**
- **Dashboard Stats:** Revenue, today's income, upcoming appointments, outstanding balance

### Data Management
- **Excel Export:** Patients, appointments, invoices, transactions, and reports to `.xlsx` with INR formatting
- **Excel Import:** Patients and transactions with column mapping, validation preview, and batch insert
- **Backup/Restore:** Automatic daily backup at startup (last 14 kept), manual backup of database + patient files to any folder, validated restore that first keeps a safety copy
- **Settings:** Clinic info, GSTIN, invoice prefix/counter, backup path

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Desktop Framework | Electron 41 | Desktop app shell; owns the database and file access |
| Frontend | React 19 + TypeScript 5.9 | Component-based UI with type safety |
| UI Components | Ant Design 6 | Tables, forms, modals, calendar, icons |
| Build Tool | Vite 8 | Fast dev server and production builds |
| Database | better-sqlite3 | Synchronous SQLite, local-first |
| State Management | Zustand | Lightweight reactive stores |
| Routing | React Router DOM 7 | Client-side hash routing |
| Charts | Recharts 3 | Financial dashboards and visualizations |
| Excel | ExcelJS | Import/export `.xlsx` with formatting |
| Validation | Zod 4 | Runtime + compile-time schema validation |
| Dates | date-fns + dayjs | Date formatting and manipulation |
| Installer | electron-builder | AppImage / deb / Windows NSIS installer |

---

## Project Structure

```
clinic-central/
├── electron/                     # Main process (backend)
│   ├── main.ts                   # App entry, window creation, IPC setup
│   ├── preload.ts                # Secure IPC bridge (contextIsolation)
│   ├── database/
│   │   ├── connection.ts         # SQLite connection singleton (WAL mode)
│   │   ├── migrate.ts            # Numbered migration runner
│   │   └── migrations/
│   │       └── 001_initial.sql   # Full schema definition
│   ├── ipc/                      # IPC channel handlers
│   │   ├── patients.ipc.ts
│   │   ├── treatments.ipc.ts
│   │   ├── appointments.ipc.ts
│   │   ├── finance.ipc.ts
│   │   ├── settings.ipc.ts
│   │   └── excel.ipc.ts
│   ├── services/                 # Business logic layer
│   │   ├── patient.service.ts
│   │   ├── treatment.service.ts
│   │   ├── appointment.service.ts
│   │   ├── invoice.service.ts
│   │   ├── transaction.service.ts
│   │   ├── report.service.ts
│   │   ├── excel.service.ts
│   │   ├── backup.service.ts
│   │   └── treatment-tree-parser.ts
│   └── utils/
│       └── currency.ts           # Paise ↔ Rupees conversion
├── src/                          # Renderer process (frontend)
│   ├── main.tsx                  # React entry point
│   ├── App.tsx                   # HashRouter + route definitions
│   ├── api/                     # IPC API wrappers
│   ├── types/                   # TypeScript interfaces
│   ├── components/              # Reusable UI components
│   │   ├── Layout/              # AppShell, Sidebar
│   │   ├── TreatmentTree/       # Tree selection widget
│   │   ├── CurrencyInput/       # INR input with paise handling
│   │   ├── DataTable/           # Generic data table
│   │   └── common/              # ConfirmModal, SearchInput, StatusBadge
│   ├── pages/
│   │   ├── Dashboard/           # Summary cards + upcoming appointments
│   │   ├── Patients/            # List, detail, form modal
│   │   ├── Treatments/          # List, tree view, form modal, import
│   │   ├── Appointments/        # List, calendar, form modal
│   │   ├── Finance/             # Transactions, invoices, expenses, reports
│   │   └── Settings/            # Clinic config, backup, treatment import
│   └── styles/
│       ├── theme.ts             # Ant Design theme (teal primary)
│       └── global.css
├── data/
│   └── treatments/
│       └── default-treatments.txt  # Sample dental treatments
├── resources/                   # App icons and installer assets
├── package.json
├── tsconfig.json                # React/Vite TypeScript config
├── tsconfig.electron.json       # Electron TypeScript config
├── vite.config.ts
└── index.html
```

---

## Getting Started

### Prerequisites

- **Node.js** 20+ and **npm**
- Linux or Windows 10/11 (macOS should work but is untested)

### Install and create the desktop shortcut

```bash
git clone <repository-url>
cd Clinic-Central
npm install
npm run desktop-shortcut
```

`npm run desktop-shortcut` builds the app and creates a **Clinic Central** shortcut on the desktop (and an
applications-menu entry on Linux). From then on, start the app by double-clicking it. Nothing else needs to
be running: the app loads its screens from disk and keeps its data in a local SQLite file.

- Run `npm run desktop-shortcut` again after pulling a new version of the code.
- `npm run desktop-shortcut -- --remove` removes the shortcut.
- The shortcut points at this folder, so do not move or delete the folder afterwards (re-run the command if you do).
- On some Linux desktops the first double-click asks you to "Allow launching" / "Trust" the shortcut.
- `npm install` must be allowed to run the install scripts of `electron` (downloads the Electron program)
  and `better-sqlite3` (the database driver). Newer npm versions block dependency install scripts by
  default; this project approves exactly those two in `package.json` → `allowScripts`.

### First run

1. Register the doctor (name, qualification, registration number, password).
2. Fill in the clinic details under **Settings** — they appear on every printed prescription, invoice, estimate and consent.
3. The default treatments, drug library and consent templates are already loaded. Adjust them under **Treatments** and **Libraries**.

### Installer for another computer (optional)

```bash
npm run dist:linux   # AppImage + .deb in release/
npm run dist:win     # NSIS installer with a desktop shortcut (run on Windows)
```

### Development

```bash
npm run dev          # Vite dev server + Electron with hot reload
npm run test:smoke   # backend test on a throw-away database
```

---

## Database

### Location

The SQLite database is stored at:

| OS | Folder |
|----|--------|
| Linux | `~/.config/clinic-central/` |
| Windows | `%APPDATA%\clinic-central\` |

- `clinic-central.db` — all records
- `patient-files/` — attached X-rays, photos and documents
- `backups/` — automatic daily backups and safety copies

It is created automatically on first launch. Migrations run on startup; an existing database is snapshotted to `backups/` before it is upgraded. **Settings → Where your data lives** shows and opens the folder.

### Schema Overview

| Table | Purpose |
|-------|---------|
| `patients` | Patient records with contact info, medical history |
| `treatment_trees` | Hierarchical grouping (Endodontics, Orthodontics, etc.) |
| `treatments` | Individual treatments with cost, duration, parent/child hierarchy |
| `appointments` | Scheduled visits linked to patients and treatments |
| `invoices` | Invoice headers with totals, status, auto-numbering |
| `invoice_items` | Line items linked to invoices and treatments |
| `transactions` | All financial transactions (income, expense, advance, refund) |
| `expense_categories` | Hierarchical expense categories |
| `settings` | Key-value configuration store |
| `clinical_notes`, `tooth_chart` | Visit notes and dental chart |
| `treatment_plans`, `treatment_plan_items` | Staged treatment plans |
| `medicines`, `prescriptions`, `prescription_items`, `prescription_templates` | Drug library and prescriptions |
| `labs`, `lab_orders` | Dental labs and lab work |
| `consent_templates`, `patient_consents` | Consent forms |
| `patient_files` | Attachment records |
| `inventory_items`, `inventory_movements` | Stock |
| `membership_plans` | Discount programmes |
| `schema_migrations` | Applied migration tracking |

### Currency Handling

All monetary values are stored as **integers in paise** (100 paise = 1 rupee) to avoid floating-point arithmetic errors. Conversion utilities handle display formatting with Indian comma notation (e.g., `₹1,00,000.00`).

---

## Architecture

### IPC Communication

The app follows Electron's recommended security pattern:

```
Renderer (React)  ──→  preload.ts (contextBridge)  ──→  Main Process (IPC handlers)
                                                              │
                                                         Services Layer
                                                              │
                                                         SQLite Database
```

- `contextIsolation: true` — renderer has no direct access to Node.js
- `nodeIntegration: false` — all backend access goes through the preload bridge
- IPC channels are namespaced: `patients:list`, `appointments:create`, `invoices:getById`, etc.

### Key Architectural Decisions

- **Local-first:** All data stays on the user's machine. No cloud dependency.
- **SQLite with WAL mode:** Fast reads, safe concurrent access within the app.
- **Paise-based currency:** Integer arithmetic eliminates rounding errors for financial data.
- **Service layer separation:** IPC handlers delegate to services, keeping business logic testable and decoupled.

---

## Treatment List Format (JSON)

The default list is `data/treatments/default-treatments.json`. The same format is used by **Import JSON** and
**Export JSON** on the Treatments page.

```json
{
  "version": 1,
  "currency": "INR",
  "categories": [
    {
      "name": "Endodontics",
      "treatments": [
        {
          "name": "Root Canal Treatment", "cost": 8000, "duration": 60,
          "children": [
            { "name": "Single Canal", "cost": 5000, "duration": 45 },
            { "name": "Multi Canal", "cost": 8000, "duration": 60 }
          ]
        },
        { "name": "Pulpotomy", "cost": 3000, "duration": 30 }
      ]
    }
  ]
}
```

`cost` is in rupees, `duration` in minutes (default 30), and `children` can nest to any depth. A malformed
file is rejected with a message saying what is wrong; nothing is imported from it. Treatments that already
exist are left unchanged. Older indented `.txt` lists can still be imported.

The drug library (`data/medicines/default-medicines.json`) and consent templates
(`data/consents/default-consent-templates.json`) are JSON too. They are starting points: review the
dosage defaults and the consent wording for your own practice.

---

## Indian Localization

- **Currency:** INR (₹) with Indian comma formatting (`₹1,00,000.00`)
- **Date Display:** DD-MM-YYYY in the UI, ISO 8601 in the database
- **Phone Validation:** 10-digit Indian mobile numbers
- **GST Support:** Optional GSTIN in settings; invoices support tax line items
- **Unicode:** Full UTF-8 support for Hindi, Kannada, and other Indic scripts

---

## Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run desktop-shortcut` | Build and create the desktop shortcut |
| `npm run launch` | Start the already-built app |
| `npm run start` | Build and start the app |
| `npm run build` | Build renderer and main process |
| `npm run dev` | Development mode (Vite + Electron, hot reload) |
| `npm run test:smoke` | Backend smoke test on a temporary database |
| `npm run dist:linux` / `npm run dist:win` | Build an installable package into `release/` |
| `npm run make-icon` | Regenerate `resources/icon.png` and `icon.ico` |

---

## Troubleshooting

- **"The application has not been built yet"** — run `npm run build` (or `npm run desktop-shortcut`) once.
- **"Electron failed to install correctly"** — the Electron download was skipped; run `npm install` again and make sure install scripts for `electron` are allowed.
- **Shortcut does nothing on Linux** — mark it as trusted ("Allow launching"), and check that the project folder has not moved.
- **Forgot which folder holds the data** — Settings → *Where your data lives* → Open data folder.

See [Plan.md](Plan.md) for the build plan, the feature mapping and what is still open.

---

## License

GPL - Ver 3.0
