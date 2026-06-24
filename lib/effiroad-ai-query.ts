import type { AiAdminBillingCard, AiAdminPreview } from "./ai-admin/types";

export type EffiroadAiAction = {
  label: string;
  href?: string;
  kind?: "approve" | "decline";
  bookingId?: string;
};

export type EffiroadAiResponse = {
  answer: string;
  rows?: { label: string; value: string }[];
  customer?: { name: string; fields: { label: string; value: string }[] };
  bookings?: import("./recent-bookings").RecentBooking[];
  items?: {
    id: string;
    title: string;
    subtitle?: string;
    href?: string;
    status?: string;
  }[];
  adminPreview?: AiAdminPreview;
  billingCard?: AiAdminBillingCard;
  actions: EffiroadAiAction[];
  suggestions?: string[];
};

/** @deprecated Use composeEmptyResult — kept for client fallback only */
export const UNKNOWN_AI_RESPONSE =
  "I couldn't find an exact match, but I can show your shop snapshot or pending items.";
