/** Dashboard / settings tool copy — US English. */



export const messagingSetupEn = {

  eyebrow: "Auth · Email & SMS",

  title: "Email & SMS verification",

  subtitle: "Signup and password-reset code delivery",

  emailLabel: "Email (Resend)",

  emailFromLabel: "From address",

  smsLabel: "SMS (Twilio)",

  smsFromLabel: "From number",

  yes: "Ready",

  no: "Not set",

  readyMessage: "Verification codes send by real email and SMS.",

  steps: [

    "Sign up at Resend.com → API key → add RESEND_API_KEY on Vercel",

    "Test: receive on your Resend signup email until domain is verified",

    "SMS: add TWILIO_ACCOUNT_SID, AUTH_TOKEN, PHONE_NUMBER",

    "Twilio Trial: SMS only to verified numbers until you upgrade",

    "Save env vars → Vercel redeploy → test signup",

  ],

};



export const phoneSetupEn = {

  eyebrow: "Phone · v3",

  title: "After-hours call intake",

  subtitle: "Calls to your Twilio number → voice intake → Job Card (optional CRM push)",

  twilioLabel: "Twilio",

  numberLabel: "Inbound number",

  userLabel: "Shop account",

  webhookLabel: "Webhook URL (public)",

  yes: "Ready",

  no: "Not set",

  hint: "Use Simulate call below if Trial limits block your test number.",

  simulateCall: "Simulate call",

  simulateCallOk: "Simulation complete. Check inbound calls.",

  krTrialNote:

    "Twilio Trial may require verified caller IDs. Production uses your provisioned US number.",

  costNote:

    "Effiroad has no auto-charge. Twilio bills voice/SMS; OpenAI bills Job Card generation when used.",

  ivrNote:

    "Live calls: guided intake for name, address, and loss details. Priority captured for your review.",

  stepsTitle: "Connection checklist",

  steps: [

    "Copy Twilio Account SID, Auth Token, and US (+1) number",

    "Add TWILIO_ACCOUNT_SID, AUTH_TOKEN, PHONE_NUMBER to env",

    "Run npm run tunnel → set TWILIO_WEBHOOK_BASE_URL to the https URL",

    "Restart dev server → Register webhook below (or paste Voice URL in Twilio console)",

    "Call your Twilio number to test",

  ],

  configureWebhook: "Register webhook",

  configureWebhookOk: "Twilio Voice webhook registered.",

  configureWebhookFail: "Webhook registration failed.",

  voiceWebhookPath: "/api/twilio/voice",

  restartHint: "Restart the dev server after changing environment variables.",

};



export const inboundCallsEn = {

  title: "Inbound calls",

  subtitle: "Job Cards from Twilio calls",

  loading: "Loading…",

  empty: "No calls yet. Place a test call to see records here.",

  unknownCustomer: "Unknown customer",

};



export const jobberConnectEn = {

  eyebrow: "Jobber",

  title: "Jobber connection",

  subtitle: "Connect to push approved requests to Jobber.",

  connectedSubtitle: "Connected: {account}",

  connectedAccountTitle: "Connected Jobber account",

  connectedCompanyLabel: "Company",

  connectedEmailLabel: "Signed in as",

  connectedPhoneLabel: "Shop phone",

  connectedIdLabel: "Account ID",

  connectedAtLabel: "Connected on",

  connectedPendingAccount:
    "OAuth connected — fetching your Jobber account details. Refresh if this stays empty.",

  badgeConnected: "Connected",

  badgeDisconnected: "Not connected",

  connect: "Connect Jobber",

  disconnect: "Disconnect",

  disconnecting: "Disconnecting…",

  notConfigured: "Add JOBBER_CLIENT_ID and JOBBER_CLIENT_SECRET to env. (See JOBBER_SETUP.md)",

  redirectSetupTitle: "Jobber Developer Center setup",

  redirectSetupBody: "Add this Callback URL to your Jobber app OAuth settings and save.",

  redirectSetupLink: "Open Jobber Developer Center",

  redirectSetupCopied: "Copied",

  redirectSetupCopy: "Copy URL",

  redirectSetupNote:
    "Callback URL must match EXACTLY (no trailing space, no www). Use https://effiroad.com/api/jobber/callback on the same Client ID as Vercel. Also register http://localhost:3000/api/jobber/callback for local dev.",

  redirectSetupClientId:
    "Effiroad uses Jobber Client ID: {clientId} — add the Callback URL to that app in Developer Center.",

  oauthErrorRedirectLocalhost:
    "Production cannot use a localhost callback. Set JOBBER_REDIRECT_URI=https://effiroad.com/api/jobber/callback in Vercel, and register that same URL in Jobber Developer Center.",

  oauthErrorRedirectMissing:
    "Missing OAuth callback URL. Set JOBBER_REDIRECT_URI or NEXT_PUBLIC_APP_URL, then redeploy.",

  oauthErrorNotConfigured:
    "Jobber is not configured yet. Add JOBBER_CLIENT_ID and JOBBER_CLIENT_SECRET in Vercel env.",

  oauthErrorGeneric:
    "Jobber connection failed. Confirm the Callback URL below is saved on the matching Client ID in Jobber Developer Center, then try Connect again.",

  settingsConnectedHint: "Approved and confirmed visits sync to your Jobber schedule automatically.",

  invoiceAccessOk: "Collected revenue: Jobber invoice access OK.",

  invoiceAccessReconnect:
    "Reconnect Jobber (Disconnect → Connect) to refresh invoice permissions for collected revenue.",

  invoiceAccessError: "Invoice access check failed. Try reconnecting Jobber.",

  settingsDisconnectedHint: "Connect with OAuth to sync requests and calendar events.",

  push: "Send to Jobber",

  pushing: "Sending to Jobber…",

  pushed: "Created in Jobber",

  pushError: "Jobber push failed.",

  openJobber: "Open in Jobber",

};



export const jobCardGeneratorEn = {

  eyebrow: "Available now",

  title: "Call notes → Job Card",

  subtitle:

    "Paste after-hours call notes to draft priority and a Jobber-ready summary. Review before syncing.",

  badge: "Owner approval mode",

  notesLabel: "Call notes / summary",

  notesPlaceholder:

    "e.g. Check engine light on, 123 Oak St Austin TX, Mike, 2019 Toyota Camry, wants visit tomorrow morning…",

  generate: "Generate Job Card",

  generating: "Generating…",

  errorGeneric: "Could not generate Job Card.",

  resultLabel: "AI draft — review before Jobber",

  fields: {

    customer: "Customer",

    phone: "Phone",

    address: "Address",

    window: "Appointment window",

    dispatch: "Dispatch notes",

    jobber: "Jobber paste block",

  },

  copy: "Copy Jobber notes",

  copied: "Copied",

  save: "Save as pending review",

  pushJobber: "Send to Jobber",

  pushingJobber: "Sending to Jobber…",

  pushedJobber: "Sent to Jobber",

  pushJobberFailed: "Jobber push failed. Try again shortly.",

};
