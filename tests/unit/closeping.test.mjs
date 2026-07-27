import { CLOSEPING_PRODUCT, isClosePingJob, parseClosePingCsv, stageLabel } from "../../lib/closeping/csv-import.ts";

import assert from "node:assert/strict";

assert.equal(isClosePingJob({ productSource: CLOSEPING_PRODUCT }), true);
assert.equal(isClosePingJob({ productSource: "effiroad" }), false);

const csv = `name,phone,description,amount
Jane Smith,5551234567,Roof repair,8500
Bob Jones,5559876543,HVAC install,12000`;

const rows = parseClosePingCsv(csv);
assert.equal(rows.length, 2);
assert.equal(rows[0].customerName, "Jane Smith");
assert.equal(rows[0].amountCents, 850000);
assert.equal(stageLabel("chasing"), "Chasing");

console.log("closeping.test.mjs OK");
