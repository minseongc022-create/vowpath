export type MoveType = "full" | "semi" | "cargo" | "office";
export type ElevatorType = "yes" | "no" | "ladder";
export type JobStatus =
  | "quote"
  | "confirmed"
  | "dispatched"
  | "loading"
  | "moving"
  | "done"
  | "cancelled";

export interface Address {
  line: string;
  floor?: number;
  elevator: ElevatorType;
  parkingNote?: string;
}

export interface QuoteLineItem {
  id: string;
  label: string;
  amount: number;
}

export interface Crew {
  id: string;
  name: string;
  leaderPhone: string;
  truckSize: "1t" | "2.5t" | "5t";
  memberCount: number;
  active: boolean;
}

export interface Job {
  id: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  moveDate: string;
  moveType: MoveType;
  pyung: number;
  distanceKm: number;
  from: Address;
  to: Address;
  lineItems: QuoteLineItem[];
  total: number;
  deposit: number;
  status: JobStatus;
  crewId?: string;
  notes?: string;
  statusHistory: { status: JobStatus; at: string; note?: string }[];
}

export interface CompanyProfile {
  name: string;
  phone: string;
  depositRate: number;
}
