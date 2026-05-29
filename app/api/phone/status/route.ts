import { NextResponse } from "next/server";
import {
  getTwilioDefaultUserId,
  getTwilioWebhookBaseUrl,
  isTwilioConfigured,
} from "@/lib/twilio-config";

export async function GET() {
  return NextResponse.json({
    twilioConfigured: isTwilioConfigured(),
    phoneNumber: process.env.TWILIO_PHONE_NUMBER?.trim() ?? null,
    webhookBase: getTwilioWebhookBaseUrl(),
    defaultUserSet: Boolean(getTwilioDefaultUserId()),
  });
}
