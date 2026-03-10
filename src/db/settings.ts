import db from "./connection";

export function getSetting(key: string): string | null {
  const row = db
    .prepare("SELECT value FROM settings WHERE key = ?")
    .get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(
    key,
    value,
  );
}

export function getIncome(): number {
  const val = getSetting("income");
  return val ? parseFloat(val) : 0;
}

export function setIncome(value: number): void {
  setSetting("income", String(value));
}
