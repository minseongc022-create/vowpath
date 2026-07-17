import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveQuizProvider, isQuizComplete } from "../../lib/forwarding-quiz.ts";
import { formatQuizAnswerRecap, getQuizPathSummary } from "../../lib/forwarding-quiz-summary.ts";

const sampleSummary = {
  att: {
    headline: "AT&T",
    body: "body",
    method: "method",
    whatYouNeed: ["phone"],
    timeLabel: "5m",
  },
  effiroad_main: {
    headline: "Dedicated",
    body: "body",
    method: "method",
    whatYouNeed: ["google"],
    timeLabel: "10m",
  },
};

test("resolveQuizProvider for AT&T overflow path", () => {
  const answers = {
    customerLine: "shop_cell",
    cellCarrier: "att",
    voipSystem: null,
    setupGoal: "overflow",
  };
  assert.equal(resolveQuizProvider(answers), "att");
  assert.equal(isQuizComplete(answers), true);
});

test("formatQuizAnswerRecap joins carrier and goal", () => {
  const recap = formatQuizAnswerRecap({
    customerLine: "shop_cell",
    cellCarrier: "verizon",
    voipSystem: null,
    setupGoal: "overflow",
  });
  assert.match(recap ?? "", /Verizon/);
  assert.match(recap ?? "", /Miss-call forwarding/);
});

test("getQuizPathSummary falls back to dedicated", () => {
  const s = getQuizPathSummary("effiroad_main", sampleSummary);
  assert.equal(s.headline, "Dedicated");
});
