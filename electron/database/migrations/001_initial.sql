-- Patients
CREATE TABLE IF NOT EXISTS patients (
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
    city            TEXT DEFAULT '',
    state           TEXT DEFAULT '',
    pincode         TEXT,
    medical_history TEXT,
    notes           TEXT,
    is_active       INTEGER DEFAULT 1,
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone_primary);

-- Treatment Trees
CREATE TABLE IF NOT EXISTS treatment_trees (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
);

-- Treatments
CREATE TABLE IF NOT EXISTS treatments (
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
CREATE INDEX IF NOT EXISTS idx_treatments_tree ON treatments(tree_id);
CREATE INDEX IF NOT EXISTS idx_treatments_parent ON treatments(parent_id);

-- Appointments
CREATE TABLE IF NOT EXISTS appointments (
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
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
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
CREATE INDEX IF NOT EXISTS idx_invoices_patient ON invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);

-- Invoice Items
CREATE TABLE IF NOT EXISTS invoice_items (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id       INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    treatment_id     INTEGER REFERENCES treatments(id),
    description      TEXT NOT NULL,
    quantity         INTEGER DEFAULT 1,
    unit_price_paise INTEGER NOT NULL,
    total_paise      INTEGER NOT NULL,
    sort_order       INTEGER DEFAULT 0
);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
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
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_patient ON transactions(patient_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_invoice ON transactions(invoice_id);

-- Expense Categories
CREATE TABLE IF NOT EXISTS expense_categories (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT NOT NULL UNIQUE,
    parent_id INTEGER REFERENCES expense_categories(id)
);

-- Settings
CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Sync Queue
CREATE TABLE IF NOT EXISTS sync_queue (
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

-- Schema Migrations
CREATE TABLE IF NOT EXISTS schema_migrations (
    version    INTEGER PRIMARY KEY,
    applied_at TEXT DEFAULT (datetime('now'))
);

-- Seed default expense categories
INSERT OR IGNORE INTO expense_categories (name) VALUES ('Rent');
INSERT OR IGNORE INTO expense_categories (name) VALUES ('Salaries');
INSERT OR IGNORE INTO expense_categories (name) VALUES ('Dental Supplies');
INSERT OR IGNORE INTO expense_categories (name) VALUES ('Equipment');
INSERT OR IGNORE INTO expense_categories (name) VALUES ('Utilities');
INSERT OR IGNORE INTO expense_categories (name) VALUES ('Lab Charges');
INSERT OR IGNORE INTO expense_categories (name) VALUES ('Miscellaneous');

-- Seed default settings
INSERT OR IGNORE INTO settings (key, value) VALUES ('clinic_name', 'My Dental Clinic');
INSERT OR IGNORE INTO settings (key, value) VALUES ('clinic_address', '');
INSERT OR IGNORE INTO settings (key, value) VALUES ('clinic_phone', '');
INSERT OR IGNORE INTO settings (key, value) VALUES ('clinic_email', '');
INSERT OR IGNORE INTO settings (key, value) VALUES ('gstin', '');
INSERT OR IGNORE INTO settings (key, value) VALUES ('invoice_prefix', 'INV');
INSERT OR IGNORE INTO settings (key, value) VALUES ('invoice_counter', '0');
INSERT OR IGNORE INTO settings (key, value) VALUES ('backup_path', '');
