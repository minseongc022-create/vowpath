export type EstimateChannel = "link" | "phone";

/** "link" channel: ask name + callback number by voice, then text a form link. */
export type EstimateLinkPhase = "ask_name" | "ask_phone" | "done";

/** "phone" channel: ask all 6 details by voice, then summarize and notify the shop. */
export type EstimatePhonePhase =
  | "ask_name"
  | "ask_phone"
  | "ask_address"
  | "ask_damage_type"
  | "ask_noticed_when"
  | "ask_preferred_time"
  | "done";

export type EstimatePhase = EstimateLinkPhase | EstimatePhonePhase;

export type EstimateAnswers = {
  name?: string;
  callbackPhone?: string;
  address?: string;
  damageType?: string;
  noticedWhen?: string;
  preferredTime?: string;
};

export type EstimateState = {
  callSid: string;
  userId: string;
  from: string;
  to: string;
  channel: EstimateChannel;
  phase: EstimatePhase;
  answers: EstimateAnswers;
  afterHours?: boolean;
  /** Failed-gather retry counter for the current question. */
  attempt: number;
  createdAt: string;
  updatedAt: string;
};
