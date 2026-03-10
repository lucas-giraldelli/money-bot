const optional = (key: string, fallback: string): string =>
  process.env[key] ?? fallback;

export const config = {
  dbPath: optional("DB_PATH", "./data/money.db"),
  authDir: optional("AUTH_DIR", "./data/auth"),
  allowedNumbers: optional("ALLOWED_NUMBERS", ""),
  adminNumber: optional("ADMIN_NUMBER", ""),
  timezone: optional("TIMEZONE", "America/Manaus"),
};
