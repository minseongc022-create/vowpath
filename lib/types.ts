export type JobPriority = "P1" | "P2" | "P3";

export type JobCard = {
  id: string;
  jobberJobId?: string;
  priority: JobPriority;
  symptom: string;
  customerName: string;
  address: string;
  arrivalWindow: string;
  status: "confirmed" | "pending_approval" | "sms_sent";
  createdAt: string;
};

export type AnswerWindow = {
  id: string;
  label: string;
  value: string;
};

export type ShopState = {
  scheduleWindows: AnswerWindow[];
  answerScheduleActive: boolean;
  jobberConnected: boolean;
  /** Settings wizard: user confirmed Jobber step after OAuth connect */
  jobberSetupConfirmed?: boolean;
  forwardingDone: boolean;
  onboardingComplete: boolean;
};
