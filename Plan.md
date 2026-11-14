# Clinic Central — Build Plan

A desktop clinic management application for a **small dental clinic with a single main doctor**, in India.

This revision of the plan changes three things from the original:

1. **Feature parity target.** The feature set is aligned with a commercial dental practice-management
   product (the reference used is Clinicia's dental edition — see the note below), scaled down to one doctor.
2. **Completely local.** No cloud, no server, no account, no internet needed. The app is started by
   double-clicking a desktop shortcut.
3. **JSON default data.** The default treatment list (and the other default libraries) ship as JSON files.

> **Note on the reference product.** The request named "Clinasia Dental Clinic Management software". No
> product with that exact spelling could be found; the closest match, and the one this plan is mapped
> against, is **Clinicia** (clinicia.com, dental edition). If a different product was meant, the mapping
> table below is the place to adjust.

Status legend: ✅ built and verified · 🔶 adapted for a local single-doctor clinic · ⛔ deliberately not included

---

## 1. Feature Mapping (reference product → Clinic Central)

| Reference feature | Clinic Central | Status |
|---|---|---|
| EMR: clinical notes, chief complaint, intraoral findings, radiograph observations, diagnosis | Clinical Notes tab on the patient record, one note per visit | ✅ |
| Vitals, medical history, allergies | Vitals on each note; blood group, allergies, conditions, current medication on the patient; allergy banner on the record and on the prescription form | ✅ |
| Dental chart | FDI tooth chart (permanent + milk teeth), condition / surfaces / notes per tooth | ✅ |
| Treatment plans with stage-wise procedures | Treatment Plans tab: stages, teeth, per-procedure status, progress, printable estimate, invoice straight from the plan | ✅ |
| Chronological treatment history | Patient record tabs: notes, plans, prescriptions, lab orders, appointments, invoices, ledger | ✅ |
| Attachments: X-rays, intraoral photos, case sheets | Files & X-rays tab; files copied into the local data folder, image preview, open in OS viewer | ✅ |
| Prescriptions: drug library, dosage templates, reusable patterns, letterhead | Drug library (JSON-seeded), prescription templates, repeat prescription, letterhead print | ✅ |
| Digital consent forms | Consent templates (JSON-seeded) with placeholders; on-screen signature capture or print for pen signature; signed consents are locked | ✅ |
| Dental lab module: orders, shade, trial dates, tracking, reports | Lab Orders (per patient and clinic-wide): lab, work type, material, teeth, shade, trial/due/received dates, status, overdue flags, lab charge → expense | ✅ |
| Appointment scheduling, easy rescheduling | Appointment list plus week / month calendar view (click a free slot to book, click an appointment to edit), status workflow, `.ics` export, Google Calendar invite and WhatsApp confirmation / reminder from the dialog shown after saving (see the WhatsApp and Google Calendar rows below) | ✅ |
| Token / queue system for walk-ins | Today's Queue: check-in issues the next token, walk-in registration, call-in / complete | ✅ |
| Billing: branded invoices, partial payments, dues, receipts | Invoices with letterhead print (invoice / receipt), partial payments, advances, dues (already present; print rebuilt) | ✅ |
| Membership plans with bill-level discounts | Membership plans; assign to a patient with expiry; one-click discount on the invoice | ✅ |
| Expense management | Expenses with categories (already present); lab charges booked from lab orders | ✅ |
| Inventory: stock, inward/outward, low-stock alerts | Inventory with stock-in / stock-out / count adjustment, movement history, reorder level, expiry, dashboard low-stock list | 🔶 no purchase orders or department requests (single small clinic) |
| Reports: billing summaries, procedure-wise, new vs returning, outstanding, collections, Excel export | P&L, balance sheet, receivables, expenses (already present) + collections by payment mode / by day, procedure-wise billing, new vs returning patients, appointment outcomes | ✅ |
| Recall / follow-up reminders, birthday greetings | Dashboard lists: follow-ups due with no appointment booked, birthdays today, lab work due | 🔶 shown to the clinic; nothing is sent automatically |
| WhatsApp / SMS / e-mail sending | WhatsApp appointment messages only: a booking confirmation or reminder is written from an editable template (Settings) and opened in WhatsApp for the patient's number through a click-to-chat link; the user presses Send | 🔶 click-to-send, one appointment at a time; nothing is sent automatically or on a schedule (that needs the WhatsApp Business API). SMS and e-mail: print or "Save as PDF" and share manually |
| Online booking widget, Google/Facebook review requests | — | ⛔ online-only |
| Multi-user roles, multi-doctor, multi-branch | Single password-protected doctor login | ⛔ out of scope for a single-doctor clinic |
| Cloud sync, mobile apps, cloud backup | Local SQLite; automatic daily local backup; manual backup to any folder / USB drive | 🔶 |
| Google Calendar sync (from the original plan) | Two-way sync removed from the plan. An appointment can be opened in Google Calendar with the patient's e-mail as a guest, so Google sends the invitation when the user saves the event there; `.ics` export and Outlook web link also available | 🔶 one-way and manual, no Google sign-in in the app |

---

## 2. Tech Stack (as built)

| Layer | Technology | Notes |
|---|---|---|
| Desktop shell | Electron 41 | Main process owns the database and the file system |
| UI | React 19 + TypeScript, Ant Design 6, Recharts | Loaded from `dist/` on disk (`file://`), never from a server |
| Database | SQLite via better-sqlite3 (WAL) | One file in the user's data folder |
| Excel | ExcelJS | Import / export |
| Build | Vite 8, tsc, electron-builder | |
| Printing | Chromium print dialog | Also gives "Save as PDF"; no PDF library needed |

Drizzle ORM, googleapis, @react-pdf/renderer and Zod schemas from the original plan are **not used**:
services use plain prepared statements, printing uses the browser engine, and Google sync is dropped.

---

## 3. Local-Only Operation

- **No network use.** The production UI is built with a Content-Security-Policy that only allows the app's
  own files (`default-src 'self'`). External links (a web calendar, a WhatsApp click-to-chat link) open in
  the system browser, never inside the app window. Those two links are the only way appointment details
  leave the computer, and only when the user clicks them.
- **Data location** (same whether started from the shortcut, `npm run launch`, or an installed package):

  | OS | Folder |
  |---|---|
  | Linux | `~/.config/clinic-central/` |
  | Windows | `%APPDATA%\clinic-central\` |
  | macOS | `~/Library/Application Support/clinic-central/` |

  Contents: `clinic-central.db` (all records), `patient-files/<patientId>/` (attachments), `backups/`.
- **Single instance.** A second double-click focuses the running window.
- **Launching.**
  - `npm run desktop-shortcut` builds the app and creates a "Clinic Central" shortcut on the desktop
    (plus an applications-menu entry on Linux). The shortcut runs the bundled Electron against this folder.
  - `npm run dist:linux` / `npm run dist:win` produce an installable package (AppImage + deb / NSIS installer
    with a desktop shortcut) for copying to another computer.
- **Backups.**
  - Automatic: once a day at startup, a database snapshot to `backups/` (or a chosen folder such as a USB
    drive); the newest 14 are kept. Never blocks startup.
  - Before any schema upgrade of an existing database, a `before-upgrade` snapshot is written.
  - Manual: database + the patient-files folder to any folder.
  - Restore: validates the backup, keeps a `before-restore` snapshot, swaps the file with the connection
    closed, then runs migrations so older backups are upgraded.
- **Login.** One doctor account; password stored as a salted scrypt hash (older SHA-256 hashes are upgraded
  on the next login).

---

## 4. Default Data in JSON

All bundled defaults live under `data/` and are loaded **once per database** on first run (and again after a
factory reset). A flag in `settings` records that each set was loaded, so anything the doctor deletes is
never silently re-added.

| File | Loaded into |
|---|---|
| `data/treatments/default-treatments.json` | `treatment_trees`, `treatments` |
| `data/medicines/default-medicines.json` | `medicines` (drug library) |
| `data/consents/default-consent-templates.json` | `consent_templates` |

### Treatment list format

```json
{
  "version": 1,
  "currency": "INR",
  "categories": [
    {
      "name": "Endodontics",
      "description": "Root canal and pulp therapy",
      "treatments": [
        {
          "name": "Root Canal Treatment", "cost": 8000, "duration": 60,
          "children": [
            { "name": "Single Canal", "cost": 5000, "duration": 45 },
            { "name": "Multi Canal",  "cost": 8000, "duration": 60 }
          ]
        },
        { "name": "Pulpotomy", "cost": 3000, "duration": 30 }
      ]
    }
  ]
}
```

- `cost` is in rupees (stored as paise), `duration` in minutes (default 30). `children` nest to any depth.
- **Import** (Treatments page or Settings): validates the file and reports the exact problem if it is
  malformed; nothing is imported from an invalid file. Categories and treatments that already exist (same
  name under the same parent) are left untouched, so importing twice never duplicates.
- **Export** writes the current list in the same format (round-trips with the default file).
- **Load Defaults** re-adds any missing default treatments.
- The old indented `.txt` format can still be imported; it is converted to the JSON structure internally.
  The old `default-treatments.txt` has been replaced by the JSON file.

---

## 5. Database

All money is stored as **integers in paise**. Dates are ISO strings. Migrations are numbered SQL files in
`electron/database/migrations/`, each applied inside a transaction.

| Migration | Contents |
|---|---|
| `001_initial.sql` | patients, treatment_trees, treatments, appointments, invoices, invoice_items, transactions, expense_categories, settings, sync_queue (unused), schema_migrations |
| `002_add_advance_payment_method.sql` | `advance` payment method |
| `003_add_doctor.sql` | doctor profile + login |
| `004_clinical_modules.sql` | everything below |

### Added by migration 004

| Table / change | Purpose |
|---|---|
| `patients` + `blood_group, allergies, medical_conditions, current_medications, referred_by, membership_plan_id, membership_expiry` | Medical alert data and membership |
| `appointments` + `token_number, checked_in_at, is_walk_in` | Queue / tokens |
| `clinical_notes` | Visit notes: complaint, findings, radiographs, diagnosis, treatment done, advice, vitals, follow-up date |
| `tooth_chart` | Current condition per tooth (unique per patient + FDI number) |
| `treatment_plans`, `treatment_plan_items` | Staged plans; items link to the invoice that billed them |
| `medicines`, `prescriptions`, `prescription_items`, `prescription_templates` | Drug library, prescriptions, reusable patterns |
| `labs`, `lab_orders` | Lab master and work orders; link to the expense transaction |
| `consent_templates`, `patient_consents` | Templates and per-patient consents with signature image |
| `patient_files` | Attachment metadata (files themselves are on disk) |
| `inventory_items`, `inventory_movements` | Stock and its audit trail |
| `membership_plans` | Discount programmes |

---

## 6. Architecture

```
Renderer (React, file://)  ──invoke──▶  preload (contextBridge)  ──▶  ipcMain handlers  ──▶  services  ──▶  SQLite / disk
```

- `contextIsolation: true`, `nodeIntegration: false`. The renderer never touches Node or the file system.
- New modules use one convention: every function of a service is exposed as the IPC channel
  `<namespace>:<function>` (`electron/ipc/clinic.ipc.ts`), and the renderer calls it through a small proxy
  (`src/api/clinic.api.ts`), e.g. `plansApi.save(x)` → `plans:save`.
- File attachments: source paths only ever come from the native file picker in the main process.
- Generic UI building blocks keep the new screens small: `FormModal` (form from field definitions),
  `CrudTable` (list + add/edit/delete), `PrintPreview` (letterhead + print), `RxItemsEditor`, `SignaturePad`,
  `DentalChart`.

### Project structure (new and changed parts)

```
data/
  treatments/default-treatments.json
  medicines/default-medicines.json
  consents/default-consent-templates.json
electron/
  main.ts                         single instance, local-only window, auto-backup, seeding
  database/
    helpers.ts                    insert/update helpers, local-date helpers, settings
    seed.ts                       first-run JSON seeding
    migrations/004_clinical_modules.sql
  ipc/clinic.ipc.ts               registers all new services
  services/
    treatment-json.ts             JSON import / export / validation (+ legacy .txt conversion)
    clinical.service.ts           clinical notes, tooth chart, recall list
    plan.service.ts               treatment plans → invoices
    prescription.service.ts       drug library, prescriptions, templates
    lab.service.ts                labs, lab orders, lab expense
    consent.service.ts            templates, consents, signing
    file.service.ts               patient attachments
    inventory.service.ts          stock and movements
    membership.service.ts         plans, active membership lookup
    analytics.service.ts          procedure / patient / collection reports, dashboard extras
    backup.service.ts             manual + automatic backup, safe restore, factory reset
src/
  api/clinic.api.ts
  components/Crud/                FormModal, CrudTable, RxItemsEditor, SignaturePad
  components/Print/PrintPreview.tsx
  components/DentalChart/DentalChart.tsx
  pages/Patients/tabs/            ClinicalNotes, TreatmentPlans, Prescriptions, Consents, Files
  pages/Queue/QueuePage.tsx
  pages/Lab/                      LabOrders (shared), LabOrdersPage
  pages/Inventory/InventoryPage.tsx
  pages/Libraries/LibrariesPage.tsx   drug library, Rx templates, consent templates, labs, memberships
scripts/
  create-desktop-shortcut.js      desktop shortcut (Linux / Windows / macOS)
  make-icon.js                    generates resources/icon.png and icon.ico
  smoke-test.js                   backend test, runs inside Electron on a throw-away data folder
```

---

## 7. Implementation Phases

Phases 1–8 of the original plan (foundation, patients, treatments, appointments, finance, reports,
dashboard, backup) were already implemented, except Google Calendar sync (now dropped) and the calendar
view (now built, Phase 16) and system tray / keyboard shortcuts (still open, see Phase 17).

| Phase | Scope | Status |
|---|---|---|
| 9. Local launch | Fixed data folder, single instance, built-UI check, local-only CSP, external links to system browser, app icon, desktop shortcut script, electron-builder targets (AppImage / deb / NSIS with desktop shortcut) | ✅ shortcut verified on Linux; unpacked Linux package built and launched (finds its bundled JSON data and database driver). AppImage / deb / Windows installer files themselves not yet built |
| 10. JSON defaults | JSON treatment list, validation, import / export / load defaults, legacy `.txt` conversion, first-run seeding of treatments, medicines, consent templates | ✅ |
| 11. Clinical record | Patient medical fields, clinical notes with vitals and follow-up, dental chart, attachments | ✅ |
| 12. Treatment plans & prescriptions | Staged plans, estimate print, invoice from plan; drug library, prescriptions, templates, letterhead print | ✅ |
| 13. Lab, consents, inventory, memberships | Lab orders and lab expense, consent forms with signature, stock management, membership discounts | ✅ |
| 14. Reception & reports | Token queue and walk-ins, dashboard recall / lab / stock / birthday lists, collections, procedure-wise and patient reports, letterhead invoice print | ✅ |
| 15. Safety | Transactional migrations, pre-upgrade snapshot, automatic daily backup, safe restore, attachments in manual backup, scrypt password hashing | ✅ |
| 16. Calendar | Week and month calendar view of appointments | ✅ |
| 16a. Invites & WhatsApp | Google Calendar invite with the patient as guest; click-to-send WhatsApp booking confirmation and reminder; message templates and default country code in Settings | ✅ builds cleanly; not yet clicked through in the running app |
| 17. Open items | Excel export for the new reports; appointment overlap warning; keyboard shortcuts; build and test the Windows installer; automated UI tests | ☐ |

### Verification done

- `npm run test:smoke` — exercises every new service inside Electron against a temporary database:
  JSON seeding, duplicate-free re-import, export round-trip, invalid-file rejection, legacy `.txt`
  conversion, queue tokens, plans → invoice, prescriptions, lab orders and expense, consent signing rules,
  stock movements, attachments, analytics, password upgrade, backup / restore / factory reset.
- The built app was driven end to end in an isolated profile (first run, login, every new screen, invoice
  from a plan, print previews, print-to-PDF of a prescription) with no console errors.
- The desktop shortcut's exact command was launched from an unrelated working directory.

---

## 8. Indian Localization

- Currency: INR (₹) with Indian digit grouping; paise stored as integers.
- Dates: DD-MM-YYYY in the UI; "today" is the clinic's local day, not UTC.
- Prescription frequency in the familiar `1-0-1` style.
- Optional GSTIN on the letterhead; tax entered per invoice.
- UTF-8 throughout for names in Indian scripts.
