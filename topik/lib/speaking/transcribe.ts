import { getLearnOpenAiKey, getTopikWhisperModel } from "@/topik/lib/openai-config";

export async function transcribeKoreanSpeech(buffer: Buffer, filename: string): Promise<string> {
  const apiKey = getLearnOpenAiKey();
  if (!apiKey) throw new Error("OPENAI_API_KEY_MISSING");

  const form = new FormData();
  form.append(
    "file",
    new Blob([new Uint8Array(buffer)], { type: "audio/webm" }),
    filename,
  );
  form.append("model", getTopikWhisperModel());
  form.append("language", "ko");
  form.append("response_format", "json");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error("OPENAI_INVALID_KEY");
    throw new Error(`WHISPER_FAILED_${res.status}`);
  }

  const data = (await res.json()) as { text?: string };
  return data.text?.trim() ?? "";
}
