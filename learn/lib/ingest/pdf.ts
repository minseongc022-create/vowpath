export async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdfParse = (await import("pdf-parse")).default;
  const result = await pdfParse(buffer);
  return (result.text ?? "").replace(/\s+/g, " ").trim();
}

export function isPdfFile(name: string, mime?: string): boolean {
  return (
    mime === "application/pdf" ||
    name.toLowerCase().endsWith(".pdf")
  );
}
