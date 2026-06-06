/** Simple inbound spam / robocall filter before owner alerts. */

const SPAM_PATTERNS = [
  /warranty/i,
  /solar panel/i,
  /google listing/i,
  /seo service/i,
  /merchant services/i,
  /credit card processing/i,
  /press 0/i,
  /press 1 to opt/i,
];

export function looksLikeSpamCall(transcript: string, symptom: string): boolean {
  const text = `${transcript} ${symptom}`;
  return SPAM_PATTERNS.some((p) => p.test(text));
}
