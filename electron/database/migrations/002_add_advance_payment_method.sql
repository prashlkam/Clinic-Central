-- Add 'advance' to the payment_method CHECK constraint on transactions table.
-- Required for settling invoices from patient advance balance.

PRAGMA foreign_keys=off;

CREATE TABLE transactions_new (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    type                TEXT NOT NULL
                        CHECK(type IN ('income','expense','advance','refund')),
    category            TEXT,
    patient_id          INTEGER REFERENCES patients(id),
    invoice_id          INTEGER REFERENCES invoices(id),
    appointment_id      INTEGER REFERENCES appointments(id),
    amount_paise        INTEGER NOT NULL,
    payment_method      TEXT DEFAULT 'cash'
                        CHECK(payment_method IN ('cash','upi','card','bank_transfer','cheque','advance')),
    transaction_date    TEXT NOT NULL,
    reference_number    TEXT,
    notes               TEXT,
    created_at          TEXT DEFAULT (datetime('now'))
);

INSERT INTO transactions_new SELECT * FROM transactions;

DROP TABLE transactions;

ALTER TABLE transactions_new RENAME TO transactions;

CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_patient ON transactions(patient_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_invoice ON transactions(invoice_id);

PRAGMA foreign_keys=on;
