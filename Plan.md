# Clinic Central — Implementation Plan

A desktop clinic management application for a small dental clinic in India.

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Desktop | Electron | Native desktop features, file system access, printing |
| UI | React 18 + TypeScript | Component model, type safety |
| Components | Ant Design | Tables, forms, trees, calendars out of the box |
| State | Zustand | Lightweight, no boilerplate |
| Database | better-sqlite3 | Synchronous SQLite, perfect for local-first |
| ORM | Drizzle ORM | Type-safe, SQLite-first |
| Excel | ExcelJS | Read/write .xlsx with formatting |
| Google Cal | googleapis | Official SDK with OAuth2 for desktop |
| Charts | Recharts | Financial dashboards |
| Build | Vite + electron-builder | Fast dev, .exe installer |
| PDF | @react-pdf/renderer | Invoice generation |
| Validation | Zod | Runtime + compile-time type safety |
| Date Handling | date-fns | Lightweight, tree-shakeable |

---

## Database Schema

All monetary values stored as **integers in paise** (100 paise = ₹1) to avoid floating-point issues.
Database stored at: `%APPDATA%/clinic-central/clinic.db`

### Tables

#### patients

```sql
CREATE TABLE patients (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name      TEXT NOT NULL,
    last_name       TEXT NOT NULL,
    date_of_birth   TEXT,
    gender          TEXT CHECK(gender IN ('M','F','O')),
    phone_primary   TEXT NOT NULL,
    phone_secondary TEXT,
    email           TEXT,
    address_line1   TEXT,
    address_line2   TEXT,
    city            TEXT DEFAULT 'Bengaluru',
    state           TEXT DEFAULT 'Karnataka',
    pincode         TEXT,
    medical_history TEXT,
    notes           TEXT,
    is_active       INTEGER DEFAULT 1,
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_patients_name ON patients(last_name, first_name);
CREATE INDEX idx_patients_phone ON patients(phone_primary);
```

#### treatment_trees

```sql
CREATE TABLE treatment_trees (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
);
```

#### treatments

```sql
CREATE TABLE treatments (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    tree_id              INTEGER NOT NULL REFERENCES treatment_trees(id),
    parent_id            INTEGER REFERENCES treatments(id),
    name                 TEXT NOT NULL,
    description          TEXT,
    estimated_cost_paise INTEGER NOT NULL DEFAULT 0,
    duration_minutes     INTEGER DEFAULT 30,
    is_active            INTEGER DEFAULT 1,
    sort_order           INTEGER DEFAULT 0,
    created_at           TEXT DEFAULT (datetime('now')),
    updated_at           TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_treatments_tree ON treatments(tree_id);
CREATE INDEX idx_treatments_parent ON treatments(parent_id);
```

#### appointments

```sql
CREATE TABLE appointments (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id          INTEGER NOT NULL REFERENCES patients(id),
    treatment_id        INTEGER REFERENCES treatments(id),
    appointment_date    TEXT NOT NULL,
    duration_minutes    INTEGER DEFAULT 30,
    status              TEXT DEFAULT 'scheduled'
                        CHECK(status IN ('scheduled','confirmed','in_progress',
                                         'completed','cancelled','no_show')),
    notes               TEXT,
    google_event_id     TEXT,
    created_at          TEXT DEFAULT (datetime('now')),
    updated_at          TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_status ON appointments(status);
```

#### invoices

```sql
CREATE TABLE invoices (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_number  TEXT NOT NULL UNIQUE,
    patient_id      INTEGER NOT NULL REFERENCES patients(id),
    appointment_id  INTEGER REFERENCES appointments(id),
    invoice_date    TEXT NOT NULL,
    subtotal_paise  INTEGER NOT NULL DEFAULT 0,
    discount_paise  INTEGER DEFAULT 0,
    tax_paise       INTEGER DEFAULT 0,
    total_paise     INTEGER NOT NULL DEFAULT 0,
    status          TEXT DEFAULT 'draft'
                    CHECK(status IN ('draft','sent','partial','paid','cancelled')),
    notes           TEXT,
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_invoices_patient ON invoices(patient_id);
CREATE INDEX idx_invoices_date ON invoices(invoice_date);
```

#### invoice_items

```sql
CREATE TABLE invoice_items (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id       INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    treatment_id     INTEGER REFERENCES treatments(id),
    description      TEXT NOT NULL,
    quantity         INTEGER DEFAULT 1,
    unit_price_paise INTEGER NOT NULL,
    total_paise      INTEGER NOT NULL,
    sort_order       INTEGER DEFAULT 0
);
```

#### transactions

```sql
CREATE TABLE transactions (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    type                TEXT NOT NULL
                        CHECK(type IN ('income','expense','advance','refund')),
    category            TEXT,
    patient_id          INTEGER REFERENCES patients(id),
    invoice_id          INTEGER REFERENCES invoices(id),
    appointment_id      INTEGER REFERENCES appointments(id),
    amount_paise        INTEGER NOT NULL,
    payment_method      TEXT DEFAULT 'cash'
                        CHECK(payment_method IN ('cash','upi','card','bank_transfer','cheque')),
    transaction_date    TEXT NOT NULL,
    reference_number    TEXT,
    notes               TEXT,
    created_at          TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_patient ON transactions(patient_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_invoice ON transactions(invoice_id);
```

#### expense_categories

```sql
CREATE TABLE expense_categories (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT NOT NULL UNIQUE,
    parent_id INTEGER REFERENCES expense_categories(id)
);
-- Seed: Rent, Salaries, Dental Supplies, Equipment, Utilities, Miscellaneous
```

#### settings

```sql
CREATE TABLE settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
-- Stores: clinic_name, clinic_address, clinic_phone, gstin, google_calendar_id,
--         invoice_prefix, invoice_counter, default_currency, backup_path, etc.
```

#### sync_queue

```sql
CREATE TABLE sync_queue (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type     TEXT NOT NULL,
    entity_id       INTEGER NOT NULL,
    operation       TEXT NOT NULL,
    payload         TEXT,
    retry_count     INTEGER DEFAULT 0,
    status          TEXT DEFAULT 'pending',
    created_at      TEXT DEFAULT (datetime('now')),
    last_attempt_at TEXT
);
```

#### schema_migrations

```sql
CREATE TABLE schema_migrations (
    version    INTEGER PRIMARY KEY,
    applied_at TEXT DEFAULT (datetime('now'))
);
```

---

## Treatment Tree File Format

Indentation-based text file (2 spaces per level). Blank lines and `#` comments are ignored.

```
# Format: <name> | <cost_INR> | <duration_minutes>
# Duration is optional, defaults to 30

TREE: Endodontics
  Root Canal Treatment | 8000 | 60
    Single Canal | 5000 | 45
    Multi Canal | 8000 | 60
    Re-treatment | 10000 | 90
  Pulpotomy | 3000 | 30
  Pulpectomy | 4000 | 45
    Primary Tooth | 3000 | 30
    Permanent Tooth | 5000 | 45
  Apicoectomy | 12000 | 60

TREE: Orthodontics
  Metal Braces | 35000 | 45
    Upper Arch | 20000 | 45
    Lower Arch | 20000 | 45
    Full Mouth | 35000 | 60
  Ceramic Braces | 50000 | 45
    Upper Arch | 30000 | 45
    Full Mouth | 50000 | 60
  Aligners | 150000 | 30
    Single Arch | 80000 | 30
    Both Arches | 150000 | 30
  Retainers | 5000 | 20
    Fixed | 3000 | 20
    Removable | 5000 | 15

TREE: Prosthodontics
  Crown | 8000 | 45
    PFM Crown | 6000 | 45
    Zirconia Crown | 15000 | 45
    E-max Crown | 12000 | 45
  Bridge | 20000 | 60
    3-Unit Bridge | 18000 | 60
    Long Span Bridge | 30000 | 90
  Dentures | 15000 | 60
    Complete Denture | 15000 | 60
    Partial Denture | 10000 | 45
    Flexible Denture | 20000 | 45
  Implant | 35000 | 90
    Single Implant | 35000 | 90
    Implant with Crown | 45000 | 120

TREE: General Dentistry
  Consultation | 500 | 15
  Scaling and Polishing | 1500 | 30
  Filling | 2000 | 30
    Composite Filling | 2000 | 30
    GIC Filling | 1500 | 20
    Silver Amalgam | 1000 | 20
  Extraction | 1500 | 30
    Simple Extraction | 1000 | 20
    Surgical Extraction | 3000 | 45
    Wisdom Tooth | 5000 | 60
  Teeth Whitening | 8000 | 60
    In-Office | 8000 | 60
    Take-Home Kit | 5000 | 15
```

### Parser Logic

1. Read file line by line
2. Skip blank lines and lines starting with `#`
3. On `TREE: <name>` — create a new `treatment_trees` record
4. For each indented line:
   - Count leading spaces / 2 = depth level
   - Split on `|` to extract: name, cost, duration
   - Maintain a stack of `[depth → most recent node ID]`
   - `parent_id = stack[depth - 1]` (NULL if root under TREE:)
   - Insert into `treatments` table
   - Update `stack[depth] = new node ID`

### Tree Constraint Enforcement

When selecting a treatment (in appointments or invoices), the `TreatmentTreeSelect` component enforces:
1. Step 1: User picks a `treatment_tree` from a dropdown
2. Step 2: Only treatments from that tree are shown in an antd `TreeSelect`
3. Database FK on `treatments.tree_id` ensures integrity

---

## Google Calendar Sync

### Authentication

OAuth 2.0 "Desktop App" client type via Google Cloud Console.

1. User clicks "Connect Google Calendar" in Settings
2. Electron opens browser to Google OAuth consent screen
3. Auth code captured via loopback redirect (`http://127.0.0.1:<port>`)
4. Tokens stored encrypted using Electron's `safeStorage` API at `%APPDATA%/clinic-central/google-tokens.json`
5. `google-auth-library` handles automatic token refresh

### Sync Strategy (App-Authoritative, One-Way Push)

- **On appointment CREATE:** Build Google event → `calendar.events.insert()` → store `event.id`
- **On appointment UPDATE:** If `google_event_id` exists → `calendar.events.patch()`
- **On appointment DELETE/CANCEL:** If `google_event_id` exists → `calendar.events.delete()`
- **Offline:** Operations queued in `sync_queue` table, processed on startup and every 5 minutes with exponential backoff (max 3 retries)

---

## Financial Reports Architecture

### Report Types

**Income Statement (P&L):** Revenue vs expenses grouped by period (daily/weekly/monthly/yearly)

**Balance Sheet (simplified):**
- Assets: Cash balance + outstanding receivables
- Liabilities: Advance payments received
- Equity: Net assets

**Outstanding Receivables:** Per-patient unpaid invoice balances

**Expense Breakdown:** By category with pie charts

### Drill-Down Flow

1. **Yearly view** — bar chart of 12 months → click a month
2. **Monthly view** — daily bars → click a day
3. **Daily view** — individual transaction list
4. **Patient filter** — dropdown adds `AND patient_id = ?` to all queries

### Report Service Interface

```typescript
interface ReportFilters {
  startDate: string;
  endDate: string;
  patientId?: number;
  granularity: 'daily' | 'weekly' | 'monthly' | 'yearly';
  category?: string;
}

// Methods:
// getIncomeStatement(filters): IncomeStatement
// getBalanceSheet(asOfDate): BalanceSheet
// getOutstandingReceivables(filters): Receivable[]
// getExpenseBreakdown(filters): ExpenseBreakdown
// getPatientLedger(patientId): LedgerEntry[]
```

---

## Excel Import/Export

### Export

Uses ExcelJS to generate `.xlsx` with proper formatting:

| Export | Sheet(s) | Key Columns |
|--------|----------|-------------|
| Patient List | "Patients" | ID, Name, Phone, Email, City, Registered Date |
| Appointments | "Appointments" | Date, Patient, Treatment, Status, Notes |
| Invoices | "Invoices" + "Invoice Items" | Invoice#, Patient, Date, Total, Status |
| Transactions | "Transactions" | Date, Type, Category, Patient, Amount, Method, Ref# |
| Income Statement | "P&L" | Period, Income, Expenses, Net Profit |
| Patient Ledger | "Ledger" | Date, Description, Debit, Credit, Balance |

Formatting: Currency as `₹ #,##0.00`, dates as `DD-MMM-YYYY`, auto-fit column widths.

### Import

Supported for **patients** and **transactions**.

1. User selects `.xlsx` file via Electron's file dialog
2. App reads headers and shows **column mapping UI** (map Excel columns → DB fields)
3. Validation preview: valid rows (green), invalid rows (red with error)
4. User confirms → insert in a DB transaction
5. Summary: "Imported 45 patients. 3 rows skipped."

---

## UI/UX Design

### Layout

```
┌─────────────────────────────────────────────────┐
│  [Logo]   Clinic Central                        │
├──────────┬──────────────────────────────────────┤
│          │  Breadcrumb: Patients > John Doe      │
│ Dashboard│──────────────────────────────────────│
│          │                                       │
│ Patients │   [Main Content Area]                 │
│          │                                       │
│Treatments│   - Tables with search/filter         │
│          │   - Forms in modal drawers            │
│ Appoint- │   - Detail views                     │
│  ments   │                                       │
│          │                                       │
│ Finance  │                                       │
│  ├ Trans.│                                       │
│  ├ Invoices                                      │
│  ├ Expenses                                      │
│  └ Reports                                       │
│          │                                       │
│ Settings │                                       │
├──────────┴──────────────────────────────────────┤
│  Status bar: DB size | Last backup | Sync status│
└─────────────────────────────────────────────────┘
```

### Key UI Patterns

**Patient List (Address Book):**
- Antd Table with columns: Avatar (initials), Name, Phone, Last Visit, Balance
- Real-time search by name or phone
- Click row → PatientDetailPage
- Floating "+" button → PatientFormModal (right-side Drawer)

**Patient Detail Page:**
- Header: Name, phone, age
- Summary cards: Next Appointment, Total Paid, Outstanding Balance
- Tabs: Appointments, Invoices, Ledger

**Treatment Card View:**
- Grid of cards grouped by treatment tree
- Each card: name, estimated cost, duration
- Toggle: card grid ↔ indented tree view

**Appointment Views:**
- List view (default) + Calendar view toggle
- Form: Patient search + TreatmentTreeSelect + datetime picker + notes
- Color-coded status: Scheduled (blue), Confirmed (green), Completed (gray), Cancelled (red)

**Invoice Page:**
- Form: select patient, add line items from treatments, discount, tax
- Print-ready layout with clinic branding
- Auto-generated invoice number (per year)

**Financial Reports:**
- Date range selector with presets (Today, This Week, This Month, This Quarter, This Year, Custom)
- Tabs: Income Statement, Balance Sheet, Receivables, Expenses
- Chart on top + detail table below
- Click chart segments to drill down

### Theme

- Primary: Teal/Cyan (`#0891b2`)
- Background: Light gray (`#f5f5f5`)
- Sidebar: Dark (`#1e293b`)
- Typography: System font stack
- Currency: ₹ with Indian comma formatting (₹1,00,000)

---

## IPC Architecture Pattern

Every database operation follows:

**Main process (handler):**
```typescript
// electron/ipc/patients.ipc.ts
ipcMain.handle('patients:list', async (_, filters) => patientService.list(filters));
ipcMain.handle('patients:getById', async (_, id) => patientService.getById(id));
ipcMain.handle('patients:create', async (_, data) => patientService.create(data));
ipcMain.handle('patients:update', async (_, id, data) => patientService.update(id, data));
ipcMain.handle('patients:delete', async (_, id) => patientService.softDelete(id));
```

**Renderer process (API wrapper):**
```typescript
// src/api/patients.api.ts
export const patientsApi = {
  list: (filters) => window.electronAPI.invoke('patients:list', filters),
  getById: (id) => window.electronAPI.invoke('patients:getById', id),
  create: (data) => window.electronAPI.invoke('patients:create', data),
  update: (id, data) => window.electronAPI.invoke('patients:update', id, data),
  delete: (id) => window.electronAPI.invoke('patients:delete', id),
};
```

**Preload (bridge):**
```typescript
// electron/preload.ts
contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
});
```

---

## Project Structure

```
clinic-central/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── electron-builder.yml
├── electron/
│   ├── main.ts
│   ├── preload.ts
│   ├── ipc/
│   │   ├── patients.ipc.ts
│   │   ├── treatments.ipc.ts
│   │   ├── appointments.ipc.ts
│   │   ├── finance.ipc.ts
│   │   ├── reports.ipc.ts
│   │   ├── settings.ipc.ts
│   │   ├── excel.ipc.ts
│   │   └── google-calendar.ipc.ts
│   ├── database/
│   │   ├── connection.ts
│   │   ├── schema.ts
│   │   ├── migrations/
│   │   │   └── 001_initial.sql
│   │   ├── migrate.ts
│   │   └── seed.ts
│   ├── services/
│   │   ├── patient.service.ts
│   │   ├── treatment.service.ts
│   │   ├── appointment.service.ts
│   │   ├── invoice.service.ts
│   │   ├── transaction.service.ts
│   │   ├── report.service.ts
│   │   ├── excel.service.ts
│   │   ├── google-calendar.service.ts
│   │   ├── backup.service.ts
│   │   └── treatment-tree-parser.ts
│   └── utils/
│       ├── currency.ts
│       └── date.ts
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── api/
│   │   ├── patients.api.ts
│   │   ├── treatments.api.ts
│   │   ├── appointments.api.ts
│   │   ├── finance.api.ts
│   │   └── settings.api.ts
│   ├── stores/
│   │   ├── patient.store.ts
│   │   ├── treatment.store.ts
│   │   ├── appointment.store.ts
│   │   ├── finance.store.ts
│   │   └── ui.store.ts
│   ├── types/
│   │   ├── patient.types.ts
│   │   ├── treatment.types.ts
│   │   ├── appointment.types.ts
│   │   ├── finance.types.ts
│   │   └── common.types.ts
│   ├── components/
│   │   ├── Layout/
│   │   │   ├── AppShell.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Header.tsx
│   │   ├── DataTable/
│   │   │   └── DataTable.tsx
│   │   ├── TreatmentTree/
│   │   │   └── TreatmentTreeSelect.tsx
│   │   ├── CurrencyInput/
│   │   │   └── CurrencyInput.tsx
│   │   └── common/
│   │       ├── ConfirmModal.tsx
│   │       ├── SearchInput.tsx
│   │       └── StatusBadge.tsx
│   ├── pages/
│   │   ├── Dashboard/
│   │   │   └── DashboardPage.tsx
│   │   ├── Patients/
│   │   │   ├── PatientListPage.tsx
│   │   │   ├── PatientDetailPage.tsx
│   │   │   └── PatientFormModal.tsx
│   │   ├── Treatments/
│   │   │   ├── TreatmentListPage.tsx
│   │   │   ├── TreatmentTreePage.tsx
│   │   │   └── TreatmentFormModal.tsx
│   │   ├── Appointments/
│   │   │   ├── AppointmentListPage.tsx
│   │   │   ├── AppointmentCalendarPage.tsx
│   │   │   └── AppointmentFormModal.tsx
│   │   ├── Finance/
│   │   │   ├── TransactionListPage.tsx
│   │   │   ├── InvoicePage.tsx
│   │   │   ├── InvoiceFormPage.tsx
│   │   │   ├── ExpensePage.tsx
│   │   │   └── ReportsPage.tsx
│   │   └── Settings/
│   │       └── SettingsPage.tsx
│   ├── hooks/
│   │   ├── usePatients.ts
│   │   ├── useTreatments.ts
│   │   ├── useAppointments.ts
│   │   └── useFinance.ts
│   └── styles/
│       ├── theme.ts
│       └── global.css
├── data/
│   └── treatments/
│       └── default-treatments.txt
├── resources/
│   ├── icon.ico
│   ├── icon.png
│   └── installer-banner.bmp
└── tests/
    ├── services/
    └── components/
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)

- Initialize project with Vite + React + TypeScript
- Add Electron with main.ts, preload.ts, Vite integration
- Set up better-sqlite3 connection and migration runner
- Run 001_initial.sql to create all tables
- Implement AppShell layout with sidebar navigation (React Router)
- Implement Settings page (clinic name, address, etc.)
- Set up IPC infrastructure
- Configure electron-builder for Windows .exe installer

### Phase 2: Patient Management (Week 3-4)

- patient.service.ts: CRUD with pagination and search
- patients.ipc.ts: IPC handlers
- PatientListPage: Address book table with search, sort, pagination
- PatientFormModal: Create/edit with Zod + antd Form validation
- PatientDetailPage: Profile with summary cards (next appointment, balance)
- Excel export/import for patients

### Phase 3: Treatment Management (Week 5-6)

- treatment-tree-parser.ts: Parser for treatment definition text files
- Settings UI to import treatment file (file picker → parse → preview → confirm)
- treatment.service.ts: CRUD with tree queries
- TreatmentListPage: Card view grouped by tree
- TreatmentTreePage: Interactive tree view
- TreatmentFormModal: Create/edit with parent selection
- TreatmentTreeSelect reusable component

### Phase 4: Appointment Management (Week 7-8)

- appointment.service.ts: CRUD with overlap detection
- AppointmentListPage: Table with status filters and date range
- AppointmentFormModal: Patient search + TreatmentTreeSelect + datetime picker
- AppointmentCalendarPage: Monthly/weekly calendar view
- Status workflow: scheduled → confirmed → in_progress → completed

### Phase 5: Google Calendar Sync (Week 9)

- Google Cloud Console OAuth client setup
- google-calendar.service.ts: Auth flow, token storage, CRUD
- sync_queue table and background sync processor
- Settings page: Connect/disconnect, calendar selection
- Sync indicators in appointment list

### Phase 6: Finance — Transactions & Invoices (Week 10-12)

- invoice.service.ts: Create from appointments, line items
- InvoiceFormPage: Line item editor with treatment lookup, discount, tax
- Invoice number auto-generation (per year)
- InvoicePage: View/print with clinic branding
- PDF generation for invoices
- transaction.service.ts: Payments against invoices, expenses
- TransactionListPage: Filterable by type/date/patient
- ExpensePage: Entry with category picker
- Advance payment handling
- Excel export for transactions and invoices

### Phase 7: Financial Reports (Week 13-14)

- report.service.ts: SQL aggregation queries
- ReportsPage: Date range selector, patient filter, granularity toggle
- Income Statement tab: chart + table
- Balance Sheet tab
- Outstanding Receivables tab with aging analysis
- Expense breakdown tab with category pie chart
- Drill-down navigation (yearly → monthly → daily → transaction)
- Excel export for all reports

### Phase 8: Dashboard & Polish (Week 15-16)

- DashboardPage: Summary cards, quick actions, today's schedule
- Backup/restore feature (copy .db file)
- Keyboard shortcuts (Ctrl+N, Ctrl+F, etc.)
- System tray with appointment notifications
- Data validation audit
- Final testing, bug fixes, installer testing

---

## Indian Localization

- Currency: INR (₹) with Indian formatting (₹1,00,000.00)
- Date: DD-MM-YYYY in UI, ISO 8601 in database
- Phone: 10-digit Indian mobile number
- GST: Optional GSTIN in settings; invoices show CGST + SGST if configured
- UTF-8 throughout for multilingual patient names (Hindi, Kannada, etc.)

---

## Backup Strategy

- **Manual:** "Backup Now" in Settings → file dialog → copies .db with timestamp (e.g., `clinic-central-backup-2026-03-15-1430.db`)
- **Auto:** On startup, if last backup > 1 day old, auto-backup to configured path
- **Restore:** Pick a .db file → validate tables → replace current database
