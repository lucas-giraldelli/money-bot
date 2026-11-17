import db from "./connection";

// Returns false when the message was already handled
export function claimMessage(id: string): boolean {
  db.prepare("DELETE FROM processed_messages WHERE created_at < datetime('now', '-2 days')").run();
  return db.prepare("INSERT OR IGNORE INTO processed_messages (id) VALUES (?)").run(id).changes === 1;
}
