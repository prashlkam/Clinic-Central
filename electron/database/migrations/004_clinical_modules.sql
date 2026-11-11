-- Clinical, lab, inventory and membership modules (single-doctor, fully local).

-- Membership plans (discount programmes)
CREATE TABLE IF NOT EXISTS membership_plans (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    name             TEXT NOT NULL UNIQUE,
    description      TEXT,
    discount_percent REAL NOT NULL DEFAULT 0,
    price_paise      INTEGER NOT NULL DEFAULT 0,
    validity_months  INTEGER NOT NULL DEFAULT 12,
    is_active        INTEGER DEFAULT 1,
    created_at       TEXT DEFAULT (datetime('now'))
);

-- Extra patient details
ALTER TABLE patients ADD COLUMN blood_group TEXT;
ALTER TABLE patients ADD COLUMN allergies TEXT;
ALTER TABLE patients ADD COLUMN medical_conditions TEXT;
ALTER TABLE patients ADD COLUMN current_medications TEXT;
ALTER TABLE patients ADD COLUMN referred_by TEXT;
ALTER TABLE patients ADD COLUMN membership_plan_id INTEGER REFERENCES membership_plans(id);
ALTER TABLE patients ADD COLUMN membership_expiry TEXT;

-- Token / queue support for walk-ins
ALTER TABLE appointments ADD COLUMN token_number INTEGER;
ALTER TABLE appointments ADD COLUMN checked_in_at TEXT;
ALTER TABLE appointments ADD COLUMN is_walk_in INTEGER DEFAULT 0;

-- Clinical notes (one per visit)
CREATE TABLE IF NOT EXISTS clinical_notes (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id       INTEGER NOT NULL REFERENCES patients(id),
    appointment_id   INTEGER REFERENCES appointments(id),
    visit_date       TEXT NOT NULL,
    chief_complaint  TEXT,
    findings         TEXT,
    radiograph_notes TEXT,
    diagnosis        TEXT,
    treatment_done   TEXT,
    advice           TEXT,
    bp               TEXT,
    pulse            TEXT,
    temperature      TEXT,
    weight           TEXT,
    follow_up_date   TEXT,
    created_at       TEXT DEFAULT (datetime('now')),
    updated_at       TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_patient ON clinical_notes(patient_id, visit_date);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_followup ON clinical_notes(follow_up_date);

-- Dental chart: one current condition per tooth (FDI numbering)
CREATE TABLE IF NOT EXISTS tooth_chart (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id   INTEGER NOT NULL REFERENCES patients(id),
    tooth_number TEXT NOT NULL,
    condition    TEXT NOT NULL,
    surfaces     TEXT,
    notes        TEXT,
    updated_at   TEXT DEFAULT (datetime('now')),
    UNIQUE(patient_id, tooth_number)
);

-- Treatment plans with stage-wise procedures
CREATE TABLE IF NOT EXISTS treatment_plans (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id     INTEGER NOT NULL REFERENCES patients(id),
    title          TEXT NOT NULL,
    status         TEXT DEFAULT 'proposed'
                   CHECK(status IN ('proposed','accepted','in_progress','completed','cancelled')),
    notes          TEXT,
    discount_paise INTEGER DEFAULT 0,
    created_at     TEXT DEFAULT (datetime('now')),
    updated_at     TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_patient ON treatment_plans(patient_id);

CREATE TABLE IF NOT EXISTS treatment_plan_items (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id          INTEGER NOT NULL REFERENCES treatment_plans(id) ON DELETE CASCADE,
    stage            INTEGER DEFAULT 1,
    treatment_id     INTEGER REFERENCES treatments(id),
    description      TEXT NOT NULL,
    teeth            TEXT,
    quantity         INTEGER DEFAULT 1,
    unit_price_paise INTEGER NOT NULL DEFAULT 0,
    total_paise      INTEGER NOT NULL DEFAULT 0,
    status           TEXT DEFAULT 'planned'
                     CHECK(status IN ('planned','in_progress','completed','cancelled')),
    completed_date   TEXT,
    invoice_id       INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
    sort_order       INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_plan_items_plan ON treatment_plan_items(plan_id);

-- Drug library and prescriptions
CREATE TABLE IF NOT EXISTS medicines (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT NOT NULL,
    form         TEXT,
    strength     TEXT,
    frequency    TEXT,
    duration     TEXT,
    instructions TEXT,
    is_active    INTEGER DEFAULT 1,
    created_at   TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_medicines_name ON medicines(name);

CREATE TABLE IF NOT EXISTS prescriptions (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id        INTEGER NOT NULL REFERENCES patients(id),
    prescription_date TEXT NOT NULL,
    diagnosis         TEXT,
    advice            TEXT,
    follow_up_date    TEXT,
    created_at        TEXT DEFAULT (datetime('now')),
    updated_at        TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id, prescription_date);

CREATE TABLE IF NOT EXISTS prescription_items (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    prescription_id INTEGER NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    medicine_name   TEXT NOT NULL,
    strength        TEXT,
    frequency       TEXT,
    duration        TEXT,
    instructions    TEXT,
    sort_order      INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS prescription_templates (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL UNIQUE,
    diagnosis  TEXT,
    advice     TEXT,
    items_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now'))
);

-- Dental labs and lab orders
CREATE TABLE IF NOT EXISTS labs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    contact    TEXT,
    phone      TEXT,
    address    TEXT,
    is_active  INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS lab_orders (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id             INTEGER NOT NULL REFERENCES patients(id),
    lab_id                 INTEGER REFERENCES labs(id),
    work_type              TEXT NOT NULL,
    material               TEXT,
    teeth                  TEXT,
    shade                  TEXT,
    instructions           TEXT,
    order_date             TEXT NOT NULL,
    due_date               TEXT,
    trial_date             TEXT,
    received_date          TEXT,
    status                 TEXT DEFAULT 'ordered'
                           CHECK(status IN ('ordered','sent','trial','received','fitted','cancelled')),
    cost_paise             INTEGER DEFAULT 0,
    expense_transaction_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL,
    created_at             TEXT DEFAULT (datetime('now')),
    updated_at             TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_lab_orders_patient ON lab_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_status ON lab_orders(status);

-- Consent forms
CREATE TABLE IF NOT EXISTS consent_templates (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL UNIQUE,
    body       TEXT NOT NULL,
    is_active  INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS patient_consents (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id     INTEGER NOT NULL REFERENCES patients(id),
    template_id    INTEGER REFERENCES consent_templates(id) ON DELETE SET NULL,
    title          TEXT NOT NULL,
    procedure_name TEXT,
    body           TEXT NOT NULL,
    signed_by      TEXT,
    signature_data TEXT,
    signed_at      TEXT,
    created_at     TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_patient_consents_patient ON patient_consents(patient_id);

-- Patient attachments (X-rays, photos, reports) stored on local disk
CREATE TABLE IF NOT EXISTS patient_files (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id    INTEGER NOT NULL REFERENCES patients(id),
    category      TEXT DEFAULT 'other',
    original_name TEXT NOT NULL,
    stored_name   TEXT NOT NULL,
    mime_type     TEXT,
    size_bytes    INTEGER DEFAULT 0,
    notes         TEXT,
    created_at    TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_patient_files_patient ON patient_files(patient_id);

-- Inventory
CREATE TABLE IF NOT EXISTS inventory_items (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    category        TEXT,
    unit            TEXT DEFAULT 'pcs',
    quantity        REAL NOT NULL DEFAULT 0,
    reorder_level   REAL NOT NULL DEFAULT 0,
    unit_cost_paise INTEGER DEFAULT 0,
    supplier        TEXT,
    expiry_date     TEXT,
    is_active       INTEGER DEFAULT 1,
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS inventory_movements (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id       INTEGER NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    type          TEXT NOT NULL CHECK(type IN ('in','out','adjust')),
    quantity      REAL NOT NULL,
    movement_date TEXT NOT NULL,
    notes         TEXT,
    created_at    TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item ON inventory_movements(item_id);
