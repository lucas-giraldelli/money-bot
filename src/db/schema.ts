import db from "./connection";

db.exec(`
  CREATE TABLE IF NOT EXISTS bills (
    id     INTEGER PRIMARY KEY AUTOINCREMENT,
    name   TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    active INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS bill_payments (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_id  INTEGER NOT NULL REFERENCES bills(id),
    month    TEXT NOT NULL,
    paid_at  TEXT,
    paid_by  TEXT
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT NOT NULL,
    amount      REAL NOT NULL,
    month       TEXT NOT NULL,
    added_by    TEXT,
    created_at  TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Migrations for existing DBs
try { db.exec("ALTER TABLE bills ADD COLUMN installment_current INTEGER DEFAULT NULL"); } catch {}
try { db.exec("ALTER TABLE bills ADD COLUMN installment_total INTEGER DEFAULT NULL"); } catch {}
try { db.exec("ALTER TABLE bills ADD COLUMN frequency TEXT NOT NULL DEFAULT 'monthly'"); } catch {}
try { db.exec("ALTER TABLE bills ADD COLUMN weekday INTEGER DEFAULT NULL"); } catch {}
try { db.exec("ALTER TABLE bills ADD COLUMN paid_through TEXT DEFAULT NULL"); } catch {}

// Weekly bills: one row per !pago, covering every due date in (prev_paid_through, paid_through]
db.exec(`
  CREATE TABLE IF NOT EXISTS weekly_payments (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_id           INTEGER NOT NULL REFERENCES bills(id),
    amount            REAL NOT NULL,
    weeks             INTEGER NOT NULL,
    prev_paid_through TEXT NOT NULL,
    paid_through      TEXT NOT NULL,
    month             TEXT NOT NULL,
    paid_at           TEXT DEFAULT CURRENT_TIMESTAMP,
    paid_by           TEXT
  );
`);

// Seed initial settings
const seedSetting = db.prepare(
  "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)",
);
seedSetting.run("income", "0");
seedSetting.run("timezone", process.env.TIMEZONE ?? "America/Manaus");

