export type TechMember = {
  id: string;
  name: string;
  phone: string;
  active: boolean;
  /** When true, only offered P1 / emergency jobs if p1Only flag set on settings */
  senior?: boolean;
};

export type TechDispatchSettings = {
  enabled: boolean;
  /** Round-robin: one tech at a time, sequential offers */
  responseTimeoutMinutes: number;
  /** Only assign after owner approves the booking */
  assignOnApprove: boolean;
  /** Limit offers to senior techs for P1 jobs */
  p1SeniorOnly: boolean;
  techs: TechMember[];
  lastAssignedTechId: string | null;
};

export const DEFAULT_TECH_DISPATCH_SETTINGS: TechDispatchSettings = {
  enabled: true,
  responseTimeoutMinutes: 10,
  assignOnApprove: true,
  p1SeniorOnly: true,
  techs: [],
  lastAssignedTechId: null,
};

export type TechAssignmentStatus =
  | "offering"
  | "accepted"
  | "declined_all"
  | "unassigned";

export type TechOfferOutcome = "pending" | "accepted" | "declined" | "expired";

export type TechOfferRecord = {
  techId: string;
  techName: string;
  outcome: TechOfferOutcome;
  offeredAt: string;
};

export type TechAssignment = {
  bookingId: string;
  userId: string;
  status: TechAssignmentStatus;
  assignedTechId: string | null;
  assignedTechName: string | null;
  currentTechId: string | null;
  offers: TechOfferRecord[];
  customerName: string;
  issue: string;
  window: string;
  priority: string;
  updatedAt: string;
};
