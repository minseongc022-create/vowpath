import { learnOpenAiJsonCompletion } from "@/learn/lib/openai/json";
import { isLearnOpenAiReady, getTopikWritingModel } from "@/topik/lib/openai-config";
import { WRITING_PROMPTS } from "@/topik/lib/writing/prompts";
import type {
  WritingCorrectionRequest,
  WritingCorrectionResult,
  SentenceCorrection,
  WritingTaskType,
} from "@/topik/types";

type AiWritingJson = {
  estimatedScore?: number;
  taskFulfillment?: number;
  structure?: number;
  languageUse?: number;
  overallFeedbackVi?: string;
  strengthsVi?: string[];
  improvementsVi?: string[];
  sentenceCorrections?: {
    original?: string;
    corrected?: string;
    explanationVi?: string;
  }[];
  modelAnswer?: string;
  modelAnswerVi?: string;
};

function demoCorrection(req: WritingCorrectionRequest): WritingCorrectionResult {
  const meta = WRITING_PROMPTS[req.taskType];
  const len = req.answer.replace(/\s/g, "").length;
  const hasContent = len > 5;
  const base = hasContent ? Math.min(meta.maxScore * 0.65, meta.maxScore - 5) : 2;

  return {
    taskType: req.taskType,
    estimatedScore: Math.round(base),
    maxScore: meta.maxScore,
    taskFulfillment: Math.round(base * 0.35),
    structure: Math.round(base * 0.3),
    languageUse: Math.round(base * 0.35),
    overallFeedbackVi: hasContent
      ? "Bài làm có nội dung cơ bản. Khi kết nối OpenAI API, hệ thống sẽ chấm chi tiết theo tiêu chí TOPIK thật với giải thích từng câu bằng tiếng Việt."
      : "Bài làm quá ngắn. Hãy viết thêm nội dung theo yêu cầu đề bài.",
    strengthsVi: hasContent
      ? ["Có cố gắng trả lời đề bài", "Cấu trúc câu cơ bản có thể hiểu được"]
      : [],
    improvementsVi: hasContent
      ? [
          "Sử dụng thêm liên từ nối (-고, -지만, -아/어서)",
          "Kiểm tra lại trợ từ (이/가, 을/를)",
          "Mở rộng ý với ví dụ cụ thể",
        ]
      : ["Viết đầy đủ theo yêu cầu đề bài", "Sử dụng cấu trúc câu hoàn chỉnh"],
    sentenceCorrections: hasContent
      ? [
          {
            original: req.answer.split(/[.!?。]/)[0] ?? req.answer.slice(0, 40),
            corrected: "(Chấm chi tiết khi bật OPENAI_API_KEY)",
            explanationVi: "Kết nối API để nhận sửa từng câu với giải thích tiếng Việt.",
          },
        ]
      : [],
    modelAnswer: undefined,
    modelAnswerVi: undefined,
    source: "demo",
  };
}

export async function correctWriting(
  req: WritingCorrectionRequest,
): Promise<WritingCorrectionResult> {
  const meta = WRITING_PROMPTS[req.taskType];

  if (!isLearnOpenAiReady()) {
    return demoCorrection(req);
  }

  const rubricByTask: Record<WritingTaskType, string> = {
    "51": "Task 51: Fill blanks with ONE word each. Score: word choice accuracy, grammar fit.",
    "52": "Task 52: Write complete sentences for each blank. Score: grammar, coherence with context.",
    "53": "Task 53: Short essay 200-300 chars. Score: task fulfillment (10), structure (10), language (10).",
    "54": "Task 54: Essay 600-700 chars. Score: task fulfillment (12), structure (12), language (26).",
  };

  try {
    const result = await learnOpenAiJsonCompletion<AiWritingJson>({
      system: `You are a certified TOPIK writing examiner. Grade the student's Korean writing strictly by official TOPIK criteria.
Task: ${rubricByTask[req.taskType]}
Max score: ${meta.maxScore}

Rules:
- Grade ONLY what the student wrote — do not invent content
- Provide ALL feedback in Vietnamese (explanationVi, overallFeedbackVi, strengthsVi, improvementsVi)
- sentenceCorrections: fix each problematic sentence with Vietnamese explanation
- modelAnswer: provide a high-scoring sample answer in Korean
- modelAnswerVi: Vietnamese translation/summary of model answer
- Be encouraging but honest — Vietnamese learners appreciate direct feedback
- JSON only:
{
  "estimatedScore": number,
  "taskFulfillment": number,
  "structure": number,
  "languageUse": number,
  "overallFeedbackVi": "string",
  "strengthsVi": ["string"],
  "improvementsVi": ["string"],
  "sentenceCorrections": [{"original":"", "corrected":"", "explanationVi":""}],
  "modelAnswer": "string",
  "modelAnswerVi": "string"
}`,
      user: `Task type: ${req.taskType}
Prompt: ${req.prompt}
Student answer:
${req.answer}
${req.wordLimit ? `Word/char limit: ${req.wordLimit}` : ""}`,
      temperature: 0.2,
      timeoutMs: 60_000,
      model: getTopikWritingModel(),
    });

    const sentenceCorrections: SentenceCorrection[] = (result.sentenceCorrections ?? [])
      .filter((s) => s.original && s.corrected)
      .map((s) => ({
        original: s.original!,
        corrected: s.corrected!,
        explanationVi: s.explanationVi ?? "",
      }));

    return {
      taskType: req.taskType,
      estimatedScore: Math.min(result.estimatedScore ?? 0, meta.maxScore),
      maxScore: meta.maxScore,
      taskFulfillment: result.taskFulfillment ?? 0,
      structure: result.structure ?? 0,
      languageUse: result.languageUse ?? 0,
      overallFeedbackVi: result.overallFeedbackVi ?? "",
      strengthsVi: result.strengthsVi ?? [],
      improvementsVi: result.improvementsVi ?? [],
      sentenceCorrections,
      modelAnswer: result.modelAnswer,
      modelAnswerVi: result.modelAnswerVi,
      source: "openai",
    };
  } catch {
    return demoCorrection(req);
  }
}
