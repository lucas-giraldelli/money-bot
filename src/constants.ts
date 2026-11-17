// Own-phone messages can reach the linked device minutes late; duplicates are blocked by processed_messages
export const MSG_MAX_AGE_MS = 10 * 60_000;
export const REPLY_JITTER_MIN_MS = 200;
export const REPLY_JITTER_MAX_MS = 700;
export const FUZZY_THRESHOLD = 0.78;
export const RECONNECT_BASE_MS = 3_000;
export const RECONNECT_MAX_MS = 5 * 60_000;
export const LOGGED_OUT_REMINDER_MS = 60 * 60_000;
