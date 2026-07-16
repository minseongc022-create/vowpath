/** Prefix outbound SMS during practice mode so test numbers are obvious. */
export function withPracticeSmsPrefix(body: string, practiceMode: boolean): string {
  if (!practiceMode) return body;
  if (/Effiroad \[TEST\]:/i.test(body)) return body;
  return `Effiroad [TEST]: ${body.replace(/^Effiroad:\s*/, "")}`;
}
