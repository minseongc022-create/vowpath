import { applyPriorityGuardrails } from "../lib/priority-guardrails.ts";

const cases = [
  {
    name: "Sarah no cool 86F kids",
    notes:
      "No cool, indoor 86F, two kids at home, wants tonight",
    ai: { priority: "P3", symptom: "No cool", dispatchNotes: "", jobberPasteBlock: "" },
    expect: "P1",
  },
  {
    name: "maintenance only",
    notes: "Annual filter change quote, not urgent, next week",
    ai: { priority: "P2", symptom: "Maintenance", dispatchNotes: "", jobberPasteBlock: "" },
    expect: "P3",
  },
  {
    name: "gas smell",
    notes: "Smell gas near furnace",
    ai: { priority: "P2", symptom: "Gas", dispatchNotes: "", jobberPasteBlock: "" },
    expect: "P1",
  },
  {
    name: "same day comfort",
    notes: "AC weak airflow, prefer today afternoon",
    ai: { priority: "P3", symptom: "Weak airflow", dispatchNotes: "", jobberPasteBlock: "" },
    expect: "P2",
  },
];

let failed = 0;
for (const c of cases) {
  const out = applyPriorityGuardrails(c.notes, c.ai);
  const ok = out.priority === c.expect;
  console.log(ok ? "OK" : "FAIL", c.name, "->", out.priority, "expected", c.expect);
  if (!ok) failed++;
}

if (failed > 0) {
  process.exit(1);
}
console.log("All guardrail checks passed.");
