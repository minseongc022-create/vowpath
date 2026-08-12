import assert from "node:assert/strict";
import {
  chaseStageLabel,
  formatUsd,
  normalizePhone,
  parseCsv,
} from "../lib/format.ts";

assert.equal(formatUsd(850000), "$8,500");
assert.equal(normalizePhone("5551234567"), "+15551234567");
assert.equal(chaseStageLabel(0), "48h");

const rows = parseCsv(`name,phone,description,amount
Jane,5551234567,Roof,8500`);
assert.equal(rows.length, 1);
assert.equal(rows[0].amountCents, 850000);

console.log("closeping tests OK");
