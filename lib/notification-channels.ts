/**
 * Operational notification priority (shop + customer flows).
 *
 * 1. SMS — primary: new requests, customer YES/NO, owner 1=approve / 2=reject, customer confirmed/declined.
 * 2. Email — secondary backup for desk review; never blocks SMS; failures are logged only.
 * 3. Jobber — after shop approves; for calendar/dispatch review, not real-time alerts.
 */
export const NOTIFICATION_CHANNEL_PRIORITY = [
  "sms",
  "email",
  "jobber",
] as const;

/** Appended to owner alert emails so shops know SMS is the action channel. */
export const OWNER_EMAIL_BACKUP_NOTE =
  "Backup copy — you should have received the main alert by SMS (reply 1 = Approve, 2 = Reject).";
