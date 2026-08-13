import { learnOpenAiJsonCompletion } from "@/learn/lib/openai/json";
import { isLearnOpenAiReady } from "@/learn/lib/openai-config";
import { getSpeakingScenario } from "@/topik/lib/speaking/prompts";
import { detectVietnameseErrors } from "@/topik/lib/speaking/vietnamese-errors";
import type { SpeakingEvaluation, SpeakingScenarioId } from "@/topik/types";

type AiSpeakingJson = {
  pronunciationScore?: number;
  grammarScore?: number;
  fluencyScore?: number;
  overallScore?: number;
  feedbackVi?: string;
  improvedAnswerKo?: string;
};

function demoEvaluation(
  scenarioId: SpeakingScenarioId,
  transcript: string,
): SpeakingEvaluation {
  const scenario = getSpeakingScenario(scenarioId);
  const len = transcript.replace(/\s/g, "").length;
  const hasContent = len >= 10;
  const vietnameseErrors = detectVietnameseErrors(transcript);
  const errorCount = vietnameseErrors.filter((e) => e.detected).length;

  const base = hasContent ? Math.max(40, 75 - errorCount * 8) : 15;

  return {
    scenarioId,
    transcript,
    pronunciationScore: Math.max(0, base - (errorCount > 2 ? 10 : 0)),
    grammarScore: hasContent ? base : 10,
    fluencyScore: hasContent ? Math.min(85, base + 5) : 10,
    overallScore: base,
    vietnameseErrors,
    feedbackVi: hasContent
      ? `Bạn đã trả lời ${len} ký tự. Khi bật OPENAI_API_KEY, AI sẽ chấm chi tiết theo tiêu chí TOPIK IBT với lỗi phát âm đặc thù người Việt.`
      : "Hãy nói hoặc nhập câu trả lời dài hơn (ít nhất 2–3 câu).",
    improvedAnswerKo: scenario?.sampleAnswerKo ?? "",
    source: "demo",
  };
}

export async function evaluateSpeaking(
  scenarioId: SpeakingScenarioId,
  transcript: string,
): Promise<SpeakingEvaluation> {
  const scenario = getSpeakingScenario(scenarioId);
  if (!scenario) throw new Error("INVALID_SCENARIO");

  const trimmed = transcript.trim();
  const vietnameseErrors = detectVietnameseErrors(trimmed);

  if (!isLearnOpenAiReady() || !trimmed) {
    return demoEvaluation(scenarioId, trimmed);
  }

  const errorHints = vietnameseErrors
    .filter((e) => e.detected)
    .map((e) => e.explanationVi)
    .join("; ");

  try {
    const result = await learnOpenAiJsonCompletion<AiSpeakingJson>({
      system: `You are a TOPIK IBT speaking examiner specializing in Vietnamese learners of Korean.
Grade the student's spoken response (transcribed text). Scores 0-100 each for pronunciation, grammar, fluency, overall.

Vietnamese-specific issues to check:
- Final consonant (batchim) dropping
- ㄱ/ㅋ/ㄲ aspiration confusion
- Flat intonation
- 이/가 vs 은/는 particle errors
- Missing honorifics (-요/-습니다)

Provide ALL feedback in Vietnamese (feedbackVi).
improvedAnswerKo: a natural high-scoring sample answer in Korean for this scenario.

JSON only:
{
  "pronunciationScore": number,
  "grammarScore": number,
  "fluencyScore": number,
  "overallScore": number,
  "feedbackVi": "string",
  "improvedAnswerKo": "string"
}`,
      user: `Scenario (Korean): ${scenario.promptKo}
Scenario (Vietnamese): ${scenario.promptVi}
Sample answer: ${scenario.sampleAnswerKo}
Student transcript:
${trimmed}
Heuristic Vietnamese error flags: ${errorHints || "none"}`,
      temperature: 0.2,
      timeoutMs: 45_000,
    });

    return {
      scenarioId,
      transcript: trimmed,
      pronunciationScore: clamp(result.pronunciationScore ?? 0),
      grammarScore: clamp(result.grammarScore ?? 0),
      fluencyScore: clamp(result.fluencyScore ?? 0),
      overallScore: clamp(result.overallScore ?? 0),
      vietnameseErrors,
      feedbackVi: result.feedbackVi ?? "",
      improvedAnswerKo: result.improvedAnswerKo ?? scenario.sampleAnswerKo,
      source: "openai",
    };
  } catch {
    return demoEvaluation(scenarioId, trimmed);
  }
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}
