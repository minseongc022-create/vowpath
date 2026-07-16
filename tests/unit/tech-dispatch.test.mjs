import assert from "node:assert/strict";
import test from "node:test";

/** Mirrors guard in startTechAssignmentForBooking — no duplicate SMS while pending. */
function shouldSkipNewTechOffer(assignment) {
  if (assignment?.status === "accepted") return true;
  const pending = assignment?.offers?.find((o) => o.outcome === "pending");
  return assignment?.status === "offering" && Boolean(pending);
}

test("tech dispatch: skip duplicate offer when one is pending", () => {
  const assignment = {
    status: "offering",
    offers: [{ techId: "t1", outcome: "pending" }],
  };
  assert.equal(shouldSkipNewTechOffer(assignment), true);
});

test("tech dispatch: allow next offer after decline", () => {
  const assignment = {
    status: "offering",
    offers: [{ techId: "t1", outcome: "declined" }],
  };
  assert.equal(shouldSkipNewTechOffer(assignment), false);
});

test("tech dispatch: skip when already accepted", () => {
  const assignment = {
    status: "accepted",
    offers: [{ techId: "t1", outcome: "accepted" }],
  };
  assert.equal(shouldSkipNewTechOffer(assignment), true);
});
