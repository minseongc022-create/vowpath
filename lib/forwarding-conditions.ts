import {
  FORWARDING_AFTER_HOURS_NOTE,
  FORWARDING_OVERFLOW_SUMMARY,
  FORWARDING_IPHONE_WARNING,
} from "./forwarding-guides-en";

export type ForwardingConditionRow = {
  condition: string;
  yourMainLine: string;
  effiroad: string;
};

export type ForwardingConditionMatrix = {
  scenarioLabel: string;
  rows: ForwardingConditionRow[];
  afterHoursNote: string;
};

export function getForwardingConditionMatrix(): ForwardingConditionMatrix {
  return {
    scenarioLabel: "No-answer overflow (what you are setting up)",
    rows: [
      {
        condition: "You answer in time",
        yourMainLine: "Normal conversation",
        effiroad: "Does not intercept",
      },
      {
        condition: "No answer (~20 sec ring)",
        yourMainLine: "Stops ringing",
        effiroad: "Receives the call",
      },
      {
        condition: "Line busy (on another call)",
        yourMainLine: "You stay on the active call",
        effiroad:
          "Verizon *71 forwards busy calls; AT&T/T-Mobile **61* is no-answer only (busy needs **67*)",
      },
      {
        condition: "After hours (schedule closed)",
        yourMainLine: "May not ring your team",
        effiroad: "Answers per Answer Hours in Settings",
      },
      {
        condition: "iPhone Settings → Call Forwarding ON",
        yourMainLine: "Never rings you",
        effiroad: "Gets every call — wrong setup",
      },
    ],
    afterHoursNote: `${FORWARDING_AFTER_HOURS_NOTE} ${FORWARDING_IPHONE_WARNING}`,
  };
}

export const FORWARDING_DO_NOT_USE = {
  title: "Removed from Effiroad — do not use",
  body: "Unconditional forward (*21 / *72 / iPhone Call Forwarding), RingCentral/OpenPhone generic guides, and separate busy-only codes — these fail or break your workflow. Use only the provider you selected above.",
};

export const FORWARDING_ALL_CALL_STATES = getForwardingConditionMatrix().rows;
