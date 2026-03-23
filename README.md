# Clinic Central

A comprehensive desktop clinic management application built for small dental clinics in India. Manage patients, appointments, treatments, invoices, expenses, and financial reports — all from a single offline-first desktop app.

![Electron](https://img.shields.io/badge/Electron-41-47848F?logo=electron&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-Local-003B57?logo=sqlite&logoColor=white)
![Platform](https://img.shields.io/badge/Platform-Windows-0078D6?logo=windows&logoColor=white)

---

## Features

### Patient Management
- Full patient records with contact info, medical history, and notes
- Search by name, phone, or email with real-time filtering
- Patient detail view with appointment history, invoices, and financial ledger
- Soft-delete support for data retention
- Excel import/export with column mapping and validation preview

### Treatment Catalog
- Hierarchical treatment trees (e.g., Endodontics > Root Canal > Single Canal)
- Import treatments from structured text files
- Configurable pricing (INR) and estimated duration per treatment
- Two-step selection: pick a tree, then pick a treatment within it

### Appointment Scheduling
- List and calendar views for appointments
- Status workflow: Scheduled → Confirmed → In Progress → Completed / Cancelled / No-Show
- Auto-fill duration from selected treatment
- Today's appointments and upcoming appointments dashboard
- Future: Google Calendar sync (OAuth 2.0, one-way push)

### Invoicing
- Auto-numbered invoices by year (e.g., `INV-2025-0001`)
- Line items from treatment catalog or manual entry
- Discount and tax (GST) support
- Status workflow: Draft → Sent → Partial → Paid → Cancelled
- Print-ready invoice detail view with clinic branding

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
- **Dashboard Stats:** Revenue, today's income, upcoming appointments, outstanding balance

### Data Management
- **Excel Export:** Patients, appointments, invoices, transactions, and reports to `.xlsx` with INR formatting
- **Excel Import:** Patients and transactions with column mapping, validation preview, and batch insert
- **Backup/Restore:** Manual database backup via `VACUUM INTO`; restore with table validation
- **Settings:** Clinic info, GSTIN, invoice prefix/counter, backup path

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Desktop Framework | Electron 41 | Native Windows app with OS integration |
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
| Installer | electron-builder | Windows NSIS installer |

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

- **Node.js** 18+ (LTS recommended)
- **npm** 9+
- **Windows** 10/11 (primary target platform)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd clinic-central

# Install dependencies (also rebuilds better-sqlite3 for Electron)
npm install
```

### Development

```bash
# Start dev mode (Vite dev server + Electron with hot reload)
npm run dev
```

This starts Vite on `http://localhost:5173` and launches Electron once the dev server is ready.

### Production Build

```bash
# Build both renderer and electron
npm run build

# Test the production build locally
npm run start
```

### Create Installer

```bash
# Build and package as Windows NSIS installer
npm run dist
```

The installer is output to the `release/` directory.

---

## Database

### Location

The SQLite database is stored at:

```
%APPDATA%/clinic-central/clinic-central.db
```

It is created automatically on first launch. Migrations run on startup.

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
| `sync_queue` | Future Google Calendar sync queue |
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
- **Zod validation:** Runtime type checking at system boundaries (user input, IPC calls).

---

## Treatment Import Format

Treatments can be bulk-imported from a structured text file:

```
TREE: Endodontics
  Root Canal Treatment | 8000 | 60
    Single Canal | 5000 | 45
    Multi Canal | 8000 | 60
  Pulpotomy | 3000 | 30

TREE: Orthodontics
  Metal Braces | 35000 | 45
    Full Mouth | 35000 | 60
```

**Format:** Indentation (2 spaces) defines hierarchy. Each line: `name | cost_INR | duration_minutes`. Lines starting with `#` are comments.

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
| `npm run dev` | Start development mode (Vite + Electron) |
| `npm run build` | Build renderer and electron for production |
| `npm run start` | Build and launch the production app |
| `npm run dist` | Build and create Windows NSIS installer |
| `npm run dev:renderer` | Start Vite dev server only |
| `npm run dev:electron` | Build and launch Electron only |
| `npm run build:renderer` | Build React app with Vite |
| `npm run build:electron` | Compile Electron TypeScript |
| `npm run copy:migrations` | Copy SQL migrations to build output |
| `npm run postinstall` | Rebuild native modules for Electron |

---

## Roadmap

- [ ] Google Calendar sync (OAuth 2.0, one-way push)
- [ ] SMS/WhatsApp appointment reminders
- [ ] Multi-user authentication
- [ ] Cloud backup (AWS S3 or similar)
- [ ] Advanced analytics and KPI tracking
- [ ] Predictive no-show analysis

---

## License

ISC
