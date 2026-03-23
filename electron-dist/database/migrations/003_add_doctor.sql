-- Doctor (clinic owner) profile and authentication
CREATE TABLE IF NOT EXISTS doctor (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    name                  TEXT NOT NULL,
    email                 TEXT NOT NULL,
    phone                 TEXT,
    specialization        TEXT,
    qualification         TEXT,
    registration_number   TEXT,
    photo                 TEXT,
    bio                   TEXT,
    experience_years      INTEGER,
    consultation_fee_paise INTEGER DEFAULT 0,
    working_hours_start   TEXT DEFAULT '09:00',
    working_hours_end     TEXT DEFAULT '18:00',
    days_off              TEXT DEFAULT '',
    password_hash         TEXT NOT NULL,
    created_at            TEXT DEFAULT (datetime('now')),
    updated_at            TEXT DEFAULT (datetime('now'))
);
