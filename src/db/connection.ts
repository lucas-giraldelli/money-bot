import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { config } from "../config";

const dbDir = path.dirname(config.dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(config.dbPath);
db.pragma("journal_mode = WAL");

export default db;
