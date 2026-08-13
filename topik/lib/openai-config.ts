import {
  getLearnOpenAiKey,
  getLearnOpenAiModelEconomy,
  isLearnOpenAiReady,
} from "@/learn/lib/openai-config";

export { getLearnOpenAiKey, isLearnOpenAiReady };

/** TOPIK writing needs stronger reasoning — default gpt-4o */
export function getTopikWritingModel(): string {
  return (
    process.env.TOPIK_OPENAI_MODEL_WRITING?.trim() ||
    process.env.LEARN_OPENAI_MODEL?.trim() ||
    "gpt-4o"
  );
}

/** Speaking evaluation — fast + cheap default */
export function getTopikSpeakingModel(): string {
  return (
    process.env.TOPIK_OPENAI_MODEL_SPEAKING?.trim() ||
    getLearnOpenAiModelEconomy()
  );
}

export function getTopikWhisperModel(): string {
  return process.env.OPENAI_WHISPER_MODEL?.trim() || "whisper-1";
}

export function getTopikOpenAiStatus(): {
  ready: boolean;
  writingModel: string;
  speakingModel: string;
  whisperModel: string;
} {
  return {
    ready: isLearnOpenAiReady(),
    writingModel: getTopikWritingModel(),
    speakingModel: getTopikSpeakingModel(),
    whisperModel: getTopikWhisperModel(),
  };
}
