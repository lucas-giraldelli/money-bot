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

// Seed initial settings
const seedSetting = db.prepare(
  "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)",
);
seedSetting.run("income", "0");
seedSetting.run("timezone", process.env.TIMEZONE ?? "America/Manaus");

// Seed initial bills if table is empty
const count = (db.prepare("SELECT COUNT(*) as c FROM bills").get() as { c: number }).c;
if (count === 0) {
  const insert = db.prepare("INSERT INTO bills (name, amount) VALUES (?, ?)");
  const initialBills = [
    "Nubank Thyci",
    "Carro",
    "IPTU 1/10",
    "Nubank PJ",
    "TIM",
    "Internet",
    "Luz",
    "Unimed",
    "Financiamento Caixa",
    "Cartão Inter",
    "Mercado Pago",
    "Malai",
  ];
  for (const name of initialBills) {
    insert.run(name, 0.01);
  }
}
