import { REPLY_JITTER_MIN_MS, REPLY_JITTER_MAX_MS } from "../constants";

export async function jitter(): Promise<void> {
  const delay =
    REPLY_JITTER_MIN_MS +
    Math.random() * (REPLY_JITTER_MAX_MS - REPLY_JITTER_MIN_MS);
  await new Promise((r) => setTimeout(r, delay));
}

export async function simulateTyping(
  sock: {
    sendPresenceUpdate: (
      type: "composing" | "paused",
      jid: string,
    ) => Promise<void>;
  },
  jid: string,
): Promise<void> {
  await sock.sendPresenceUpdate("composing", jid);
  await jitter();
  await sock.sendPresenceUpdate("paused", jid);
}
