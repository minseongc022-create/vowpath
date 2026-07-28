/** Prefix outbound SMS during practice mode so test numbers are obvious. */
export function withPracticeSmsPrefix(body: string, practiceMode: boolean): string {
  if (!practiceMode) return body;
  if (/Effiroad \[TEST\]:/i.test(body) || /^TEST:/i.test(body)) return body;
  // Short prefix when a URL is present — long "Effiroad [TEST]: " splits portal links across SMS.
  if (/https?:\/\//i.test(body)) {
    return `TEST: ${body}`;
  }
  return `Effiroad [TEST]: ${body.replace(/^Effiroad:\s*/, "")}`;
}
