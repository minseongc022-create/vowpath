import { getPublicAppUrl } from "./app-url";
import { sendEmail, isEmailConfigured } from "./send-email";
import { alertCritical } from "./owner-alerts";

function platformSignupAlertEmail(): string {
  return (
    process.env.PLATFORM_SIGNUP_ALERT_EMAIL?.trim() ||
    process.env.OWNER_ALERT_EMAIL?.trim() ||
    "helloeffiroad@gmail.com"
  );
}

/** Email + SMS when a new shop completes signup (platform owner — Min). */
export async function notifyPlatformOwnerNewSignup(params: {
  shopName: string;
  email: string;
  vertical?: string;
  userId: string;
}): Promise<void> {
  const dashboard = getPublicAppUrl()
    ? `${getPublicAppUrl()}/dashboard/settings`
    : "/dashboard/settings";

  const smsLine = `✅ New signup: ${params.shopName} (${params.email})`;
  const emailSubject = `New Effiroad signup — ${params.shopName}`;
  const emailText =
    `New shop signed up on Effiroad\n\n` +
    `Shop: ${params.shopName}\n` +
    `Email: ${params.email}\n` +
    (params.vertical ? `Vertical: ${params.vertical}\n` : "") +
    `User ID: ${params.userId}\n\n` +
    `Dashboard: ${dashboard}\n`;

  try {
    await alertCritical("new_signup", smsLine);
  } catch (e) {
    console.warn("[platform-owner-notify] sms alert", e);
  }

  if (!isEmailConfigured()) {
    console.info(`[platform-owner-notify] ${emailSubject}\n${emailText}`);
    return;
  }

  const result = await sendEmail({
    to: platformSignupAlertEmail(),
    subject: emailSubject,
    text: emailText,
    devLogLabel: "platform_new_signup",
  });

  if (!result.ok) {
    console.warn("[platform-owner-notify] email failed", result.error);
  }
}
