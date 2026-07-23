import test from "node:test";
import assert from "node:assert/strict";
import {
  isThinRetellVoiceId,
  pickNaturalReceptionistVoice,
  RETELL_FALLBACK_MALE_VOICE_ID,
} from "../../lib/retell-agent-settings.ts";

test("Brian is treated as thin / mosquito-like", () => {
  assert.equal(isThinRetellVoiceId("11labs-Brian"), true);
  assert.equal(isThinRetellVoiceId("11labs-Mark"), false);
});

test("pickNaturalReceptionistVoice ignores thin Brian env and current", () => {
  const voices = [
    {
      voice_id: "11labs-Brian",
      voice_name: "Brian",
      provider: "elevenlabs",
      accent: "American",
      gender: "male",
    },
    {
      voice_id: "11labs-Mark",
      voice_name: "Mark",
      provider: "elevenlabs",
      accent: "American",
      gender: "male",
    },
  ];
  const id = pickNaturalReceptionistVoice(voices, {
    explicitId: "11labs-Brian",
    currentVoiceId: "11labs-Brian",
  });
  assert.equal(id, "11labs-Mark");
});

test("Bill preference does not pick Billy", () => {
  const voices = [
    {
      voice_id: "11labs-Billy",
      voice_name: "Billy",
      provider: "elevenlabs",
      accent: "American",
      gender: "male",
    },
    {
      voice_id: "11labs-Mark",
      voice_name: "Mark",
      provider: "elevenlabs",
      accent: "American",
      gender: "male",
    },
  ];
  const id = pickNaturalReceptionistVoice(voices, {
    currentVoiceId: "11labs-Billy",
  });
  assert.equal(id, "11labs-Mark");
});
